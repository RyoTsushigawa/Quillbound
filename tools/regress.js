// Runs the reader over a fixed set of real books and prints one line of counts per book,
// so changes to the reader can be checked against every layout at once.
// Usage: node tools/regress.js   (paths below are this machine's test library)
import fs from 'node:fs';
import JSZip from 'jszip';
import { pdfjsLib } from './node-pdf.js';
import { extractPdf } from '../src/importer/pdftext.js';
import { readAdventure } from '../src/importer/reader.js';

const D = 'C:/Users/Ryo/Desktop/Dnd', P = 'C:/Users/Ryo/Downloads/pegasusdigital-2026-10-25_08-12am';
const BOOKS = [
  'C:/Users/Ryo/Desktop/the_wild_sheep_chase_v2.pdf',
  `${P}/3019816-HappyJacksFunhouseCOLOR_Adventure.pdf`,
  `${P}/3019816-AnnalysesRevengeCOLOR.pdf`,
  `${P}/3019816-MadhouseofTashasKissCOLOR.pdf`,
  `${P}/Cthulhu_Familienbande_DL_Version.pdf`,
  ...['Beneath_The_Black_Rose_V1', 'Crypts_of_Azarumme_V3', 'Fangs_of_Oatali_V1', 'Fires_of_Iskh_V5', 'Gate_of_the_Lens_Wizards_V1', 'Ghostlight_V1', 'Masque_of_the_Worms_V3',
    'Monastery_of_the_Shadow_Sorcerers_V1', 'Red_Sky_At_Morning_V1-1', 'Shadows_of_Lastwatch_Keep_V3', 'The_Curse_of_Wardenwood_V2', 'The_Horror_Within_V1', 'The_Snow_Stalkers_V1',
    'The_Underwarrens_V1-2', 'Treaty_of_the_Tiger_King_V4', 'Valley_of_the_Gilded_Tower_V3', 'Watchers_in_the_Dark_V2'].map(z => `${D}/${z}.zip::*`)
];
const only = process.argv[2];
for (const spec of BOOKS) {
  if (only && !spec.toLowerCase().includes(only.toLowerCase())) continue;
  let bytes, label = spec.split('/').pop();
  const [zipPath, entry] = spec.split('::');
  if (entry) {
    const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
    // the main book: the shortest PDF name in the top folder that isn't "Print Friendly"
    const pdfs = Object.keys(zip.files).filter(n => /\.pdf$/i.test(n) && !/__MACOSX|print friendly|cards|legal/i.test(n) && n.split('/').length === 2);
    pdfs.sort((a, b) => a.length - b.length);
    label = pdfs[0].split('/').pop();
    bytes = await zip.file(pdfs[0]).async('uint8array');
  } else bytes = new Uint8Array(fs.readFileSync(spec));
  const t0 = Date.now();
  try {
    const r = readAdventure(await extractPdf(pdfjsLib, bytes));
    const c = k => String(r[k].length).padStart(3);
    console.log(`${label.slice(0, 44).padEnd(44)} ${String(r.stats.pages).padStart(3)}p beats${c('beats')} hooks${c('hooks')} npcs${c('npcs')} foes${c('enemies')} areas${c('locations')} items${c('items')} tables${c('tables')} ${r.language}/${r.system} ${Date.now() - t0}ms ${r.stats.fixes.length ? '[' + r.stats.fixes.length + ' fixes]' : ''}`);
    if (only) fs.writeFileSync(`out/regress-${label}.json`, JSON.stringify(r, null, 1));
  } catch (e) { console.log(`${label.padEnd(44)} FAILED ${e.message}`); }
}
