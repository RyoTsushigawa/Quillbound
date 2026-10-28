// Browser side of the importer: collects dropped/picked files (folders, zips, PDFs, images),
// runs the library scanner, compares book versions and reads books + combat cards.
// File handles live only in memory; nothing is uploaded anywhere.
import { scanLibrary, KIND_LABEL } from '../importer/library.js';
import { listZip, readZipEntry, fromBlob } from '../importer/zipdir.js';
import { extractPdf } from '../importer/pdftext.js';
import { readAdventure, readCards, textQuality } from '../importer/reader.js';
import { readCharacterOptions, mergeCharacterOptions } from '../importer/character-options.js';
import { compareBookVersions } from '../importer/versions.js';
export { findConnections, suggestOrder, bridgeIdeas } from '../importer/campaign.js';

const normName = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const PDFJS = './vendor/pdf.min.js';
const PDFW = './vendor/pdf.worker.min.js';
const loadScript = src => new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('Could not load the PDF reader. Check your internet connection once; after that it is cached.')); document.head.appendChild(s); });
async function pdfjs() {
  if (!window.pdfjsLib) await loadScript(PDFJS);
  if (!window.pdfjsWorker) await loadScript(PDFW); // runs pdf.js on the page itself; no separate worker file needed
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFW;
  return window.pdfjsLib;
}

const RT = { entries: [], products: [], scanned: null, urls: new Map() };
const IMG_OK = /\.(jpe?g|png|webp|gif|bmp)$/i;

async function addFile(file, path, rootLen) {
  if (/\.zip$/i.test(file.name)) {
    const src = fromBlob(file);
    try {
      for (const e of await listZip(src)) RT.entries.push({ path: path + '/' + e.name, size: e.size, inZip: path, rootLen, read: () => readZipEntry(src, e) });
    } catch (err) { RT.entries.push({ path, size: file.size, rootLen, error: err.message, read: async () => new Uint8Array(await file.arrayBuffer()) }); }
  }
  RT.entries.push({ path, size: file.size, rootLen, read: async () => new Uint8Array(await file.arrayBuffer()), blob: file });
}

// <input type="file" webkitdirectory> or plain multi-file input
export async function addFileList(files) {
  for (const f of files) {
    const rel = f.webkitRelativePath || f.name;
    if (!RT.entries.some(e => e.path === rel && e.size === f.size)) await addFile(f, rel, f.webkitRelativePath ? 1 : 0);
  }
  return scan();
}

