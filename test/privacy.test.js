const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('application has no telemetry, upload clients or listening-data persistence', () => {
  const publicDir=path.join(__dirname,'../public');
  for(const name of fs.readdirSync(publicDir).filter(name=>name.endsWith('.js'))) {
    const source=fs.readFileSync(path.join(publicDir,name),'utf8');
    assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, name+' must not send data');
    assert.doesNotMatch(source,/\b(?:sessionStorage|indexedDB)\b/,name+' must not persist history');
    assert.doesNotMatch(source,/document\.cookie|serviceWorker/,name+' must not set cookies or cache personal state');
    if(!['i18n.js','theme.js'].includes(name)) assert.doesNotMatch(source,/\blocalStorage\b/,name+' must keep listening data in RAM');
  }
  const theme=fs.readFileSync(path.join(publicDir,'theme.js'),'utf8');
  const themeKeys=[...theme.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(['"]([^'"]+)/g)].map(match=>match[1]);
  assert.deepEqual([...new Set(themeKeys)],['verdestats-theme']);
  const locale=fs.readFileSync(path.join(publicDir,'i18n.js'),'utf8');
  const keys=[...locale.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(['"]([^'"]+)/g)].map(match=>match[1]);
  assert.ok(keys.length);
  assert.deepEqual([...new Set(keys)],['verdestats-language']);
});
