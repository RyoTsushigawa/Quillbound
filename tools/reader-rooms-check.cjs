// Room-keyed books: overprinted text is read once, each numbered room is a location, and chapters about the book are references.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = f => import(pathToFileURL(path.join(__dirname, '..', 'src/importer', f)).href);

(async () => {
  const { dropOverprint } = await load('pdftext.js');
  const { readAdventure } = await load('reader.js');
  const item = (str, x, y, size = 10) => ({ str, x, y, w: str.length * 5, size });
  const kept = dropOverprint([item('Shadow', 50, 500, 18), item('Shadow', 50.5, 500.5, 18), item('Shadow', 50, 300, 18), item('the', 50, 100), item('the', 90, 100)]);
  assert.equal(kept.length, 4, 'only the copy drawn on top of another goes; the same word elsewhere stays');

  const line = (text, y, size = 10, font = 'Body') => ({ text, x: 50, y, w: Math.min(text.length * 5, 200), size, font, bold: size > 10, italic: false, leadBold: '' });
  const body = n => Array.from({ length: 8 }, (_, i) => `Room ${n} has plain test wording for the reader in sentence number ${i + 1} of this short note.`);
  const pages = [];
  const page = rows => { let y = 760; const n = pages.length + 1; pages.push({ n, width: 612, height: 792, images: 0, imageCover: 0, lines: rows.map(([t, s]) => { y -= s > 10 ? 26 : 13; return { ...line(t, y, s), page: n }; }) }); };
  page([['Running the Adventure', 18], ...body('setup').map(t => [t, 10]), ['The Old Mill', 18], ...body('mill').map(t => [t, 10])]);
  for (const [n, name] of [[1, 'Front Door'], [2, 'Grain Store'], [3, 'Wheel Room'], [4, 'Loft']]) page([[`${n} - ${name}`, 13], ...body(name).map(t => [t, 10])]);
  page([['Aftermath', 18], ...body('end').map(t => [t, 10])]);
  const r = readAdventure({ numPages: pages.length, meta: {}, pages });
  const places = r.beats.filter(b => !b.reference).map(b => b.title), notes = r.beats.filter(b => b.reference).map(b => b.title);
  assert.deepEqual(places, ['1. Front Door', '2. Grain Store', '3. Wheel Room', '4. Loft', 'Aftermath']);
  assert(notes.includes('Running the Adventure') && notes.includes('The Old Mill'), 'chapters about the book and the place as a whole stay to read');
  const room = r.beats.find(b => b.title === '2. Grain Store');
  assert(room.summary.includes('sentence number 8'), 'a room keeps its whole text');
  console.log('PASS: overprinted PDF text is read once; numbered rooms become locations with their whole text; setup chapters stay private references.');
})().catch(e => { console.error(e); process.exit(1); });