// drag and drop, including whole folders
export async function addDropped(dataTransfer) {
  const items = [...(dataTransfer.items || [])].map(i => i.webkitGetAsEntry ? i.webkitGetAsEntry() : null).filter(Boolean);
  if (!items.length) return addFileList(dataTransfer.files);
  const fileOf = entry => new Promise((ok, bad) => entry.file(ok, bad));
  const readDir = dir => new Promise((ok, bad) => { const r = dir.createReader(); const all = []; const next = () => r.readEntries(batch => { if (!batch.length) ok(all); else { all.push(...batch); next(); } }, bad); next(); });
  const walk = async (entry, rootLen) => {
    if (entry.isFile) await addFile(await fileOf(entry), entry.fullPath.replace(/^\//, ''), rootLen);
    else for (const child of await readDir(entry)) await walk(child, rootLen);
  };
  for (const it of items) await walk(it, it.isDirectory ? 1 : 0);
  return scan();
}

export function clear() { for (const u of RT.urls.values()) URL.revokeObjectURL(u); RT.urls.clear(); RT.entries = []; RT.products = []; RT.scanned = null; }

const kindsOf = p => p.items.reduce((m, it) => (m[it.kind] = (m[it.kind] || 0) + 1, m), {});

export async function scan() {
  const res = await scanLibrary(RT.entries);
  RT.products = res.products;
  RT.scanned = res;
  return summary();
}

// Plain data for the UI (no functions, safe to keep in app state)
export function summary() {
  if (!RT.scanned) return null;
  return {
    files: RT.entries.length,
    mirrors: RT.scanned.mirrors,
    products: RT.products.map((p, i) => ({
      i, name: p.name, type: p.type, system: p.system, language: p.language, unnamed: p.unnamed,
      counts: p.counts, items: kindsOf(p), duplicates: p.duplicates, sources: p.units.length,
      groups: p.items.map(it => ({
        kind: it.kind, kindLabel: KIND_LABEL[it.kind], label: it.label, primary: it.primary,
        files: it.files.map(f => ({ path: f.path, name: f.path.split('/').pop(), size: f.size, variant: f.variant, tags: f.tags, copyOf: f.duplicateOf ? f.duplicateOf.split('/').pop() : '', inZip: f.inZip ? f.inZip.split('/').pop() : '', previewable: IMG_OK.test(f.path) }))
      }))
    }))
  };
}

const fileByPath = (pi, path) => RT.products[pi]?.files.find(f => f.path === path);

export async function previewUrl(pi, path) {
  if (RT.urls.has(path)) return RT.urls.get(path);
  const f = fileByPath(pi, path);
  if (!f) throw new Error('Drop the folder again: files are only kept while this page is open.');
  const blob = f.blob || new Blob([await f.read()]);
  const url = URL.createObjectURL(blob);
  RT.urls.set(path, url);
  return url;
}

// The image itself, for sending to the player screen
export async function blobFor(pi, path) {
  const f = fileByPath(pi, path);
  if (!f) throw new Error('Drop the folder again: files are only kept while this page is open.');
  return { blob: f.blob || new Blob([await f.read()]), name: path.split('/').pop(), dm: f.tags.audience === 'dm' };
}

export async function compareVersions(pi, itemIndex) {
  const it = RT.products[pi].items[itemIndex];
  const files = it.files.filter(f => !f.duplicateOf && /\.pdf$/i.test(f.path));
  if (files.length < 2) return [];
  return compareBookVersions(await pdfjs(), files);
}

// Read the adventure: the main book (smallest same-text version is fastest) plus every combat-card sheet.
export async function readProduct(pi, onProgress = () => { }) {
  const p = RT.products[pi];
  const lib = await pdfjs();
  const bookItems = p.items.filter(it => it.kind === 'book');
  const bookItem = bookItems[0];
  if (!bookItem) throw new Error('This product has no adventure book to read.');
  // try the recommended version first; if its text is garbled (font without a character map), try the next one
  const books = bookItems.flatMap(it => it.files).filter(f => !f.duplicateOf);
  books.sort((a, b) => (a.tags.edition === 'condensed') - (b.tags.edition === 'condensed'));
  let doc = null, pick = null, best = Infinity;
  for (const f of books.slice(0, 3)) {
    onProgress(`Reading ${f.path.split('/').pop()}…`);
    const d = await extractPdf(lib, await f.read(), { onPage: (n, total) => onProgress(`Reading ${f.path.split('/').pop()}: page ${n} of ${total}`) });
    const q = textQuality(d).garbled;
    if (q < best) { best = q; doc = d; pick = f; }
    if (q < 0.02) break;
    onProgress(`${Math.round(q * 100)}% of the text in ${f.path.split('/').pop()} is unreadable, trying another version…`);
  }
  if (!doc) throw new Error('No readable adventure version found.');
  const result = readAdventure(doc);
  result.characterOptions = [];
  result.importWarnings = [];
  for (const item of p.items.filter(it => it.kind === 'supplement')) {
    const f = item.files.find(f => !f.duplicateOf && /\.pdf$/i.test(f.path));
    if (!f) continue;
    try {
      onProgress('Reading character options: ' + f.path.split('/').pop());
      const extra = await extractPdf(lib, await f.read());
      const options = readCharacterOptions(extra, f.path.split('/').pop());
      mergeCharacterOptions(result.characterOptions, options);
      if (!options.length) result.importWarnings.push('No character options recognized in ' + f.path.split('/').pop() + '. Review that supplement separately.');
      const refs = readAdventure(extra);
      for (const x of refs.items) if (!result.items.some(y => normName(y.name) === normName(x.name))) result.items.push({...x, source:f.path.split('/').pop()});
    } catch (e) { result.importWarnings.push('Could not read supplement: ' + f.path.split('/').pop() + ': ' + e.message); }
  }
  result.source = pick.path.split('/').pop();
  result.unreadable = Math.round(best * 100);

  // combat cards: monster names (use colour sheets, skip PC/item/legendary templates)
  const cardFiles = p.items.filter(it => it.kind === 'cards' && !/\bpc\b|item|legendary|spell/i.test(it.label)).map(it => it.files.find(f => !f.duplicateOf && f.tags.print !== 'print-friendly') || it.files[0]);
  const cardNames = [];
  for (const f of cardFiles) {
    onProgress(`Reading combat cards: ${f.path.split('/').pop()}`);
    try { cardNames.push(...readCards(await extractPdf(lib, await f.read())).map(c => ({ ...c, file: f.path.split('/').pop() }))); } catch { /* unreadable card sheet */ }
  }
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
  for (const c of cardNames) {
    const hit = result.enemies.find(e => norm(e.name).startsWith(norm(c.name)) || norm(c.name).startsWith(norm(e.name.split(',')[0])));
    if (hit) { hit.card = c.file; continue; }
    if (result.enemies.some(e => norm(e.name) === norm(c.name))) continue;
    // A standard monster gets its numbers from SRD 5.1; anything else waits for the DM ("Add numbers").
    const card = { id: 'card-' + norm(c.name), name: c.name, kind: '', type: '', fromCard: true, card: c.file, tier: 'Standard', slots: 2, breakAt: 1, breaking: 'Flees or surrenders once hurt', goal: 'Defend its ground', moves: ['Attack'], page: null, why: 'combat card "' + c.file + '"', include: true };
    result.enemies.push(Object.assign(card, globalThis.QBAttacks?.fillFromSrd?.(card) || {}));
  }
  // Book stat blocks that are missing a number (no attack line read, say) are completed from SRD 5.1 by name.
  for (const e of result.enemies) if (!e.fromCard) Object.assign(e, globalThis.QBAttacks?.fillFromSrd?.(e) || {});

  // maps from the library, linked to the beats and areas that mention them
  const maps = p.items.filter(it => it.kind === 'map').map(it => {
    const label = it.label.replace(/\b(labell?ed|vtt)\b/gi, '').trim();
    const re = new RegExp(label.split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.{0,20}'), 'i');
    const usedIn = label ? result.beats.filter(b => re.test([b.title, b.summary, ...(b.scenes || [])].join(' '))).map(b => b.title) : [];
    const files = it.files.filter(f => !f.duplicateOf);
    return { id: 'map-' + norm(it.label), name: it.label, variants: files.map(f => ({ path: f.path, name: f.path.split('/').pop(), variant: f.variant, tags: f.tags })), usedIn, why: 'map files in the adventure folder', include: true };
  });
  result.libraryMaps = maps;
  result.product = p.name;
  return result;
}
