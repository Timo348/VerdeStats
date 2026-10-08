const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fflate = require('fflate');
const analyzer = require('../public/analyzer');

test('a forged EOCD inside an archive comment cannot redirect extraction or allocate unchecked output', async () => {
  const entry = name => ({ ts: '2024-01-01T12:00:00Z', ms_played: 60000, master_metadata_track_name: name, master_metadata_album_artist_name: 'Artist' });
  const zip = name => fflate.zipSync({ 'history.json': fflate.strToU8(JSON.stringify([entry(name)])) });
  const actual = zip('Validated history');
  const forged = zip('Unvalidated history');
  const forgedView = new DataView(forged.buffer);
  const forgedEnd = forged.length - 22;
  const forgedDirectory = forgedView.getUint32(forgedEnd + 16, true);
  // A parser that scans signatures without validating comment length will
  // select this inner EOCD and follow its absolute central/local offsets.
  forgedView.setUint32(forgedEnd + 16, actual.length + forgedDirectory, true);
  forgedView.setUint32(forgedDirectory + 42, actual.length, true);
  forgedView.setUint32(forgedDirectory + 24, 512 * 1024 * 1024 + 1, true);
  forgedView.setUint16(forgedEnd + 20, 1, true);
  const bytes = new Uint8Array(actual.length + forged.length);
  bytes.set(actual);
  bytes.set(forged, actual.length);
  new DataView(bytes.buffer).setUint16(actual.length - 2, forged.length, true);

  let uncheckedAllocation = false;
  class GuardedBytes extends Uint8Array {
    constructor(value, ...rest) {
      if (typeof value === 'number' && value > 512 * 1024 * 1024) {
        uncheckedAllocation = true;
        throw new Error('Unvalidated expansion attempted');
      }
      super(value, ...rest);
    }
  }
  const messages = [];
  const self = { postMessage(message) { messages.push(structuredClone(message)); } };
  const context = vm.createContext({ self, importScripts() {}, VerdeAnalyzer: analyzer, Uint8Array: GuardedBytes, TextDecoder, TextEncoder, DataView, Error });
  // Exercise the real bundled decompressor, with a guard preventing this
  // regression fixture from allocating half a gigabyte during the test.
  const fflateUmd = path.resolve(path.dirname(require.resolve('fflate')), '..', 'umd', 'index.js');
  vm.runInContext(fs.readFileSync(fflateUmd, 'utf8'), context);
  context.fflate = self.fflate;
  vm.runInContext(fs.readFileSync(require.resolve('../public/worker.js'), 'utf8'), context);
  await self.onmessage({ data: { id: 1, type: 'import', files: [new File([bytes], 'history.zip')] } });
  assert.equal(uncheckedAllocation, false);
  const result = messages.find(message => message.type === 'result');
  assert.ok(result, JSON.stringify(messages.filter(message => message.type === 'error')));
  assert.equal(result.result.totals.streams, 1);
  assert.equal(result.result.library.songs[0].name, 'Validated history');
});
