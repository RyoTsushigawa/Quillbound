// Usage: node tools/scan.js <folder-or-file> [...more]
// Prints how the library scanner groups everything.
import fs from 'node:fs';
import { collect } from './node-files.js';
import { scanLibrary, KIND_LABEL } from '../src/importer/library.js';

const roots = process.argv.slice(2);
const entries = [];
for (const r of roots) {
  const isDir = fs.statSync(r).isDirectory();
  entries.push(...(await collect(r)).filter(e => !/^Tools[\\/]/.test(e.path)).map(e => isDir ? { ...e, path: r.split(/[\\/]/).pop() + '/' + e.path, rootLen: 1 } : { ...e, rootLen: 0 }));
}
const { products, mirrors } = await scanLibrary(entries);
console.log(`${entries.length} files -> ${products.length} products`);
for (const m of mirrors) console.log(`mirror: ${m.zip} == ${m.folder} (${m.files} files)`);
for (const p of products) {
  console.log(`\n■ ${p.name}${p.system ? ' [' + p.system + ']' : ''}${p.language ? ' [' + p.language + ']' : ''}${p.unnamed ? ' (unnamed)' : ''}  key=${p.key.join(' ')}  ${JSON.stringify(p.counts)} dupes=${p.duplicates}`);
  console.log(`  units: ${p.units.join(' | ')}`);
  for (const it of p.items) {
    console.log(`  - ${KIND_LABEL[it.kind]}: ${it.label}`);
    for (const f of it.files) console.log(`      ${f.path === it.primary ? '★' : ' '} ${f.duplicateOf ? '(copy) ' : ''}${f.variant ? '[' + f.variant + '] ' : ''}${f.path.split('/').slice(-2).join('/')}`);
  }
}
