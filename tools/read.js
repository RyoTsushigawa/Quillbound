// Usage: node tools/read.js <file.pdf | archive.zip::inner.pdf> [--json out.json]
// Runs the offline reader and prints what it found.
import fs from 'node:fs';
import JSZip from 'jszip';
import { pdfjsLib } from './node-pdf.js';
import { extractPdf } from '../src/importer/pdftext.js';
import { readAdventure } from '../src/importer/reader.js';

const [spec, flag, jsonOut] = process.argv.slice(2);
async function readBytes(s) {
  const [zipPath, entry] = s.split('::');
  if (!entry) return new Uint8Array(fs.readFileSync(s));
  const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
  return zip.file(entry).async('uint8array');
}
const t0 = Date.now();
const doc = await extractPdf(pdfjsLib, await readBytes(spec));
const r = readAdventure(doc);
const cut = (s, n = 110) => (s || '').length > n ? s.slice(0, n) + '…' : (s || '');
console.log(`# ${r.title} — ${r.kind}, ${r.language}, system=${r.system}, ${r.stats.pages}p, ${Date.now() - t0}ms, fixes=${r.stats.fixes.join('; ') || 'none'}`);
console.log(`summary: ${cut(r.summary, 200)}`);
console.log(`\nBEATS (${r.beats.length})`); r.beats.forEach(b => console.log(` p${b.page} ${b.title} | ${cut(b.summary)}${b.question ? ' | Q: ' + cut(b.question, 60) : ''} | npcs:${b.npcs.join(',')} foes:${b.foes.join(',')} scenes:${b.scenes.length} read:${b.readAloud.length} br:${b.branches.length}`));
console.log(`\nHOOKS (${r.hooks.length})`); r.hooks.forEach(h => console.log(` p${h.page} ${h.title ? h.title + ': ' : ''}${cut(h.text)}`));
console.log(`\nNPCS (${r.npcs.length})`); r.npcs.forEach(n => console.log(` p${n.page} ${n.name} [${cut(n.role, 40)}] ${n.why} | wants: ${cut(n.wants, 60)} | secret: ${cut(n.secret, 50)} | line: ${cut(n.line, 40)} | voice: ${cut(n.voice, 40)}`));
console.log(`\nENEMIES (${r.enemies.length})`); r.enemies.forEach(e => console.log(` p${e.page} ${e.name} — ${e.kind}, AC ${e.ac} HP ${e.hp} CR ${e.cr} → ${e.tier}/${e.slots} | moves: ${e.moves.join(', ')}${e.npc ? ' | NPC' : ''}`));
console.log(`\nLOCATIONS (${r.locations.length})`); r.locations.forEach(l => console.log(` p${l.page} ${l.key}. ${l.name} (${l.beat}) | ${cut(l.text, 70)}`));
console.log(`\nITEMS (${r.items.length})`); r.items.forEach(i => console.log(` p${i.page} ${i.name}${i.rarity ? ' [' + i.rarity + ']' : ''} — ${i.why}`));
console.log(`\nTABLES (${r.tables.length})`); r.tables.forEach(t => console.log(` p${t.page} ${t.title} ${t.die} × ${t.rows.length}: ${cut(t.rows[0].text, 50)}`));
if (flag === '--json') fs.writeFileSync(jsonOut, JSON.stringify(r, null, 1));
