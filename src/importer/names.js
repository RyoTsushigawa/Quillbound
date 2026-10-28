// File-name understanding: split names into tokens, pull out "variant" facts
// (version, print style, DM/player map, grid, size...) and leave the identity behind.

const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'in', 'with', 'for', 'to', 'at', 'on', 'der', 'die', 'das', 'und', 'von', 'im', 'mit', 'des', 'den']);

// Words that describe what a file is, not which adventure it belongs to.
export const KIND_WORDS = {
  cover: ['cover', 'umschlag', 'titelbild'],
  maps: ['map', 'maps', 'karte', 'karten', 'snip', 'battlemap', 'battlemaps'],
  cards: ['cards', 'card', 'combat', 'karteikarten'],
  handouts: ['handout', 'handouts', 'bilddateien', 'brief', 'telegramm', 'abschiedsbrief'],
  screen: ['screen', 'sl-schirm'],
  supplement: ['subclasses', 'subclass', 'supplement', 'feats', 'races', 'spells'],
  legal: ['legal', 'license', 'impressum'],
  template: ['fillable', 'blank', 'template'],
  image: ['image', 'img', 'bild', 'art', 'artwork']
};
const CONTAINER = new Set(['maps', 'map', 'cards', 'card', 'combat', 'cover', 'image', 'img', 'bilddateien', 'handouts', 'karten', 'battlemaps']);
const KIND_OF = new Map(Object.entries(KIND_WORDS).flatMap(([k, ws]) => ws.map(w => [w, k])));

// Words that never identify a product on their own.
const GENERIC = new Set(['adventure', 'abenteuer', 'pdf', 'item', 'items', 'monster', 'monsters', 'spell', 'spellcaster', 'pc', 'npc', 'legendary',
  'prefilled', 'expansion', 'pack', 'combined', 'combinded', 'srd', 'dl', 'download', 'downloadversion', 'digital', 'pdf', 'labeled', 'labelled', 'vtt', 'version',
  'area', 'areas', 'part', 'chapter', 'per', 'day', 'slots', 'glow', 'letters', 'w', 'full', 'deluxe', 'edition']);

export const SYSTEMS = [
  { id: 'coc', name: 'Call of Cthulhu', words: ['cthulhu', 'coc', 'chaosium'] },
  { id: 'pf2', name: 'Pathfinder 2e', words: ['pathfinder', 'pf2e'] },
  { id: 'dsa', name: 'Das Schwarze Auge', words: ['dsa', 'aventurien'] },
  { id: '5e', name: 'D&D 5e', words: ['5e', 'dnd', 'd&d', '5th'] }
];
const SYSTEM_OF = new Map(SYSTEMS.flatMap(s => s.words.map(w => [w, s.id])));

const GERMAN = new Set(['karte', 'karten', 'spieler', 'bilddateien', 'abschiedsbrief', 'telegramm', 'familienbande', 'abenteuer', 'downloadversion', 'und', 'der', 'die', 'das', 'handouts']);

export function splitCamel(s) {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z]{3,})(of|and|the)(?= [A-Z])/g, '$1 $2'); // "Madhouseof Tashas" -> "Madhouse of Tashas"
}

export function baseName(path) {
  const name = path.split(/[\\/]/).pop();
  const dot = name.lastIndexOf('.');
  return { name, stem: dot > 0 ? name.slice(0, dot) : name, ext: dot > 0 ? name.slice(dot + 1).toLowerCase() : '' };
}

// Remove store/order id prefixes like "3019816-902874-".
export function stripIds(stem) {
  return stem.replace(/^(?:\d{5,}[-_ ]+)+/, '').replace(/[-_ ]+\d{6,}$/, '');
}

