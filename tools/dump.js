// Usage: node tools/dump.js <file.pdf> [firstPage-lastPage]
// Prints each line with page, column, size and font so we can see how a book is laid out.
// A file inside a zip can be given as "archive.zip::path/in/zip.pdf".
import fs from 'node:fs';
import JSZip from 'jszip';
import { pdfjsLib } from './node-pdf.js';
import { extractPdf } from '../src/importer/pdftext.js';

const [file, range = '1-400'] = process.argv.slice(2);
const [a, b] = range.split('-').map(Number);
async function readBytes(spec) {
  const [zipPath, entry] = spec.split('::');
  if (!entry) return new Uint8Array(fs.readFileSync(spec));
  const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
  return zip.file(entry).async('uint8array');
}
const res = await extractPdf(pdfjsLib, await readBytes(file), { maxPages: b || a });
console.log(`# ${file}\n# pages ${res.numPages} meta ${JSON.stringify(res.meta)}`);
const fonts = {};
for (const p of res.pages) for (const l of p.lines) { const k = `${l.font}@${l.size.toFixed(1)}`; fonts[k] = (fonts[k] || 0) + l.text.length; }
console.log('# fonts', Object.entries(fonts).sort((x, y) => y[1] - x[1]).slice(0, 25).map(([k, v]) => `${k}:${v}`).join('  '));
for (const p of res.pages) {
  if (p.n < a) continue;
  console.log(`\n=== page ${p.n} (${p.lines.length} lines, ${p.images} images, cover ${p.imageCover.toFixed(2)})`);
  for (const l of p.lines) console.log(`c${l.col} ${l.size.toFixed(1).padStart(4)} ${(l.font || '?').slice(0, 22).padEnd(22)} ${l.bold ? 'B' : ' '}${l.leadBold ? '[' + l.leadBold + ']' : ''} ${l.text}`);
}
