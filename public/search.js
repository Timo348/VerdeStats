(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VerdeSearch = api;
})(typeof self === 'object' ? self : globalThis, function () {
  'use strict';

  function normalize(value) {
    if (typeof value !== 'string') return '';
    return value.normalize('NFKD')
      // Fold Latin accents without stripping meaningful vowel marks or
      // modifying letters in other writing systems.
      .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .replace(/ς/g, 'σ')
      // Apostrophes are optional inside words: It's, It’s and its agree.
      .replace(/['\u2018\u2019\u201b\u02bc\uff07]/g, '')
      // Keep Unicode letters, numbers, marks and symbols, including emoji.
      // Other punctuation acts as a boundary rather than joining words.
      .replace(/[^\p{L}\p{N}\p{M}\p{S}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .normalize('NFC');
  }

  function compile(query) {
    const text = normalize(query);
    const tokens = Object.freeze([...new Set(text.split(' ').filter(Boolean))]);
    return Object.freeze({ text, tokens });
  }

  function score(entity, compiled) {
    if (!compiled || !compiled.text) return 1;
    if (!entity || !Array.isArray(compiled.tokens) || !compiled.tokens.length) return 0;
    const query = compiled.text;
    const name = normalize(entity.name);
    // A title phrase already contains every query token. Avoid normalizing
    // unrelated metadata for these common matches on every keystroke.
    if (name === query) return 1000;
    if (name.startsWith(query)) return 900;
    if (name.includes(query)) return 800;
    const fields = [name, normalize(entity.artist), normalize(entity.album)];
    let titleTokens = 0, artistTokens = 0;
    for (const token of compiled.tokens) {
      if (fields[0].includes(token)) titleTokens++;
      else if (fields[1].includes(token)) artistTokens++;
      else if (!fields[2].includes(token)) return 0;
    }
    if (fields[1] === query) return 750;
    if (fields[2] === query) return 700;
    if (fields[1].startsWith(query)) return 650;
    if (fields[2].startsWith(query)) return 600;
    if (fields[1].includes(query)) return 550;
    if (fields[2].includes(query)) return 500;
    // Every token matched somewhere, even when the query order differs or
    // spans title, artist and album. Scores remain below phrase matches.
    return 100 + Math.round(100 * titleTokens / compiled.tokens.length)
      + Math.round(30 * artistTokens / compiled.tokens.length);
  }

  return { normalize, compile, score };
});
