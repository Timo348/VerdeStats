const { readdirSync, readFileSync } = require('node:fs');
const { join, relative } = require('node:path');
const { spawnSync } = require('node:child_process');
const ejs = require('ejs');
const root = join(__dirname, '..');
let failures = 0;
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'uploads'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
      if (result.status) { console.error(result.stderr); failures++; }
    } else if (entry.name.endsWith('.ejs')) {
      try { ejs.compile(readFileSync(full, 'utf8'), { filename: full }); }
      catch (err) { console.error(relative(root, full), err.message); failures++; }
    }
  }
}
visit(root);
if (failures) process.exitCode = 1;
else console.log('JavaScript and EJS syntax checks passed.');
