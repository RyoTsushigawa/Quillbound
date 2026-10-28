// The test library on this machine, and a helper that loads a book's bytes (zip entries included).
import fs from 'node:fs';
import { listZip, readZipEntry } from '../src/importer/zipdir.js';
import { fileSource } from './node-files.js';

const D = 'C:/Users/Ryo/Desktop/Dnd', P = 'C:/Users/Ryo/Downloads/pegasusdigital-2026-10-25_08-12am';
export const BOOKS = [
  'C:/Users/Ryo/Desktop/the_wild_sheep_chase_v2.pdf',
  `${P}/3019816-HappyJacksFunhouseCOLOR_Adventure.pdf`,
  `${P}/3019816-AnnalysesRevengeCOLOR.pdf`,
  `${P}/3019816-MadhouseofTashasKissCOLOR.pdf`,
  `${P}/Cthulhu_Familienbande_DL_Version.pdf`,
  ...['Beneath_The_Black_Rose_V1', 'Crypts_of_Azarumme_V3', 'Fangs_of_Oatali_V1', 'Fires_of_Iskh_V5', 'Gate_of_the_Lens_Wizards_V1', 'Ghostlight_V1', 'Masque_of_the_Worms_V3',
    'Monastery_of_the_Shadow_Sorcerers_V1', 'Red_Sky_At_Morning_V1-1', 'Shadows_of_Lastwatch_Keep_V3', 'The_Curse_of_Wardenwood_V2', 'The_Horror_Within_V1', 'The_Snow_Stalkers_V1',
    'The_Underwarrens_V1-2', 'Treaty_of_the_Tiger_King_V4', 'Valley_of_the_Gilded_Tower_V3', 'Watchers_in_the_Dark_V2'].map(z => `${D}/${z}.zip`)
];

// For a zip: the main book is the shortest PDF name in the top folder that isn't print-friendly, cards or legal.
export async function loadBook(spec) {
  if (!/\.zip$/i.test(spec)) return { label: spec.split('/').pop(), bytes: new Uint8Array(fs.readFileSync(spec)) };
  const src = fileSource(spec);
  const entries = (await listZip(src)).filter(e => /\.pdf$/i.test(e.name) && !/__MACOSX|print friendly|cards|legal/i.test(e.name) && e.name.split('/').length === 2);
  entries.sort((a, b) => a.name.length - b.name.length);
  return { label: entries[0].name.split('/').pop(), bytes: await readZipEntry(src, entries[0]) };
}
