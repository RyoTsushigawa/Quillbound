// Library scanner: takes a flat list of files (from folders and zips) and works out
// which adventure/product each belongs to, what each file is, and which files are
// versions or copies of the same thing.
//
// Input entries: { path, size, inZip?: 'archive.zip', read?: () => Promise<Uint8Array> }
// `path` is the logical path below the scanned root, e.g. "Fires_of_Iskh_V5.zip/Fires of Iskh V5/Maps/Caldera.png".

import { analyseName, productKey, keysMatch, stripIds, splitCamel, variantTags, nearlySame, stem, isGeneric } from './names.js';

const IMAGE = new Set(['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'gif', 'bmp']);
const IGNORE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini|node_modules|\.git)(\/|$)|(^|\/)\._/i;

export const KIND_LABEL = {
  book: 'Adventure book', cards: 'Combat cards', map: 'Maps', cover: 'Cover art', handout: 'Handouts', screen: 'DM screen',
  supplement: 'Supplement', legal: 'Legal notice', template: 'Blank templates', image: 'Other images', other: 'Other files'
};

function fileKind(a) {
  const own = new Set(a.kinds);
  const isImg = IMAGE.has(a.ext);
  if (a.ext === 'pdf') {
    for (const k of ['legal', 'template', 'cards', 'supplement', 'handouts', 'screen', 'cover']) if (own.has(k)) return k === 'handouts' ? 'handout' : k;
    if (own.has('maps')) return 'map';
    return 'book';
  }
  if (isImg) {
    // the file's own words beat the folder's words ("Karte" inside a "Handouts" folder is a handout map)
    const fileWords = analyseName(a.path.split('/').pop()).kinds;
    const pick = fileWords.length ? new Set(fileWords) : own;
    if (pick.has('cover')) return 'cover';
    if (pick.has('handouts')) return 'handout';
    if (pick.has('maps') && own.has('handouts')) return 'handout';
    if (pick.has('maps')) return 'map';
    if (pick.has('screen')) return 'screen';
    if (a.tags.gridSize || a.tags.audience || a.tags.grid !== undefined || a.tags.vtt) return 'map';
    if (own.has('maps')) return 'map';
    return 'image';
  }
  return 'other';
}

// The scanned root's children are the starting "units". A folder whose name says nothing
// about a product ("Adventures", "New folder") is opened up and its children used instead.
// Each entry's `rootLen` says how many leading path parts are the dropped folder itself (0 for a dropped file or zip).
// A zip is always one unit. A folder is opened up only if its name is generic and some
// folder directly inside it has a specific name (so "A", "B", "Color" folders stay together).
function buildUnits(entries) {
  const units = new Map();
  const distinctive = name => productKey(name.replace(/\.zip$/i, '')).some(t => !isGeneric(t) && t.length > 1);
  const childDirs = new Map();
  for (const e of entries) {
    const parts = e.path.split('/');
    for (let d = 1; d < parts.length - 1; d++) {
      const parent = parts.slice(0, d).join('/');
      if (!childDirs.has(parent)) childDirs.set(parent, new Set());
      childDirs.get(parent).add(parts[d]);
    }
  }
  const unitOf = (path, rootLen = 0) => {
    const parts = path.split('/');
    let depth = rootLen + 1;
    while (depth < parts.length) {
      const name = parts.slice(0, depth).join('/');
      const last = parts[depth - 1];
      if (/\.zip$/i.test(last) || distinctive(last)) return name;
      const kids = [...(childDirs.get(name) || [])];
      if (!kids.some(k => distinctive(k))) return name;
      depth++;
    }
    return path;
  };
  for (const e of entries) {
    const u = unitOf(e.path, e.rootLen);
    if (!units.has(u)) units.set(u, { id: u, name: u.split('/').pop(), files: [] });
    units.get(u).files.push(e);
  }
  return [...units.values()];
}

// An extracted folder next to its zip ("Maps/" + "Maps.zip") is the same content twice.
function findMirrors(units) {
  const byName = new Map(units.filter(u => !/\.zip$/i.test(u.name)).map(u => [u.id.replace(/\.zip$/i, '').toLowerCase(), u]));
  const mirrors = [];
  for (const u of units) {
    if (!/\.zip$/i.test(u.name)) continue;
    const twin = byName.get(u.id.replace(/\.zip$/i, '').toLowerCase());
    if (!twin || twin === u) continue;
    const rel = (f, unit) => f.path.slice(unit.id.length + 1).toLowerCase();
    const zipSet = new Map(u.files.map(f => [rel(f, u), f.size]));
    let same = 0;
    for (const f of twin.files) if (zipSet.get(rel(f, twin)) === f.size) same++;
    if (same && same >= 0.9 * Math.min(twin.files.length, u.files.length)) mirrors.push({ zip: u, folder: twin, same });
  }
  return mirrors;
}

function titleCase(s) {
  return s.replace(/\s+/g, ' ').trim().split(' ').map((w, i) => {
    if (i > 0 && /^(of|the|and|in|a|an|at|on|to|der|die|das|und|von)$/i.test(w)) return w.toLowerCase();
    if (/^[A-Z0-9]{2,}$/.test(w) && w.length <= 3) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function cleanTitle(text) {
  const { rest } = variantTags(stripIds(text).replace(/\.(zip|pdf)$/i, ''));
  return titleCase(splitCamel(rest).replace(/[_]+/g, ' ')
    .replace(/\b(adventure|abenteuer|maps?|karten?|cover|image|bilddateien|handouts?)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim());
}

// Union-find over unit keys.
function cluster(units) {
  const parent = units.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
    if (keysMatch(units[i].key, units[j].key)) parent[find(i)] = find(j);
  }
  const groups = new Map();
  units.forEach((u, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(u); });
  return [...groups.values()];
}

function variantLabel(t) {
  const out = [];
  if (t.audience === 'dm') out.push('DM version');
  if (t.audience === 'player') out.push('Player version');
  if (t.vtt) out.push('VTT');
  if (t.gridSize) out.push(t.gridSize + ' squares');
  if (t.grid === true) out.push('with grid');
  if (t.grid === false) out.push('no grid');
  if (t.light) out.push(t.light);
  if (t.state) out.push(t.state);
  if (t.edition) out.push(t.edition);
  if (t.print) out.push(t.print === 'color' ? 'color' : 'print-friendly');
  if (t.version) out.push('v' + t.version);
  if (t.thumb) out.push('small preview');
  return out.join(' · ');
}

const vnum = v => (v || '0').split('.').reduce((s, p, i) => s + (+p || 0) / Math.pow(100, i), 0);

// Pick the file to show first among versions of one thing.
function rank(kind, f) {
  const t = f.tags;
  let s = 0;
  if (f.duplicateOf) s -= 1000;
  if (t.thumb) s -= 50;
  s += vnum(t.version) * 10;
  if (kind === 'book') { if (t.edition === 'condensed') s -= 100; if (t.print === 'print-friendly') s -= 1; }
  if (kind === 'cards' && t.print === 'print-friendly') s -= 1;
  if (kind === 'map') { if (t.audience === 'dm') s += 3; if (t.light) s -= 1; if (t.vtt) s -= 0.5; }
  return s;
}

function productType(files) {
  const n = k => files.filter(f => f.kind === k && !f.duplicateOf).length;
  if (n('book')) return 'adventure';
  if (n('cards') + n('template') > 0) return 'cards';
  if (n('supplement')) return 'supplement';
  if (n('map')) return 'maps';
  if (n('handout')) return 'handouts';
  return 'other';
}

async function sampleHash(read, size) {
  const bytes = await read();
  const parts = [bytes.subarray(0, 65536), bytes.subarray(Math.max(0, (size >> 1) - 32768), (size >> 1) + 32768), bytes.subarray(Math.max(0, size - 65536))];
  let h = 2166136261 >>> 0;
  for (const p of parts) for (let i = 0; i < p.length; i++) { h ^= p[i]; h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16) + ':' + size;
}

export async function scanLibrary(rawEntries, { hash = true } = {}) {
  const entries = rawEntries.filter(e => !IGNORE.test(e.path) && e.size > 0 && !/\.zip$/i.test(e.path));
  let units = buildUnits(entries);

  // Mirrors: keep the extracted folder (faster to read), mark the zip copy as a duplicate.
  const mirrors = findMirrors(units);
  const mirrorOf = new Map();
  for (const m of mirrors) {
    const rel = (f, unit) => f.path.slice(unit.id.length + 1).toLowerCase();
    const folderFiles = new Map(m.folder.files.map(f => [rel(f, m.folder) + '|' + f.size, f]));
    for (const f of m.zip.files) { const twin = folderFiles.get(rel(f, m.zip) + '|' + f.size); if (twin) mirrorOf.set(f, twin); }
  }

  for (const u of units) u.key = productKey(u.name.replace(/\.zip$/i, ''));
  // Units with no usable name (e.g. "28280.pdf") are kept apart for now; content can place them later.
  // Generic-only names ("Item Cards") still stand alone; only nameless ones ("28280.pdf") are "unnamed".
  const named = units.filter(u => u.key.some(t => !isGeneric(t)));
  const unnamed = units.filter(u => !u.key.some(t => !isGeneric(t)));
  for (const u of unnamed) u.nameless = !u.key.length;
  const groups = cluster(named);
  for (const u of unnamed) groups.push([u]);

  const products = [];
  for (const g of groups) {
    const files = g.flatMap(u => u.files.map(f => ({ ...f, unit: u.id, ...analyseName(f.path.slice(u.id.length - u.name.length)) })));
    for (const f of files) {
      f.kind = fileKind(f);
      if (IMAGE.has(f.ext) && f.size < 150000) f.tags.thumb = true;
      const twin = [...mirrorOf.entries()].find(([z]) => z.path === f.path);
      if (twin && hash && f.read && twin[1].read) {
        try { const [a,b] = await Promise.all([f.read(),twin[1].read()]);
          if (a.length === b.length && a.every((v,k) => v === b[k])) f.duplicateOf = twin[1].path;
        } catch { /* Keep an unverified copy available. */ }
      }
    }
    // product name: from the main book if there is one, else from the most specific unit name
    const books = files.filter(f => f.kind === 'book' && !f.duplicateOf);
    const nameSrc = books.length ? books.sort((a, b) => a.path.length - b.path.length)[0].display : g.map(u => u.name).sort((a, b) => b.length - a.length)[0];
    const name = cleanTitle(nameSrc) || cleanTitle(g[0].name) || g[0].name;
    const pkey = productKey(name);

    // exact copies under different names/places (same size, same sampled bytes)
    const bySize = new Map();
    for (const f of files) { if (f.duplicateOf || !['pdf', ...IMAGE].includes(f.ext)) continue; const k = f.size; if (!bySize.has(k)) bySize.set(k, []); bySize.get(k).push(f); }
    for (const same of bySize.values()) {
      if (same.length < 2) continue;
      if (hash) for (const f of same) { try { f.hash = f.read ? await sampleHash(f.read, f.size) : null; } catch { f.hash = null; } }
      same.sort((a, b) => (a.inZip ? 1 : 0) - (b.inZip ? 1 : 0) || a.path.length - b.path.length);
      for (let i = 1; i < same.length; i++) {
        const orig = same.find((o, j) => j < i && !o.duplicateOf && (!hash || (o.hash && o.hash === same[i].hash)));
        if (orig && hash && orig.read && same[i].read) {
          const [a,b] = await Promise.all([orig.read(),same[i].read()]);
          if (a.length === b.length && a.every((v,k) => v === b[k])) same[i].duplicateOf = orig.path;
        }
      }
    }

    // identity of each file inside the product: what's left after removing product words
    const inProduct = t => pkey.some(p => nearlySame(stem(t), p) || (p.length >= 5 && t.startsWith(p)));
    for (const f of files) f.ident = f.identity.filter(t => !inProduct(t) || /^\d/.test(t)).map(stem);
    // map states written as "X" / "No X" (e.g. "Upper Halls Lava" / "Upper Halls No Lava")
    const maps = files.filter(f => f.kind === 'map');
    const stateWords = new Set();
    for (const f of maps) f.ident.forEach((t, i) => { if (t === 'no' && f.ident[i + 1]) stateWords.add(f.ident[i + 1]); });
    for (const f of maps) {
      for (const w of stateWords) if (f.ident.includes(w)) {
        const neg = f.ident.includes('no');
        f.tags.state = (f.tags.state ? f.tags.state + ', ' : '') + (neg ? 'no ' : '') + w;
        f.ident = f.ident.filter(t => t !== w && t !== 'no');
      }
    }

    // group into items: same kind + same identity words (order-insensitive)
    const items = new Map();
    for (const f of files) {
      if (f.kind === 'other') continue;
      const idKey = f.kind + ':' + (f.kind === 'book' ? '' : [...new Set(f.ident)].sort().join(' '));
      if (!items.has(idKey)) items.set(idKey, { kind: f.kind, key: idKey, files: [] });
      items.get(idKey).files.push(f);
    }
    // merge items whose names differ only by a typo ("Combinded" / "Combined", "Iksh" / "Iskh")
    const list = [...items.values()];
    const words = it => [...new Set(it.key.split(':')[1].split(' ').filter(Boolean))];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (!a || !b || a.kind !== b.kind) continue;
      const wa = words(a), wb = words(b);
      if (wa.length && wa.length === wb.length && wa.every(t => wb.some(u => nearlySame(t, u)))) { a.files.push(...b.files); list[j] = null; }
    }
    items.clear();
    for (const it of list) if (it) items.set(it.key, it);
    const itemList = [...items.values()].map(it => {
      it.files.sort((a, b) => rank(it.kind, b) - rank(it.kind, a));
      const words = it.key.split(':')[1];
      const first = it.files.find(f => !f.duplicateOf) || it.files[0];
      it.label = it.kind === 'book' ? (words ? titleCase(words) : 'Adventure') : titleCase(variantTags(first.display).rest.replace(/[-_]+/g, ' ')) || (it.kind === 'map' ? 'Main map' : KIND_LABEL[it.kind]);
      it.files.forEach(f => { f.variant = variantLabel(f.tags) || (f.duplicateOf ? '' : 'original'); });
      it.primary = first.path;
      return it;
    }).sort((a, b) => Object.keys(KIND_LABEL).indexOf(a.kind) - Object.keys(KIND_LABEL).indexOf(b.kind) || a.label.localeCompare(b.label));

    const sys = files.map(f => f.system).find(Boolean);
    const german = files.reduce((s, f) => s + f.german, 0);
    products.push({
      name, key: pkey, units: g.map(u => u.id), system: sys || null, language: german >= 2 ? 'de' : null,
      files, items: itemList,
      counts: Object.fromEntries(Object.keys(KIND_LABEL).map(k => [k, files.filter(f => f.kind === k && !f.duplicateOf).length]).filter(([, n]) => n)),
      duplicates: files.filter(f => f.duplicateOf).length,
      unnamed: g.length === 1 && !!g[0].nameless,
      type: productType(files)
    });
  }
  products.sort((a, b) => (a.unnamed ? 1 : 0) - (b.unnamed ? 1 : 0) || a.name.localeCompare(b.name));
  return { products, mirrors: mirrors.map(m => ({ zip: m.zip.id, folder: m.folder.id, files: m.same })) };
}
