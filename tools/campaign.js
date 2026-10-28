// Usage: node tools/campaign.js  — reads every test book and prints levels, themes and cross-book links.
import fs from 'node:fs';
import { pdfjsLib } from './node-pdf.js';
import { extractPdf } from '../src/importer/pdftext.js';
import { readAdventure } from '../src/importer/reader.js';
import { findConnections, suggestOrder, bridgeIdeas } from '../src/importer/campaign.js';
import { BOOKS, loadBook } from './books.js';

const profiles = [];
const cache = 'out/profiles.json';
if (fs.existsSync(cache) && process.argv[2] !== '--fresh') profiles.push(...JSON.parse(fs.readFileSync(cache, 'utf8')));
else {
  for (const spec of BOOKS) {
    const { label, bytes } = await loadBook(spec);
    const r = readAdventure(await extractPdf(pdfjsLib, bytes));
    profiles.push({ ...r.profile, title: r.title || label });
    process.stderr.write('.');
  }
  fs.writeFileSync(cache, JSON.stringify(profiles));
}
for (const p of profiles) console.log(`${(p.title || '').slice(0, 36).padEnd(36)} lvl ${p.levels ? p.levels.min + '-' + p.levels.max : '?'.padEnd(3)}  ${Object.entries(p.themes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ':' + v).join(' ')}`);
const links = findConnections(profiles);
const { order, gaps } = suggestOrder(profiles, links);
console.log('\nORDER:', order.map(i => profiles[i].title).join(' → '));
console.log('GAPS:', gaps.map(g => `${profiles[g.after].title} (${g.from}) → ${profiles[g.before].title} (${g.to})`).join('; '));
console.log('\nLINKS:');
for (const l of links.filter(l => l.type !== 'theme').slice(0, 40)) console.log(` [${l.type}] ${l.name} (${l.countA}/${l.countB}): ${profiles[l.a].title} ↔ ${profiles[l.b].title}\n     A: ${l.ctxA.slice(0, 140)}\n     B: ${l.ctxB.slice(0, 140)}`);
console.log('\nTHEME LINKS:', links.filter(l => l.type === 'theme').length);
const w = links.find(l => /whisperskull/i.test(l.name));
if (w) console.log('\nBRIDGES for', w.name, bridgeIdeas(w, profiles[w.a], profiles[w.b]));
