// Node: turn folders, zips and single files into the flat entry list the library scanner takes.
// Uses the same zip reader as the browser (src/importer/zipdir.js).
import fs from 'node:fs';
import path from 'node:path';
import { listZip, readZipEntry } from '../src/importer/zipdir.js';

export const fileSource = full => {
  const size = fs.statSync(full).size;
  return {
    size,
    read: async (a, b) => {
      const fd = fs.openSync(full, 'r');
      try { const buf = Buffer.alloc(b - a); fs.readSync(fd, buf, 0, b - a, a); return new Uint8Array(buf.buffer, buf.byteOffset, buf.length); }
      finally { fs.closeSync(fd); }
    }
  };
};

export async function collect(root) {
  const out = [];
  const stat = fs.statSync(root);
  const base = stat.isDirectory() ? root : path.dirname(root);
  const addFile = async full => {
    const rel = path.relative(base, full).split(path.sep).join('/');
    const size = fs.statSync(full).size;
    if (/\.zip$/i.test(full)) {
      const src = fileSource(full);
      for (const e of await listZip(src)) out.push({ path: rel + '/' + e.name, size: e.size, inZip: rel, read: () => readZipEntry(src, e) });
    }
    out.push({ path: rel, size, read: async () => new Uint8Array(fs.readFileSync(full)) });
  };
  const walk = async dir => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (d.name === 'node_modules' || d.name === '.git') continue;
      const full = path.join(dir, d.name);
      if (d.isDirectory()) await walk(full); else await addFile(full);
    }
  };
  if (stat.isDirectory()) await walk(root); else await addFile(root);
  return out;
}
