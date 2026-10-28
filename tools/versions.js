// Usage: node tools/versions.js <a.pdf> <b.pdf> [...]  — compares the first one against the others.
import fs from 'node:fs';
import { pdfjsLib } from './node-pdf.js';
import { compareBookVersions } from '../src/importer/versions.js';

const files = process.argv.slice(2).map(p => ({ path: p, read: async () => new Uint8Array(fs.readFileSync(p)) }));
for (const r of await compareBookVersions(pdfjsLib, files)) console.log(r.verdict.padEnd(15), r.similarity ?? '', r.pages ? r.pages + 'p' : '', r.path.split(/[\\/]/).pop());