export function normToken(t) {
  return t.toLowerCase().replace(/[’'`´]/g, '').replace(/[^a-z0-9äöüß&.-]/g, '');
}
export function stem(t) {
  if (t.length > 4 && /s$/.test(t) && !/ss$/.test(t)) return t.slice(0, -1);
  return t;
}

// Damerau-Levenshtein distance capped at 2 (typos like "Happpy", "Iksh", "Tinger").
export function nearlySame(a, b) {
  if (a === b) return true;
  const sa = stem(a), sb = stem(b);
  if (sa === sb) return true;
  if (Math.min(a.length, b.length) < 4 || /\d/.test(a + b)) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length] <= 1;
}

// Pull variant facts out of a name. Returns { tags, rest } where rest is the remaining text.
export function variantTags(text, { image = false } = {}) {
  const tags = {};
  let s = ' ' + splitCamel(text).replace(/[_]+/g, ' ')
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1~$2')       // keep ranges like "1 - 6"
    .replace(/-/g, ' ') + ' ';
  if (image) s = s.replace(/\s(pc)(?=\s)/gi, ' players ');
  const take = (re, fn) => { s = s.replace(re, (...m) => { fn(...m); return ' '; }); };

  // grid size: "39x62", "40 high x 30 wide", "32 wide x 39 high"
  take(/\s(\d{1,3})\s*(wide|high|w|h)?\s*x\s*(\d{1,3})\s*(wide|high|w|h)?(?=\s)/i, (m, a, ua, b, ub) => {
    let w = +a, h = +b;
    if (/^h/i.test(ua || '') || /^w/i.test(ub || '')) { w = +b; h = +a; }
    tags.gridSize = `${w}×${h}`;
  });
  take(/\s\(([^)]+)\)/g, (m, inner) => { tags.state = (tags.state ? tags.state + ', ' : '') + inner.trim(); });
  take(/\s(?:v(?:er(?:sion)?)?[ .]?)(\d+(?:[.~]\d+)*)(?=\s)/gi, (m, v) => { tags.version = v.replace('~', '.'); });
  take(/\s(print(?:er)?[ -]?friendly|pf|no[ -]?back(?:ground)?|ink[ -]?friendly|druckfreundlich)(?=\s)/gi, () => { tags.print = 'print-friendly'; });
  take(/\s(colou?r|farbe|farbig)(?=\s)/gi, () => { tags.print = tags.print || 'color'; });
  take(/\s(condensed|compact|kompakt)(?=\s)/gi, () => { tags.edition = 'condensed'; });
  // "PC" means a player map only on images ("Area 7-PC.jpg", handled above); on a PDF it is "PC Cards", the heroes' cards.
  take(/\s(no[ -]?tags?|unlabell?ed|unkeyed|clean|spieler|players?)(?=\s)/gi, () => { tags.audience = 'player'; });
  take(/\s(full[ -]?tags|with[ -]?tags|tags|labell?ed|keyed|dm|gm|sl)(?=\s)/gi, () => { tags.audience = tags.audience || 'dm'; });
  take(/\s(gridless|no[ -]?grid)(?=\s)/gi, () => { tags.grid = false; });
  take(/\s(grid)(?=\s)/gi, () => { tags.grid = true; });
  take(/\s(vtt)(?=\s)/gi, () => { tags.vtt = true; tags.audience = tags.audience || 'player'; });
  if (image) take(/\s(bright|dark|night|day|nacht)(?=\s)/gi, (m, w) => { tags.light = w.toLowerCase(); });
  take(/\s(dl[ -]?version|downloadversion|download)(?=\s)/gi, () => { });
  return { tags, rest: s.replace(/~/g, '-').replace(/\s+/g, ' ').trim() };
}
const IMAGE_EXT = /^(jpe?g|png|tiff?|webp|gif|bmp)$/;

// Tokens of a name, with ranges like "1 - 6" kept together.
export function tokens(text) {
  const s = splitCamel(text)
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1~$2')
    .replace(/[_\-–—,;:+()[\]{}!?]/g, ' ')
    .replace(/~/g, '-');
  return s.split(/\s+/).map(normToken).filter(Boolean);
}

// Analyse one path (folders + file name) into the facts the library needs.
export function analyseName(path) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  const { stem: rawStem, ext } = baseName(path);
  const clean = stripIds(rawStem);
  const { tags, rest } = variantTags(clean, { image: IMAGE_EXT.test(ext) });
  const toks = tokens(rest);
  const kinds = new Set();
  let system = null, german = 0;
  const folderToks = parts.slice(0, -1).flatMap(p => tokens(stripIds(p)));
  for (const t of [...toks, ...folderToks]) {
    if (KIND_OF.has(t)) kinds.add(KIND_OF.get(t));
    if (SYSTEM_OF.has(t)) system = system || SYSTEM_OF.get(t);
    if (GERMAN.has(t)) german++;
  }
  const folderTags = variantTags(parts.slice(0, -1).map(stripIds).join(' ')).tags;
  for (const k of ['print', 'audience', 'vtt']) if (tags[k] === undefined && folderTags[k] !== undefined) tags[k] = folderTags[k];
  // only container words ("Maps", "Cards") are dropped; words like "Telegramm" or "Karte" tell files apart
  const identity = toks.filter(t => !STOP.has(t) && !CONTAINER.has(t) && !SYSTEM_OF.has(t));
  return { path, ext, display: clean.replace(/[_]+/g, ' ').trim(), tags, tokens: toks, identity, kinds: [...kinds], system, german };
}

// Key used to group files into products: distinctive words only.
export function productKey(text) {
  const { rest } = variantTags(stripIds(text));
  return tokens(rest).filter(t => !STOP.has(t) && !KIND_OF.has(t) && !SYSTEM_OF.has(t) && !/^\d+$/.test(t)).map(stem);
}
export const isGeneric = t => GENERIC.has(t) || GENERIC.has(t + 's');

// Do two product keys belong together?
export function keysMatch(a, b) {
  if (!a.length || !b.length) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const distinctive = short.filter(t => !isGeneric(t));
  if (!distinctive.length) return short.length === long.length && short.every((t, i) => nearlySame(t, long[i]));
  const inLong = t => long.some(u => nearlySame(t, u) || (t.length >= 5 && u.startsWith(t)) || (u.length >= 5 && t.startsWith(u)));
  if (distinctive.every(inLong) && short.filter(t => !isGeneric(t)).length >= 1) {
    // a single short distinctive word must be reasonably specific
    return distinctive.length >= 2 || distinctive[0].length >= 5;
  }
  let lead = 0;
  while (lead < short.length && nearlySame(short[lead], long[lead])) lead++;
  return lead >= 2;
}
