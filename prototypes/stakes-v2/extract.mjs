// Pull fight material out of the user's adventure library for the combat simulator.
// For each adventure zip: the party level the book is written for, every "<number> <creature>" phrase with its
// section, and the book's own stat blocks (attack bonus, damage). Output: prototypes/stakes-v2/library-raw.json
// Usage: node prototypes/stakes-v2/extract.mjs [folder]
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { pdfjsLib } from '../../tools/node-pdf.js';
import { extractPdf } from '../../src/importer/pdftext.js';
import { readAdventure } from '../../src/importer/reader.js';

const dir = process.argv[2] || 'C:/Users/Ryo/Desktop/Dnd';
const NUM = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1, one: 1, single: 1, pair: 2, dozen: 12 };
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
const STOP = /^(of|the|and|or|to|in|on|at|is|are|was|were|has|have|who|that|with|from|for|by|it|its|their|them|they|he|she|his|her|dc|days?|hours?|minutes?|rounds?|times?|feet|foot|ft|miles?|gp|sp|cp|pp|turns?|weeks?|years?|levels?|d\d+)$/i;

function attackOf(action) { // "+7 to hit ... Hit: 6 (1d4 + 4) piercing damage plus 7 (2d6) poison"
  const hit = action.text.match(/([+-]\d+) to hit/); if (!hit) return null;
  const dmg = [...action.text.matchAll(/\d+\s*\(\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*\)/g)].map(m => m[1].replace(/\s/g, ''));
  return dmg.length ? { name: action.name, bonus: +hit[1], damage: dmg.join('+') } : null;
}
function multi(actions) { // "makes two attacks" → 2
  const m = actions.find(a => /multiattack/i.test(a.name)); if (!m) return 1;
  const n = m.text.match(/makes (\w+)/i); return n ? (NUM[n[1].toLowerCase()] || +n[1] || 2) : 2;
}

const out = [];
for (const zipName of fs.readdirSync(dir).filter(f => /\.zip$/i.test(f) && !/cards|pack/i.test(f))) {
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(dir, zipName)));
  const pdfs = Object.keys(zip.files).filter(f => /\.pdf$/i.test(f) && !/__MACOSX|print|card|map|handout|pc\b/i.test(f));
  const main = pdfs.sort((a, b) => a.length - b.length)[0];
  if (!main) { console.error('no main pdf in', zipName); continue; }
  const doc = await extractPdf(pdfjsLib, await zip.file(main).async('uint8array'));
  const r = readAdventure(doc);
  const lines = doc.pages.flatMap(p => p.lines.map(l => ({ ...l, page: p.n })));
  const text = lines.map(l => l.text).join(' ').replace(/\s+/g, ' ');
  const lv = text.match(/(\d+)(?:st|nd|rd|th)[- ]level/i) || text.match(/levels? (\d+)/i) || text.match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)[- ]level/i);
  const level = lv ? (+lv[1] || ORD[lv[1].toLowerCase()]) : null;
  const players = (text.match(/(three|four|five|six)(?: (?:to|or) (four|five|six|seven))? (?:players|characters|PCs)/i) || []).slice(1).filter(Boolean).join('-');
  // sections: bold headings at 12pt or above split the book into encounter areas
  const sections = []; let cur = { title: '(start)', page: 1, text: '' };
  for (const l of lines) {
    if (l.bold && l.size >= 11.5 && l.text.length < 60 && !/^(treasure|development|dramatic question|transition|combat|surprise round)$/i.test(l.text.trim())) { sections.push(cur); cur = { title: l.text.trim(), page: l.page, text: '' }; }
    else cur.text += ' ' + l.text;
  }
  sections.push(cur);
  const mentions = [];
  for (const s of sections) {
    const t = s.text.replace(/\s+/g, ' ');
    for (const m of t.matchAll(/\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2}|a pair of|a dozen)\s+((?:[a-z'-]+\s+){0,3}?[a-z'-]+?)(?=[\s,.;:)])/gi)) {
      const words = m[2].toLowerCase().split(' ');
      if (words.some(w => STOP.test(w)) || /^\d/.test(m[2])) continue;
      const nRaw = m[1].toLowerCase().replace(/^a (pair of|dozen)$/, (_, x) => x === 'dozen' ? 'dozen' : 'pair');
      mentions.push({ section: s.title, page: s.page, n: NUM[nRaw] || +nRaw, what: m[2].toLowerCase(), context: t.slice(Math.max(0, m.index - 60), m.index + 90) });
    }
  }
  const blocks = r.enemies.map(e => ({ name: e.name, cr: e.cr, hp: e.hp, ac: e.ac, page: e.page, attacks: (e.actions || []).map(attackOf).filter(Boolean), multiattack: multi(e.actions || []) }));
  out.push({ adventure: r.title, zip: zipName, pdf: main, level, players, mentions, blocks });
  console.log(`${r.title.padEnd(40)} level ${level ?? '?'} players ${players || '?'}  mentions ${mentions.length}  stat blocks ${blocks.length}`);
}
fs.writeFileSync(new URL('./library-raw.json', import.meta.url), JSON.stringify(out, null, 1));
