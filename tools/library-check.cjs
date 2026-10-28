// Library scanner: PC character cards keep their name and are never treated as monster cards;
// "PC" on a map image still means the player version of that map.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = process.argv[2] || path.resolve(__dirname, '..');
const load = f => import(pathToFileURL(path.join(root, 'src/importer', f)).href);

(async () => {
  const { scanLibrary } = await load('library.js');
  const { analyseName } = await load('names.js');
  const entry = (p, size) => ({ path: p, size, rootLen: 1 });
  const files = [
    'Lib/Crypts.zip/Crypts V3/Crypts V3.pdf',
    'Lib/Crypts.zip/Crypts V3/Crypts Combat Cards/Color/PC Combat Cards.pdf',
    'Lib/Crypts.zip/Crypts V3/Crypts Combat Cards/Color/Crypts Combat Cards 1.pdf',
    'Lib/Crypts.zip/Crypts V3/Crypts Combat Cards/Print Friendly/PC Combat Cards Print Friendly.pdf',
    'Lib/Crypts.zip/Crypts V3/Crypts Maps/Area 7 DM.png',
    'Lib/Crypts.zip/Crypts V3/Crypts Maps/Area 7-PC.jpg'
  ].map((p, i) => entry(p, 1000 + i));
  const { products } = await scanLibrary(files, { hash: false });
  const p = products[0];
  const cards = p.items.filter(it => it.kind === 'cards');
  const pcItem = cards.find(it => /\bpc\b/i.test(it.label));
  assert(pcItem, 'PC cards keep "PC" in their label: ' + cards.map(c => c.label).join(' | '));
  assert(pcItem.files.every(f => /PC Combat Cards/.test(f.path)), 'PC cards are not mixed with monster cards');
  assert(pcItem.files.every(f => f.tags.audience !== 'player'), 'PC cards are not marked as a player version');
  // the importer skips card items whose label mentions PC when it looks for monsters
  const monsterSheets = cards.filter(it => !/\bpc\b|item|legendary|spell/i.test(it.label));
  assert(monsterSheets.length === 1 && /Combat Cards 1/.test(monsterSheets[0].files[0].path), 'only the monster sheet is read for enemies');
  assert.equal(analyseName('Maps/Area 7-PC.jpg').tags.audience, 'player');
  assert.equal(analyseName('Maps/Area 7 DM.png').tags.audience, 'dm');
  console.log('PASS: PC character cards stay separate from monster cards; "PC" on a map image still marks the player version.');
})().catch(e => { console.error(e); process.exit(1); });
