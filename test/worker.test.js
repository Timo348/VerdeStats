const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fflate = require('fflate');
const analyzer = require('../public/analyzer');
const workerSource = fs.readFileSync(require.resolve('../public/worker.js'), 'utf8');
const row = { ts: '2024-01-01T12:00:00Z', ms_played: 60000, master_metadata_track_name: 'Song', master_metadata_album_artist_name: 'Artist', username: 'SECRET_ACCOUNT', ip_addr_decrypted: 'SECRET_IP' };

function worker() {
  const messages = [];
  const self = { postMessage(message) { messages.push(structuredClone(message)); } };
  const context = vm.createContext({ self, importScripts() {}, VerdeAnalyzer: analyzer, fflate, TextDecoder, Uint8Array, DataView, Error });
  vm.runInContext(workerSource, context);
  return { messages, async send(data) { await self.onmessage({ data }); return messages.filter(message => message.id === data.id); }, evaluate(expression) { return vm.runInContext(expression, context); } };
}
function jsonFile(name = 'history.json', rows = [row]) { return new File([JSON.stringify(rows)], name); }
function zipFile(entries) { const bytes = fflate.zipSync(Object.fromEntries(Object.entries(entries).map(([name, data]) => [name, fflate.strToU8(typeof data === 'string' ? data : JSON.stringify(data))]))); return new File([bytes], 'history.zip'); }

test('local worker imports JSON, returns automatic result and retains only whitelisted RAM fields', async () => {
  const local = worker();
  const messages = await local.send({ id: 1, type: 'import', files: [jsonFile()] });
  const result = messages.find(message => message.type === 'result').result;
  assert.equal(result.totals.streams, 1);
  assert.equal(result.fileCount, 1);
  assert.ok(messages.some(message => message.type === 'progress' && message.progress === 100));
  assert.doesNotMatch(JSON.stringify(messages), /SECRET/);
  assert.doesNotMatch(local.evaluate('JSON.stringify(history)'), /SECRET/);
  const filtered = await local.send({ id: 2, type: 'analyze', options: { minMs: 120000 } });
  assert.equal(filtered.find(message => message.type === 'result').result.totals.streams, 0);
  await local.send({ id: 3, type: 'clear' });
  assert.equal(local.evaluate('history.length'), 0);
});

test('nested ZIP directories are imported and overlapping exports are deduplicated', async () => {
  const local = worker();
  const messages = await local.send({ id: 1, type: 'import', files: [zipFile({ 'Spotify/Extended/part1.JSON': [row], 'Spotify/Extended/part2.json': [row], 'notes.txt': 'ignored' })] });
  const result = messages.find(message => message.type === 'result').result;
  assert.equal(result.totals.streams, 1);
  assert.equal(result.fileCount, 2);
});

test('ZIP traversal and absolute paths are rejected before decompression', async () => {
  for (const name of ['../history.json', '/history.json', 'C:/history.json', 'Spotify/../../history.json', 'Spotify\\..\\history.json']) {
    const local = worker();
    const messages = await local.send({ id: 1, type: 'import', files: [zipFile({ [name]: [row] })] });
    assert.ok(messages.some(message => message.type === 'error' && /path/i.test(message.error)), name);
    assert.equal(local.evaluate('history.length'), 0);
  }
});

test('expanded metadata limits reject ZIP bombs before invoking unzip', async () => {
  const bytes = fflate.zipSync({ 'history.json': fflate.strToU8(JSON.stringify([row])) });
  const view = new DataView(bytes.buffer);
  let central = -1;
  for (let i = 0; i <= bytes.length - 46; i++) if (view.getUint32(i, true) === 0x02014b50) { central = i; break; }
  assert.ok(central > 0);
  view.setUint32(central + 24, 512 * 1024 * 1024 + 1, true);
  const local = worker();
  const messages = await local.send({ id: 1, type: 'import', files: [new File([bytes], 'bomb.zip')] });
  assert.ok(messages.some(message => message.type === 'error' && /512 MB/.test(message.error)));
});

test('ZIP entry counts, local headers and corrupted data are verified', async () => {
  const mutations = [
    (bytes, view, central, end) => view.setUint16(end + 8, 2, true),
    (bytes, view) => view.setUint16(6, 1, true),
    (bytes, view) => view.setUint32(18, 999999, true),
    (bytes, view, central) => { view.setUint32(central + 16, 0, true); view.setUint32(14, 0, true); }
  ];
  for (const mutate of mutations) {
    const bytes = fflate.zipSync({ 'history.json': fflate.strToU8(JSON.stringify([row])) });
    const view = new DataView(bytes.buffer);
    let central;
    for (let i = 0; i <= bytes.length - 46; i++) if (view.getUint32(i, true) === 0x02014b50) { central = i; break; }
    mutate(bytes, view, central, bytes.length - 22);
    const local = worker();
    const messages = await local.send({ id: 1, type: 'import', files: [new File([bytes], 'corrupt.zip')] });
    assert.ok(messages.some(message => message.type === 'error'));
    assert.equal(local.evaluate('history.length'), 0);
  }
});

test('malformed ZIP and unsupported or overlarge files produce no retained data', async () => {
  for (const files of [[new File(['broken'], 'broken.zip')], [new File(['{}'], 'not-history.json')], [new File(['[]'], 'history.exe')], [{ name: 'large.json', size: 512 * 1024 * 1024 + 1, arrayBuffer() { throw new Error('Must not be read'); } }]]) {
    const local = worker();
    const messages = await local.send({ id: 1, type: 'import', files });
    assert.ok(messages.some(message => message.type === 'error'));
    assert.equal(local.evaluate('history.length'), 0);
  }
});

test('broken and unrelated JSON is skipped without a per-file diagnostics report', async () => {
  const local = worker();
  const messages = await local.send({ id: 1, type: 'import', files: [jsonFile(), new File(['broken SECRET_NAME'], 'bad.json'), jsonFile('account.json', [{ username: 'SECRET_USER' }])] });
  assert.equal(messages.find(message => message.type === 'result').result.fileCount, 1);
  assert.equal(messages.some(message => message.type === 'error'), false);
  assert.doesNotMatch(JSON.stringify(messages), /SECRET|bad\.json|account\.json/);
});

test('multiple messages are serialized while File reading is in progress', async () => {
  const local = worker();
  let release;
  const bytes = new TextEncoder().encode(JSON.stringify([row]));
  const file = { name: 'history.json', size: bytes.length, arrayBuffer() { return new Promise(resolve => { release = () => resolve(bytes.buffer); }); } };
  const importing = local.send({ id: 1, type: 'import', files: [file] });
  const messages = await local.send({ id: 2, type: 'analyze', options: {} });
  assert.ok(messages.some(message => message.type === 'error' && /already/.test(message.error)));
  release();
  await importing;
});
