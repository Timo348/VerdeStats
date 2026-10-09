/* Listening files and normalized streams remain inside this worker's RAM. */
'use strict';
importScripts('/vendor/fflate.js', '/analyzer.js', '/explorations.js');

const LIMITS = Object.freeze({ fileBytes: 512 * 1024 * 1024, totalBytes: 2 * 1024 * 1024 * 1024, expandedBytes: 2 * 1024 * 1024 * 1024, files: 200, archiveEntries: 10000, streams: 2000000 });
let history = [];
let historyFileCount = 0;
let busy = false;
function respond(id, type, payload) { self.postMessage({ id, type, ...payload }); }
function progress(id, value, stage) { respond(id, 'progress', { progress: Math.round(Math.max(0, Math.min(100, value))), stage }); }
function safeArchiveName(name) {
  if (!name || name.includes('\0') || /^[\\/]|^[A-Za-z]:/.test(name)) return false;
  const parts = name.replace(/\\/g, '/').split('/');
  return !parts.some(part => part === '..' || part === '.');
}

// Read the central directory before extraction. In particular, do not expand
// unrelated files from the export or trust a small compressed upload size.
function inspectZip(bytes, remainingBytes, remainingFiles) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (data.getUint32(offset, true) === 0x06054b50 && offset + 22 + data.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
  }
  if (end < 0) throw new Error('Invalid ZIP archive');
  if (data.getUint16(end + 4, true) || data.getUint16(end + 6, true)) throw new Error('Multi-part ZIP archives are not supported');
  const count = data.getUint16(end + 10, true), directorySize = data.getUint32(end + 12, true), directoryOffset = data.getUint32(end + 16, true);
  if (data.getUint16(end + 8, true) !== count) throw new Error('Inconsistent ZIP entry counts');
  if (count === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported; use the JSON files');
  if (count > LIMITS.archiveEntries || directoryOffset + directorySize > end) throw new Error('ZIP archive exceeds the import limits');
  let cursor = directoryOffset, expanded = 0, jsonCount = 0;
  const names = new Set(), expected = new Map();
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > directoryOffset + directorySize || data.getUint32(cursor, true) !== 0x02014b50) throw new Error('Invalid ZIP directory');
    const flags = data.getUint16(cursor + 8, true), method = data.getUint16(cursor + 10, true), compressedSize = data.getUint32(cursor + 20, true), originalSize = data.getUint32(cursor + 24, true);
    const nameLength = data.getUint16(cursor + 28, true), extraLength = data.getUint16(cursor + 30, true), commentLength = data.getUint16(cursor + 32, true);
    const unixType = (data.getUint32(cursor + 38, true) >>> 16) & 0xf000;
    const localOffset = data.getUint32(cursor + 42, true), next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > directoryOffset + directorySize || originalSize === 0xffffffff || compressedSize === 0xffffffff || localOffset + 30 > directoryOffset) throw new Error('Invalid ZIP entry');
    const name = new TextDecoder('utf-8').decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (!safeArchiveName(name) || unixType === 0xa000) throw new Error('Unsafe ZIP entry path');
    if (names.has(name)) throw new Error('ZIP archive contains duplicate paths');
    names.add(name);
    if (flags & 1) throw new Error('Encrypted ZIP archives are not supported');
    if (!name.endsWith('/') && /\.json$/i.test(name)) {
      if (![0, 8].includes(method)) throw new Error('Unsupported ZIP compression; use the JSON files');
      if (originalSize > LIMITS.fileBytes) throw new Error('A JSON file in the ZIP exceeds 512 MB');
      expanded += originalSize; jsonCount++;
      if (expanded > remainingBytes || jsonCount > remainingFiles) throw new Error('Expanded ZIP archive exceeds the import limits');
      if (data.getUint32(localOffset, true) !== 0x04034b50) throw new Error('Invalid ZIP file header');
      if (data.getUint16(localOffset + 6, true) !== flags || data.getUint16(localOffset + 8, true) !== method) throw new Error('Inconsistent ZIP compression flags');
      if (!(flags & 8) && (data.getUint32(localOffset + 18, true) !== compressedSize || data.getUint32(localOffset + 22, true) !== originalSize || data.getUint32(localOffset + 14, true) !== data.getUint32(cursor + 16, true))) throw new Error('Inconsistent ZIP file sizes');
      const localNameLength = data.getUint16(localOffset + 26, true), localExtraLength = data.getUint16(localOffset + 28, true);
      if (localOffset + 30 + localNameLength + localExtraLength + compressedSize > directoryOffset) throw new Error('Invalid ZIP file size');
      const localName = new TextDecoder('utf-8').decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength));
      if (localName !== name || !safeArchiveName(localName)) throw new Error('Inconsistent ZIP entry path');
      if (method === 0 && originalSize !== compressedSize) throw new Error('Inconsistent uncompressed ZIP size');
      expected.set(name, { size: originalSize, crc: data.getUint32(cursor + 16, true), method, compressedSize, dataOffset: localOffset + 30 + localNameLength + localExtraLength });
    }
    cursor = next;
  }
  if (cursor !== directoryOffset + directorySize) throw new Error('Invalid ZIP directory size');
  return { expanded, jsonCount, expected };
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

