const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { normalize, compile, score } = require('../public/search');

test('apostrophe variants and apostrophe-free queries find the full supplied title', () => {
  const entity = { name: "It's Snowing Like It's the End of the World", artist: 'A Winter Artist' };
  for (const query of ["it's snowing like it's the end of the world", 'it’s snowing like it’s the end of the world', 'its snowing like its the end of the world', '  ITS   SNOWING like its the end of the world  ']) {
    assert.equal(score(entity, compile(query)), 1000, query);
  }
  assert.equal(score({ name: 'It’s Snowing' }, compile("it's snowing")), 1000);
  assert.equal(normalize('Lʼamour'), 'lamour');
});

test('diacritics, compatibility characters and German case folding agree', () => {
  assert.equal(normalize('Björk — Jóga'), 'bjork joga');
  assert.ok(score({ name: 'Jóga', artist: 'Björk' }, compile('bjork joga')) > 0);
  assert.equal(score({ name: 'Café' }, compile('cafe')), 1000);
  assert.equal(score({ name: 'Cafe\u0301' }, compile('CAFÉ')), 1000);
  assert.equal(score({ name: 'Ｓｎｏｗ' }, compile('snow')), 1000);
  assert.equal(score({ name: 'ﬁre' }, compile('fire')), 1000);
  assert.equal(score({ name: 'Straße' }, compile('STRASSE')), 1000);
});

test('punctuation, hyphens and excess whitespace become tolerant word boundaries', () => {
  assert.equal(normalize('  end—of-the-world: (live)\t\n '), 'end of the world live');
  assert.equal(score({ name: 'End-of-the-World' }, compile('end of the world')), 1000);
  assert.ok(score({ name: 'Song (Live)' }, compile('live song')) > 0);
  assert.equal(score({ name: 'AC/DC' }, compile('ac dc')), 1000);
});

test('all query tokens may be out of order or distributed across title, artist and album', () => {
  const entity = { name: 'The End of the World', artist: 'Winter Lights', album: 'Northern Snow' };
  assert.ok(score(entity, compile('snow winter world')) > 0);
  assert.ok(score(entity, compile('world end')) > 0);
  assert.equal(score(entity, compile('world winter missing')), 0);
  assert.equal(score({ name: 'Snow' }, compile('snow artist')), 0);
  assert.deepEqual(compile('snow snow winter').tokens, ['snow', 'winter']);
});

test('relevance ranks exact titles before prefixes, phrase matches and token-only matches', () => {
  const query = compile('winter snow');
  const scores = [
    { name: 'Winter Snow' },
    { name: 'Winter Snow (Live)' },
    { name: 'A Winter Snow Story' },
    { name: 'Snow in Winter' },
    { name: 'Unrelated', artist: 'Winter', album: 'Snow' }
  ].map(entity => score(entity, query));
  for (let index = 1; index < scores.length; index++) assert.ok(scores[index - 1] > scores[index]);
});

test('short queries support prefixes and substrings across available fields', () => {
  assert.ok(score({ name: 'Snowfall' }, compile('sn')) > score({ name: 'A Snowfall' }, compile('sn')));
  assert.ok(score({ name: 'Winter', artist: 'Snowfall' }, compile('now')) > 0);
  assert.ok(score({ name: 'Winter', album: 'Snowfall' }, compile('now')) > 0);
  assert.equal(score({ name: 'Winter' }, compile('sn')), 0);
});

test('Unicode writing systems remain intact, including meaningful non-Latin marks', () => {
  for (const name of ['東京', '가을', 'ガラス', 'नमस्ते', 'مُوسِيقَى', '🌨️']) {
    assert.equal(normalize(name), name.toLowerCase());
    assert.equal(score({ name }, compile(name)), 1000);
  }
  assert.ok(score({ name: '東京の雪' }, compile('東京')) > 0);
  assert.equal(score({ name: 'Москва' }, compile('moskva')), 0);
  assert.equal(score({ name: 'ΟΣ' }, compile('οσ')), 1000);
});

test('empty queries preserve existing order and missing fields fail safely', () => {
  for (const query of ['', '   ', undefined, '---']) {
    assert.equal(score({ name: 'Anything' }, compile(query)), 1);
    assert.equal(score({}, compile(query)), 1);
  }
  assert.equal(score({}, compile('snow')), 0);
  assert.equal(score(null, compile('snow')), 0);
  assert.equal(normalize({ name: 'Snow' }), '');
});

test('the same helper is exposed to the browser without dependencies', () => {
  const context = vm.createContext({ self: {} });
  vm.runInContext(fs.readFileSync(require.resolve('../public/search'), 'utf8'), context);
  assert.equal(context.self.VerdeSearch.score({ name: 'Jóga' }, context.self.VerdeSearch.compile('joga')), 1000);
});
