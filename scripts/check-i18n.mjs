// Checks that every translation key used in index.html exists in each language of assets/i18n.js.
// Usage: node scripts/check-i18n.mjs   (no dependencies)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(root + 'index.html', 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(root + 'assets/i18n.js', 'utf8'), sandbox);
const dicts = sandbox.window.AANOPS_I18N;

const used = new Set(['meta.title', 'meta.description']);
for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) used.add(m[1]);
for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
  for (const pair of m[1].split(';')) used.add(pair.split(':')[1]);
}
for (const key of Object.keys(dicts.fr || {})) used.add(key); // runtime-only strings

let failed = false;
const languages = Object.keys(dicts).filter(l => l !== 'fr');

const supported = html.match(/var SUPPORTED = \[([^\]]*)\]/);
const headLangs = supported ? supported[1].match(/'([a-z]{2})'/g).map(s => s.slice(1, -1)) : [];
for (const l of ['fr', ...languages]) {
  if (!headLangs.includes(l)) { console.error(`✗ '${l}' missing from SUPPORTED in index.html <head>`); failed = true; }
  if (l !== 'fr' && !html.includes(`data-lang="${l}"`)) { console.error(`✗ no language button for '${l}' in index.html`); failed = true; }
}

for (const lang of languages) {
  const keys = new Set(Object.keys(dicts[lang]));
  const missing = [...used].filter(k => !keys.has(k));
  const unused = [...keys].filter(k => !used.has(k));
  if (missing.length) { failed = true; console.error(`✗ ${lang}: ${missing.length} missing key(s):\n  ${missing.join('\n  ')}`); }
  if (unused.length) console.warn(`! ${lang}: ${unused.length} unused key(s):\n  ${unused.join('\n  ')}`);
  if (!missing.length) console.log(`✓ ${lang}: all ${used.size} keys present`);
}
process.exit(failed ? 1 : 0);
