// Minimal ZIP reader: lists entries from the central directory and unpacks one entry
// on demand, so a 200 MB adventure zip never has to sit in memory as a whole.
// `src` is anything with { size, read(start, end) => Promise<Uint8Array> }.
// Browser: fromBlob(file). Node: see tools/node-files.js.

export const fromBlob = blob => ({ size: blob.size, read: async (a, b) => new Uint8Array(await blob.slice(a, b).arrayBuffer()) });

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const CP437 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
const decodeName = (bytes, utf8) => {
  if (utf8 || !bytes.some(b => b > 127)) return new TextDecoder('utf-8').decode(bytes);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return [...bytes].map(b => b < 128 ? String.fromCharCode(b) : CP437[b - 128]).join(''); }
};

export async function listZip(src) {
  // End of central directory record: within the last 64 KB + 22 bytes
  const tailLen = Math.min(src.size, 65557);
  const tail = await src.read(src.size - tailLen, src.size);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a zip file (no directory found)');
  let count = u16(tail, eocd + 10), cdSize = u32(tail, eocd + 12), cdOffset = u32(tail, eocd + 16);
  // ZIP64 locator sits just before the EOCD
  if (cdOffset === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20;
    if (loc >= 0 && u32(tail, loc) === 0x07064b50) {
      const z64off = Number(new DataView(tail.buffer, tail.byteOffset + loc + 8, 8).getBigUint64(0, true));
      const z = await src.read(z64off, z64off + 56);
      const dv = new DataView(z.buffer, z.byteOffset);
      count = Number(dv.getBigUint64(32, true)); cdSize = Number(dv.getBigUint64(40, true)); cdOffset = Number(dv.getBigUint64(48, true));
    }
  }
  const cd = await src.read(cdOffset, cdOffset + cdSize);
  const entries = [];
  for (let p = 0, n = 0; n < count && p + 46 <= cd.length; n++) {
    if (u32(cd, p) !== 0x02014b50) break;
    const flags = u16(cd, p + 8), method = u16(cd, p + 10);
    let csize = u32(cd, p + 20), usize = u32(cd, p + 24), local = u32(cd, p + 42);
    const nameLen = u16(cd, p + 28), extraLen = u16(cd, p + 30), commentLen = u16(cd, p + 32);
    const name = decodeName(cd.subarray(p + 46, p + 46 + nameLen), flags & 0x800);
    // ZIP64 extra field for big entries
    let e = p + 46 + nameLen; const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = u16(cd, e), len = u16(cd, e + 2);
      if (id === 0x0001) {
        const dv = new DataView(cd.buffer, cd.byteOffset + e + 4, len); let o = 0;
        if (usize === 0xffffffff) { usize = Number(dv.getBigUint64(o, true)); o += 8; }
        if (csize === 0xffffffff) { csize = Number(dv.getBigUint64(o, true)); o += 8; }
        if (local === 0xffffffff) { local = Number(dv.getBigUint64(o, true)); }
      }
      e += 4 + len;
    }
    if (!name.endsWith('/')) entries.push({ name, size: usize, csize, method, local, encrypted: !!(flags & 1) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export async function readZipEntry(src, entry) {
  if (entry.encrypted) throw new Error('This file is password-protected');
  const head = await src.read(entry.local, entry.local + 30);
  if (u32(head, 0) !== 0x04034b50) throw new Error('Damaged zip entry');
  const start = entry.local + 30 + u16(head, 26) + u16(head, 28);
  const raw = await src.read(start, start + entry.csize);
  if (entry.method === 0) return raw;
  if (entry.method !== 8) throw new Error('Unsupported zip compression (method ' + entry.method + ')');
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