async function importHistory(id, files) {
  if (!Array.isArray(files) || !files.length || files.length > LIMITS.files) throw new Error('Select between 1 and 200 JSON or ZIP files');
  let totalBytes = 0;
  for (const file of files) {
    if (!file || typeof file.arrayBuffer !== 'function' || !/\.(json|zip)$/i.test(file.name || '')) throw new Error('Select JSON or ZIP files');
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > LIMITS.fileBytes) throw new Error('Each selected file must be between 1 byte and 512 MB');
    totalBytes += file.size;
  }
  if (totalBytes > LIMITS.totalBytes) throw new Error('Selected files exceed 2 GB');
  history = []; historyFileCount = 0;
  const candidate = [], seen = new Set(), strings = new Map();
  const metadataFields = ['name', 'artist', 'album', 'songId', 'artistId', 'albumId', 'platform', 'country'];
  let expandedBytes = 0, jsonFiles = 0, rawRows = 0;
  function parseJson(bytes) {
    if (bytes.length > LIMITS.fileBytes) throw new Error('A JSON file exceeds 512 MB');
    expandedBytes += bytes.length; jsonFiles++;
    if (expandedBytes > LIMITS.expandedBytes || jsonFiles > LIMITS.files) throw new Error('Expanded files exceed the import limits');
    let rows;
    try { rows = JSON.parse(new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '')); } catch { return; }
    if (!Array.isArray(rows)) return;
    rawRows += rows.length;
    if (rawRows > LIMITS.streams) throw new Error('The import exceeds 2 million listening entries');
    let valid = false;
    for (let index = 0; index < rows.length; index++) {
      const entry = VerdeAnalyzer.normalizeEntry(rows[index]);
      // Release raw personal fields as soon as this row is normalized.
      rows[index] = null;
      if (!entry) continue;
      valid = true;
      const fingerprint = entry.fingerprint;
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        // Reuse repeated metadata strings and discard the temporary dedup key.
        // This keeps the retained archive smaller without adding a data cache.
        delete entry.fingerprint;
        for (const field of metadataFields) {
          const value = entry[field];
          if (!strings.has(value)) strings.set(value, value);
          entry[field] = strings.get(value);
        }
        candidate.push(entry);
      }
    }
    if (valid) historyFileCount++;
  }
  for (let index = 0; index < files.length; index++) {
    progress(id, index / files.length * 65, 'reading');
    const file = files[index];
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== file.size) throw new Error('The selected file could not be read completely');
    if (/\.zip$/i.test(file.name)) {
      progress(id, (index + 0.25) / files.length * 65, 'extracting');
      const { expected } = inspectZip(bytes, LIMITS.expandedBytes - expandedBytes, LIMITS.files - jsonFiles);
      // Use only the directory we inspected, rather than letting another ZIP
      // parser choose an EOCD from a crafted archive comment. One extra output
      // byte makes a forged uncompressed size detectable without large growth.
      for (const expectedFile of expected.values()) {
        const compressed = bytes.subarray(expectedFile.dataOffset, expectedFile.dataOffset + expectedFile.compressedSize);
        const contents = expectedFile.method === 0 ? compressed : fflate.inflateSync(compressed, { out: new Uint8Array(expectedFile.size + 1) });
        if (contents.length !== expectedFile.size || crc32(contents) !== expectedFile.crc) throw new Error('Corrupted ZIP file data');
        parseJson(contents);
      }
    } else parseJson(bytes);
  }
  if (!candidate.length) throw new Error('No valid Spotify listening history found');
  progress(id, 70, 'sorting');
  candidate.sort((a, b) => a.time - b.time || a.songId.localeCompare(b.songId));
  seen.clear();
  strings.clear();
  history = candidate;
  progress(id, 80, 'analyzing');
  const result = VerdeAnalyzer.analyzeEntries(history, {}, historyFileCount);
  progress(id, 100, 'complete');
  respond(id, 'result', { result });
}

self.onmessage = async function (event) {
  const message = event.data || {}, id = message.id;
  if (busy) { respond(id, 'error', { error: 'An analysis is already running' }); return; }
  if (message.type === 'clear') { history = []; historyFileCount = 0; respond(id, 'cleared', {}); return; }
  busy = true;
  try {
    if (message.type === 'import') await importHistory(id, message.files);
    else if (message.type === 'analyze') {
      progress(id, 10, 'analyzing');
      const result = VerdeAnalyzer.analyzeEntries(history, message.options || {}, historyFileCount);
      progress(id, 100, 'complete');
      respond(id, 'result', { result });
    } else if (message.type === 'explore') {
      progress(id, 10, 'analyzing');
      const result = VerdeExplorations.explore(history, message.options || {}, message.request || {});
      progress(id, 100, 'complete');
      respond(id, 'exploration', { result });
    } else throw new Error('Unknown analysis request');
  } catch (error) {
    if (message.type === 'import') { history = []; historyFileCount = 0; }
    const knownMessage = error instanceof Error && !/^unexpected|invalid distance|invalid length|invalid code|unexpected EOF/i.test(error.message) ? error.message : 'The listening archive could not be processed';
    respond(id, 'error', { error: knownMessage });
  } finally { busy = false; }
};
