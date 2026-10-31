import { fromBlob, listZip, readZipEntry } from './zipdir.js';

// Read locally, with one budget shared by all nested archives. Nothing is extracted to disk.
export async function listPackage(file) {
  const files = [], budget = { bytes: 0, count: 0 };
  async function walk(blob, prefix, depth) {
    if (depth > 3) throw Error('This ZIP contains too many nested archives. Unzip it first.');
    const src = fromBlob(blob);
    for (const entry of await listZip(src)) {
      const name = entry.name.replace(/\\/g, '/');
      if (name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').includes('..')) throw Error('This ZIP contains an unsafe filename.');
      if (name.startsWith('__MACOSX/') || /(?:^|\/)\.[^/]+$/.test(name)) continue;
      if (++budget.count > 4000 || (budget.bytes += entry.size) > 300 * 1024 * 1024) throw Error('This ZIP is too large. Import smaller packages.');
      const path = prefix + name;
      const read = async () => {
        const bytes = await readZipEntry(src, entry);
        if (bytes.length !== entry.size) throw Error('This ZIP contains a damaged file.');
        return bytes;
      };
      if (/\.zip$/i.test(name)) await walk(new Blob([await read()]), path + '/', depth + 1);
      else files.push({ path, size:entry.size, read });
    }
  }
  await walk(file, '', 0);
  return files;
}

export async function readPackage(file) {
  const files = [];
  for (const entry of await listPackage(file)) files.push({path:entry.path,blob:new Blob([await entry.read()])});
  return files;
}

export async function campaignPackage(file, parse) {
  const files = await readPackage(file), campaigns = [];
  for (const f of files.filter(f => /\.json$/i.test(f.path))) {
    if (f.blob.size > 10 * 1024 * 1024) continue;
    const result = parse(await f.blob.text());
    if (!result.error) campaigns.push({ ...result, path: f.path });
  }
  if (!campaigns.length) throw Error('No Quillbound campaign backup was found. For map or PDF ZIPs, use Import adventure → Choose files.');
  return { files, campaigns };
}
