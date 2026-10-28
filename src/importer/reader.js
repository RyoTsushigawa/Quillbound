// Offline adventure reader: turns extracted PDF lines (see pdftext.js) into
// story beats, hooks, NPCs with roleplay notes, enemies (5e stat blocks), locations,
// items and roll tables. No network, no AI: layout statistics + patterns.
// Every extracted thing carries `page` and `why` so the user can check it.

import { roleplayTips } from './roleplay.js';
import { profileAdventure } from './campaign.js';
import '../app/attacks.js'; // sets globalThis.QBAttacks (HP, AC, attacks for HP combat)

/* ---------------- patterns ---------------- */
const SIZES = 'Tiny|Small|Medium|Large|Huge|Gargantuan';
const TYPE_RE = new RegExp(`^(?:${SIZES})(?: or (?:${SIZES}))? (?:swarm of (?:${SIZES}) )?([a-z ]+?)s?(?: \\(([^)]*)\\))?, ([a-z -]+?)(?:\\s*\\(.*\\))?$`, 'i');
const STAT_LINE = /^(armor class|hit points|speed|saving throws|skills|senses|languages|challenge|damage (?:resistances|immunities|vulnerabilities)|condition immunities|proficiency bonus|str|dex|con|int|wis|cha)\b/i;
const ACTION_HEADS = /^(actions|bonus actions|reactions|legendary actions|lair actions|mythic actions|regional effects)$/i;
const ALIGN = '(?:LG|NG|CG|LN|N|TN|CN|LE|NE|CE|U|any)';
const NPC_HEAD = new RegExp(`^([A-Z][\\w'’.-]+(?: (?:of |the |de |van |von )?[A-Z][\\w'’.-]+){0,4}),? (${ALIGN})\\b,? ?(.{0,60})$`);
const ITEM_TYPE = /^(wondrous item|weapon|armor|armour|potion|ring|rod|scroll|staff|wand|shield|ammunition)\b[^,]*,\s*(common|uncommon|rare|very rare|legendary|artifact|rarity varies)/i;
const NAMED_ITEM = /\b((?:[Pp]otion|[Ss]croll|[Rr]ing|[Ww]and|[Ss]taff|[Rr]od|[Cc]loak|[Aa]mulet|[Bb]oots|[Gg]loves|[Bb]ag|[Ss]tone|[Hh]elm|[Bb]elt|[Bb]racers|[Oo]il|[Dd]ust|[Ee]lixir)s? of (?:the )?(?:[A-Z][\w'’]+)(?:\s(?:(?:of|the|to|with|and)\s)?[A-Z][\w'’]+)*)/g;
const AREA_RE = /^(?:area|room|bereich|raum)?\s*([A-Z]?\d{1,3}[a-z]?)\s*[.:)–-]\s*(.{2,70})$/i;
const PRONOUN = /\b(he|she|him|her|his|hers|they|them|er|sie|ihm|ihn|ihr|sein|seine)\b/i;
const PERSON_CUE = /^(male|female|männlich|weiblich)\b|\b(man|woman|boy|girl|priest|priestess|merchant|mayor|captain|innkeeper|acolyte|wizard|witch|hag|knight|noble|guard|farmer|child|elder|widow|hermit|sheriff|bandit leader|smith|blacksmith|healer|sage|bard|druid|cleric|warlock|sorcerer|monk|ranger|fighter|rogue|paladin|barbarian)\b/i;
const FRONT = /^(table of contents|contents|inhalt|inhaltsverzeichnis|credits|acknowledg|art credits|impressum|legal|open game licen[cs]e|designation of|copyright|about the author|special thanks|dedication|index|ogl)/i;
const SUMMARY_HEAD = /^(synopsis|summary|adventure summary|overview|background|adventure background|übersicht|hintergrund|zusammenfassung|introduction|einleitung)\b/i;
const HOOK_HEAD = /^(adventure hooks?|hooks?|plot hooks?|rumou?rs|getting started|starting the adventure|einstieg|aufhänger|appeal to)/i;
const TREASURE_HEAD = /^(treasure|loot|rewards?|schätze|schatz|beute|belohnung)\s*:?$/i;
const THING_WORDS = /\b(chart|table|map|room|hall|gallery|advertisement|plug|picture|poster|door|gate|area|pit|chest|box|statue|altar|cave|cavern|tower|house|inn|tavern|shop|street|road|forest|river|lake|bridge|ship|deck|camp|temple|shrine|church|crypt|tomb|well|stairs?|corridor|tunnel|lobby|office|storage|closet|stage|kitchen|library|garden|courtyard|tactics|description|development|treasure|encounter|monsters?|creatures?|appendix|notes)\b/i;
const NAME_NOISE = /^(roleplaying|playing|meet|about|saving|rescuing|finding|fighting|defeating|confronting)\s+|\s+(description|tactics|roleplaying|personality|appearance|background|stats|statistics|in combat|portrait)$/i;
const ROLEPLAY_HEAD = /^(roleplaying|playing|personality of|rollenspiel(?:hinweise)?(?: für| zu)?)\s+(.+)$|^(.+?)\s+(roleplaying|personality|description|tactics)$/i;
const GROUP_WORDS = /\b(council|guild|society|order|quartet|family|gang|crew|cult|clan|tribe|company|troupe|band|circle)\b/i;
const SENTENCE_START = /^(without|with|after|before|when|if|as|in|on|at|the|this|that|although|once|while|during|inside|outside|behind|beyond|meanwhile|however|finally|suddenly|here|there|now|then|later|soon|unless|until|because|since|nach|wenn|als|während|dann|hier|dort)\b/i;
const RP_FIELDS = /^(appearance|does|secret|wants|goal|goals|motivation|personality|mannerisms?|voice|ideal|bond|flaw|fear|fears|description|roleplaying|quirk|aussehen|auftreten|geheimnis|ziel|ziele|eigenschaften|wie (?:er|sie) ist|wie (?:er|sie) wirkt|auffällig|hintergrund)\s*[.:]\s*/i;
// German RP field names mapped onto the English ones the app uses
const FIELD_ALIAS = { 'wie er ist': 'personality', 'wie sie ist': 'personality', 'wie er wirkt': 'appearance', 'wie sie wirkt': 'appearance', 'auffällig': 'does', aussehen: 'appearance', auftreten: 'does', geheimnis: 'secret', ziel: 'wants', ziele: 'wants', goal: 'wants', goals: 'wants', motivation: 'wants', fears: 'fear', mannerism: 'does', mannerisms: 'does', hintergrund: 'background', eigenschaften: 'personality' };

// sentence split that doesn't break on "St.", "Mr.", "ft." and similar
const ABBR = /\b(St|Mt|Mr|Mrs|Ms|Dr|Sr|Jr|ft|lb|lbs|vs|etc|e\.g|i\.e|ca|bzw|z\.B|Nr|gp|sp|cp)\./g;
const sentences = t => ((t || '').replace(ABBR, '$1․').match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g) || []).map(s => s.replace(/․/g, '.').trim()).filter(Boolean);
const firstSentences = (t, n = 2) => sentences(t).slice(0, n).join(' ');
const isCaps = t => /[A-Z]/.test(t) && t === t.toUpperCase() && /[A-Z]{3}/.test(t);
const titleCaseRatio = t => { const w = t.split(/\s+/).filter(x => /^[A-Za-zÄÖÜäöü]/.test(x) && !/^(of|the|and|a|an|in|on|to|at|for|der|die|das|und|von|im)$/i.test(x)); return w.length ? w.filter(x => /^[A-ZÄÖÜ]/.test(x)).length / w.length : 0; };
const prettyCaps = t => isCaps(t) ? t.toLowerCase().replace(/(^|[\s(“"'-])([a-zäöü])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Of|The|And|In|On|To|At|For|A|An)\b(?!$)/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase()) : t;
let uidN = 0;
const uid = p => p + (++uidN).toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------------- 1. clean the raw lines ---------------- */
// Some PDFs embed fonts without a character map; their text comes out as symbol soup ("*'-C&&C!!$").
const READABLE = /[A-Za-zÀ-ÿ0-9\s.,;:'"!?()\-–—’‘“”„«»/%+&…•×°½¼¾#*[\]]/g;
export const isGarbled = t => t.length > 3 && ((t.match(READABLE) || []).length / t.length < 0.75 || !/[aeiouyäöüAEIOUY]/.test(t) && /[a-z]{3}/i.test(t) && !/\d/.test(t) && t.length > 6);
export function textQuality(doc) {
  let bad = 0, total = 0;
  for (const p of doc.pages) for (const l of p.lines) { total += l.text.length; if (isGarbled(l.text)) bad += l.text.length; }
  return { garbled: total ? bad / total : 0, chars: total };
}
export function cleanDocument(doc) {
  const pages = doc.pages;
  const all = pages.flatMap(p => p.lines.map(l => ({ ...l, ph: p.height, pw: p.width })));
  const text = all.map(l => l.text).join('\n');
  const fixes = [];

  // running headers / footers: same text (ignoring numbers) near the page edge on many pages
  const sig = l => l.text.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
  const edge = l => l.y > l.ph * 0.9 || l.y < l.ph * 0.09;
  const seen = new Map();
  for (const p of pages) {
    const sigs = new Set(p.lines.filter(l => edge({ ...l, ph: p.height })).map(sig));
    for (const s of sigs) seen.set(s, (seen.get(s) || 0) + 1);
  }
  const minRepeat = Math.max(3, Math.floor(pages.length * 0.25));
  const running = new Set([...seen].filter(([s, n]) => n >= minRepeat || /^#?$|^#\s*\|?\s*$|^(page|seite)\s*#$/.test(s)).map(([s]) => s));

  // broken "fi/fl/ff" ligatures that came out as "1" or U+FFFD
  const lig1 = (text.match(/\b1(?:ind|irst|ive|ifth|ight|ill|or|rom|ew|ull|ace|ail|all|ar|ew|ix|lame|lat|loor|ly|our|ollow|ree|resh|riend)\w*/g) || []).length
    + (text.match(/[a-z]1(?:ic|ie|ul|il|ec|er|in|ly|le|lo|ou)[a-z]/g) || []).length;
  const fixLig = lig1 >= 3;
  if (fixLig) fixes.push('repaired broken "fi/fl" letters');
  const fixRepl = /[a-z ]\uFFFD[a-z]/.test(text);
  // some fonts map the ligature to "W" instead: "sacred Wlame", "inWlict", "DeWinitions"
  const fixW = (text.match(/[a-z]W[a-z]|\bWl[aeiou]/g) || []).length >= 3;
  if (fixW) fixes.push('repaired "fl/fi" letters shown as W');
  // ...or to a dot: "many-.ingered", "eye .illing", "in. luential"
  const fixDot = (text.match(/(?:^|[\s-])\.[il][a-z]{2,}|[a-z]\. [il][a-z]{3,}/g) || []).length >= 3;
  if (fixDot) fixes.push('repaired "fi/fl" letters shown as a dot');
  const sizes = all.map(l => l.size).sort((a, b) => a - b);
  const medSize = sizes[Math.floor(sizes.length / 2)] || 10;
  // Type3 fonts that space out digits: "Armor Class 1 4", "1 0 (2d6+3)"
  const spaced = (text.match(/\b(?:Armor Class|Hit Points|passive Perception|Challenge|Hit:)\s+1 \d/gi) || []).length;
  const type3 = all.filter(l => !l.font || /type3/i.test(l.font)).length / Math.max(1, all.length);
  const fixDigits = spaced >= 1 && type3 > 0.5;
  if (fixDigits) fixes.push('joined digits split by the PDF font');

  // drop caps: a single big letter; its paragraph starts just right of it and slightly above ("D" + "ie Spielrunde")
  for (const p of pages) {
    p.lines = p.lines.map(l => ({ ...l }));
    for (const cap of p.lines) {
      if (!/^[A-ZÄÖÜ]$/.test(cap.text) || cap.size < medSize * 1.8) continue;
      const target = p.lines.filter(x => x !== cap && /^[a-zäöüß]/.test(x.text) && x.x > cap.x && x.x - cap.x < cap.size * 1.6 && x.y >= cap.y - 2 && x.y - cap.y < cap.size * 1.2)
        .sort((a, b) => b.y - a.y)[0];
      if (target) { target.text = cap.text + target.text; cap.dropCap = true; }
    }
  }
  const lines = [];
  let garbledLines = 0;
  for (const p of pages) {
    let prev = null;
    for (let i = 0; i < p.lines.length; i++) {
      const l = { ...p.lines[i] };
      if (edge({ ...l, ph: p.height }) && running.has(sig(l))) continue;
      if (/^\d{1,3}$/.test(l.text) && edge({ ...l, ph: p.height })) continue;
      let t = l.text;
      if (fixLig) t = t.replace(/(?<=[a-zA-Z])1(?=[a-z])/g, 'f').replace(/(?<![\w\d.,+-])1(?=[a-z]{2,})(?!(?:st|nd|rd|th)\b)/g, 'f');
      if (fixRepl) t = t.replace(/\uFFFD/g, 'f');
      if (fixW) t = t.replace(/(?<=[a-z])W(?=[a-z])/g, 'f').replace(/\bW(?=l[aeiou])/g, 'f');
      if (fixDot) t = t.replace(/(^|[\s-])\.([il][a-z])/g, '$1f$2').replace(/(?<!\b(?:ft|lb|etc|vs|St|Mr|Dr))([a-z])\. ([il][a-z]{3,})/g, '$1f$2');
      if (l.dropCap) continue;
      if (isGarbled(t)) { garbledLines++; continue; }
      // fonts that print small caps as odd mixed case: "spurensucHe", "Die HanDlung"
      if (/[a-zäöü][A-ZÄÖÜ]/.test(t) && t.length < 60 && l.size > medSize * 1.1) t = t.split(' ').map(w => /[a-zäöü][A-ZÄÖÜ]/.test(w) || /^[a-zäöü]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w).join(' ');
      if (fixDigits) t = t.replace(/(?<![\d.])1 (?=\d)/g, '1').replace(/(\d) \)/g, '$1)');
      t = t.replace(/[‐‑]/g, '-').replace(/(\d) (st|nd|rd|th)\b/g, '$1$2').replace(/\s+/g, ' ').trim();
      // a lone bullet glyph belongs to whichever neighbouring line in its column is closer
      if (/^[•●▪■◦‣∙·]$/.test(t)) {
        const next = p.lines[i + 1];
        const dPrev = prev && prev.col === l.col ? Math.abs(prev.y - l.y) : Infinity;
        const dNext = next && next.col === l.col ? Math.abs(next.y - l.y) : Infinity;
        if (dPrev <= dNext && prev) prev.bullet = true; else if (next) p.lines[i + 1] = { ...next, bullet: true };
        continue;
      }
      if (/^[•●▪■◦‣∙·]\s+/.test(t)) { t = t.replace(/^[•●▪■◦‣∙·]\s+/, ''); l.bullet = true; }
      if (/^-{5,}$|^_{5,}$/.test(t)) { l.rule = true; }
      l.text = t;
      if (!t) continue;
      lines.push(l);
      prev = l;
    }
  }
  if (garbledLines) fixes.push(`skipped ${garbledLines} unreadable line${garbledLines > 1 ? 's' : ''} (font without a character map)`);
  return { lines, fixes, removedRunning: running.size, garbledLines };
}

/* ---------------- 2. typography: body text and heading levels ---------------- */
function styleOf(l) { return `${(l.font || '').replace(/[-,](Bold|Italic|Regular|Roman|Medium|Light|Semibold|BoldItalic|Black).*$/i, '')}|${Math.round(l.size * 2) / 2}|${l.bold ? 'b' : ''}`; }

export function analyseTypography(lines) {
  const chars = new Map();
  for (const l of lines) chars.set(styleOf(l), (chars.get(styleOf(l)) || 0) + l.text.length);
  const sizeChars = new Map();
  for (const l of lines) { const s = Math.round(l.size * 2) / 2; sizeChars.set(s, (sizeChars.get(s) || 0) + l.text.length); }
  const bodySize = [...sizeChars].sort((a, b) => b[1] - a[1])[0]?.[0] || 10;
  const bodyStyle = [...chars].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const bodyFamily = bodyStyle.split('|')[0];
  return { bodySize, bodyFamily, bodyStyle };
}

function headingScore(l, next, typo) {
  const t = l.text;
  if (t.length > 80 || t.length < 2) return 0;
  if (STAT_LINE.test(t) || TYPE_RE.test(t) || l.bullet || l.rule) return 0;
  if (/^[\d\s.,/()+-]+$/.test(t)) return 0;
  if (/[,;]$/.test(t)) return 0;
  const size = Math.round(l.size * 2) / 2;
  const family = (l.font || '').replace(/[-,](Bold|Italic|Regular|Roman|Medium|Light|Semibold|BoldItalic|Black).*$/i, '');
  const otherFamily = family && typo.bodyFamily && family !== typo.bodyFamily && !/italic/i.test(l.font || '');
  const bigger = size >= typo.bodySize * 1.08;
  const caps = isCaps(t);
  const endsSentence = /[.!?]["”’)]?$/.test(t) && !/\b(?:St|Mr|Mrs|Dr)\.$/.test(t);
  const nextStartsLower = next && /^[a-zäöü]/.test(next.text) && Math.abs((next.size || 0) - l.size) < 0.6 && next.page === l.page;
  if (nextStartsLower && !caps) return 0; // sentence continues: inline emphasis
  if (endsSentence && !caps && t.split(' ').length > 3) return 0;
  if (bigger && (l.bold || caps || otherFamily)) return 3;
  if (bigger && titleCaseRatio(t) >= 0.75 && t.split(' ').length <= 8) return 2;
  if (otherFamily && (l.bold || caps) && !l.italic && size >= typo.bodySize * 0.95) return 2;
  if (l.bold && caps && size >= typo.bodySize * 0.9) return 2;
  if (l.bold && !l.italic && titleCaseRatio(t) >= 0.75 && t.split(' ').length <= 7 && !endsSentence && size >= typo.bodySize * 0.95) return 1;
  return 0;
}

/* ---------------- 3. blocks: headings and paragraphs ---------------- */
export function buildBlocks(lines, typo) {
  const blocks = [];
  let para = null;
  const lineGap = typo.bodySize * 1.25;
  const flush = () => { if (para) { blocks.push(para); para = null; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], next = lines[i + 1];
    const hs = headingScore(l, next, typo);
    if (hs) {
      // headings broken over two lines ("Tibalt Throgsden, LG" + "dwarf acolyte" is not one; same-style title lines are)
      const prevB = blocks[blocks.length - 1];
      if (!para && prevB && prevB.type === 'heading' && prevB.style === styleOf(l) && prevB.page === l.page && Math.abs(prevB.y - l.y) < l.size * 1.6 && prevB.col === l.col) {
        prevB.text += ' ' + l.text; prevB.y = l.y; continue;
      }
      flush();
      blocks.push({ type: 'heading', text: l.text, size: l.size, style: styleOf(l), score: hs, page: l.page, y: l.y, col: l.col, caps: isCaps(l.text), bold: l.bold });
      continue;
    }
    const startsNew = !para || l.bullet || l.rule
      || (l.leadBold && /[.:]$/.test(l.leadBold.trim()))
      || STAT_LINE.test(l.text) || TYPE_RE.test(l.text) || RP_FIELDS.test(l.text)
      || (para && para.page === l.page && para.col === l.col && para.y - l.y > lineGap * 1.55 + (l.size - typo.bodySize))
      || (para && Math.abs(para.size - l.size) > 0.8)
      || (para && para.italic !== !!l.italic && l.text.length > 25 && /[.!?"”]$/.test(para.text))
      || (para && para.bold !== !!l.bold && /[.!?:"”]$/.test(para.text))
      || (para && /^[“"„]/.test(l.text) && !/[“"„][^”"“]*$/.test(para.text))
      || (para && para.italic !== !!l.italic && /^[“"„]/.test(l.text));
    if (startsNew) {
      flush();
      if (l.rule) continue;
      para = { type: 'para', text: l.text, page: l.page, y: l.y, col: l.col, size: l.size, italic: !!l.italic, bold: !!l.bold, bullet: !!l.bullet, lead: l.leadBold || (l.bold ? '' : ''), lines: 1 };
    } else {
      para.text = para.text.endsWith('-') && /^[a-zäöü]/.test(l.text) ? para.text.slice(0, -1) + l.text : para.text + ' ' + l.text;
      para.y = l.y; para.col = l.col; para.page = l.page; para.lines++;
      if (!l.italic) para.italic = false;
    }
  }
  flush();
  // heading levels: rank distinct heading styles by size (then bold/caps)
  const hs = blocks.filter(b => b.type === 'heading');
  const styles = [...new Set(hs.map(h => h.style))].map(s => {
    const ex = hs.filter(h => h.style === s);
    return { s, size: ex[0].size, n: ex.length, caps: ex.filter(h => h.caps).length / ex.length };
  }).sort((a, b) => b.size - a.size || b.caps - a.caps);
  const levelOf = new Map(); let lvl = 0, lastSize = null;
  for (const st of styles) { if (lastSize === null || Math.abs(st.size - lastSize) > 0.4) lvl++; lastSize = st.size; levelOf.set(st.s, lvl); }
  for (const h of hs) h.level = levelOf.get(h.style);
  return blocks;
}

/* ---------------- 4. section tree ---------------- */
function buildSections(blocks) {
  const root = { title: '', level: 0, children: [], blocks: [], page: 1 };
  const stack = [root];
  for (const b of blocks) {
    if (b.type === 'heading') {
      while (stack.length > 1 && stack[stack.length - 1].level >= b.level) stack.pop();
      const sec = { title: prettyCaps(b.text), raw: b.text, level: b.level, page: b.page, children: [], blocks: [], heading: b, parent: stack[stack.length - 1] };
      stack[stack.length - 1].children.push(sec);
      stack.push(sec);
    } else stack[stack.length - 1].blocks.push(b);
  }
  return root;
}
const walk = (sec, fn) => { fn(sec); sec.children.forEach(c => walk(c, fn)); };
const sectionText = sec => { const out = []; walk(sec, s => { if (s !== sec) out.push(s.title); s.blocks.forEach(b => out.push(b.text)); }); return out.join('\n'); };
const ancestors = sec => { const a = []; for (let s = sec.parent; s; s = s.parent) a.push(s); return a; };

/* ---------------- 5. stat blocks ---------------- */
function crNum(s) { if (!s) return null; if (s.includes('/')) { const [a, b] = s.split('/'); return +a / +b; } return +s; }
function tierFor(cr) { if (cr == null) return ['Standard', 2]; if (cr <= 0.25) return ['Minion', 1]; if (cr <= 1) return ['Standard', 2]; if (cr <= 4) return ['Elite', 3]; return ['Boss', 4]; }
const GENERIC_FOE = /^(the )?(guard|bandit|cultist|thug|scout|soldier|acolyte|zombie|skeleton|ghoul|ghast|wolf|goblin|orc|kobold|lookout|minion|servant|mob|swarm|spider|rat|bat|commoner|veteran|knight|priest|mage|spy|assassin|berserker|gladiator|noble|tribal|warrior)s?\b/i;

function parseStatBlocks(blocks, typo) {
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type !== 'para' || !TYPE_RE.test(b.text)) continue;
    // name: nearest heading/bold short block before the type line (description paragraphs may sit between)
    let name = null, desc = [];
    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const p = blocks[j];
      if (p.type === 'heading') { if (!ACTION_HEADS.test(p.text)) name = p; break; }
      if (p.type === 'para' && (p.bold || isCaps(p.text)) && p.text.length < 50 && !/[.]$/.test(p.text)) { name = p; break; }
      if (p.type === 'para' && TYPE_RE.test(p.text)) break;
      desc.unshift(p.text);
    }
    if (!name) continue;
    name.statName = true;
    const m = b.text.match(TYPE_RE);
    const sb = { id: uid('e'), name: prettyCaps(name.text.replace(/\s*\(.*\)$/, '')), type: b.text, kind: m[1].toLowerCase().trim(), alignment: m[3], page: b.page, desc: desc.join(' '), traits: [], actions: [], reactions: [], legendary: [], why: 'stat block: "' + b.text.slice(0, 40) + '"' };
    let section = 'traits';
    let j = i + 1;
    const statText = [];
    for (; j < blocks.length; j++) {
      const p = blocks[j];
      if (p.type === 'heading') {
        if (ACTION_HEADS.test(p.text.trim())) { section = /legendary|mythic/i.test(p.text) ? 'legendary' : /reaction/i.test(p.text) ? 'reactions' : /lair|regional/i.test(p.text) ? 'legendary' : 'actions'; continue; }
        break;
      }
      if (TYPE_RE.test(p.text)) break;
      if (ACTION_HEADS.test(p.text.trim())) { section = /legendary|mythic/i.test(p.text) ? 'legendary' : /reaction/i.test(p.text) ? 'reactions' : 'actions'; continue; }
      if (STAT_LINE.test(p.text) || /^[\d\s()+\-–−]+$/.test(p.text)) { statText.push(p.text); continue; }
      if (p.size > typo.bodySize + 1.5) break;
      // some books put a description between the type line and Armor Class
      if (!statText.length && section === 'traits' && j - i <= 4 && !/^[A-Z][\w'’ ()/,-]{1,48}?\.\s/.test(p.text)) { sb.desc = (sb.desc + ' ' + p.text).trim(); continue; }
      const act = p.text.match(/^([A-Z][\w'’ ()/,-]{1,48}?)\.\s+(.+)$/);
      if (act && !/^(The|A|An|If|When|On|While|Each|This|He|She|It|They)\s/.test(act[1])) {
        const entry = { name: act[1].trim(), text: act[2].trim() };
        if (section === 'traits' && /(Weapon Attack|Spell Attack|Hit:)/.test(entry.text)) section = 'actions';
        sb[section].push(entry);
      } else if (sb[section].length) {
        sb[section][sb[section].length - 1].text += ' ' + p.text;
      } else if (section === 'traits' && !statText.length) {
        break;
      } else {
        sb[section + 'Intro'] = ((sb[section + 'Intro'] || '') + ' ' + p.text).trim();
      }
      if (j - i > 60) break;
    }
    const st = statText.join(' ');
    const g = re => (st.match(re) || [])[1];
    sb.ac = g(/Armor Class\s*(\d+)/i);
    sb.hp = g(/Hit Points\s*(\d+)/i);
    sb.hpDice = g(/Hit Points\s*\d+\s*\(([^)]+)\)/i);
    sb.speed = g(/Speed\s*([^A-Z]*?)(?=\s+(?:STR|Saving|Skills|Senses|Damage|Condition|Languages|Challenge)\b|$)/i);
    sb.cr = g(/Challenge\s*([\d/]+)/i);
    const scores = [...st.matchAll(/(\d{1,2})\s*\(\s*([+\-–−]\s*\d+)\s*\)/g)].slice(0, 6).map(x => +x[1]);
    if (scores.length === 6) sb.abilities = { STR: scores[0], DEX: scores[1], CON: scores[2], INT: scores[3], WIS: scores[4], CHA: scores[5] };
    if (!sb.ac && !sb.hp) continue;
    const [tier, slots] = tierFor(crNum(sb.cr));
    sb.tier = tier; sb.slots = slots;
    const k = sb.kind;
    if (/humanoid/.test(k)) { sb.breakAt = slots > 1 ? slots - 1 : null; sb.breaking = slots > 1 ? 'Flees or surrenders once badly hurt' : 'Drops or runs at the first hit'; }
    else if (/beast|monstrosity/.test(k)) { sb.breakAt = Math.max(1, slots - 1); sb.breaking = 'Flees when badly hurt'; }
    else { sb.breakAt = null; sb.breaking = 'Fights until destroyed'; }
    sb.goal = { humanoid: 'Get what they came for and live', undead: 'Drag the living into death', beast: 'Eat or escape', fiend: 'Corrupt or destroy', construct: 'Follow its orders' }[k.split(' ')[0]] || 'Defend its ground';
    sb.moves = [...sb.actions, ...sb.legendary].map(a => a.name).filter(n => !/^multiattack$/i.test(n));
    if (!sb.moves.length) sb.moves = ['Attack'];
    sb.statLines = j - i;
    Object.assign(sb, globalThis.QBAttacks.fromStatBlock(sb)); // hpMax, acNum, crNum, attacks, turn, breaks
    out.push(sb);
  }
  return out;
}

/* ---------------- 6. NPCs ---------------- */
function npcFromHeader(blocks, i, typo) {
  const b = blocks[i];
  const m = b.text.match(NPC_HEAD);
  if (!m || (!b.bold && b.type !== 'heading')) return null;
  const npc = { id: uid('n'), name: m[1].trim(), alignment: m[2], role: (m[3] || '').replace(/[.:]$/, '').trim(), page: b.page, fields: {}, quotes: [], desc: '', why: 'NPC header "Name, alignment role"' };
  for (let j = i + 1; j < Math.min(blocks.length, i + 12); j++) {
    const p = blocks[j];
    if (p.type === 'heading' || NPC_HEAD.test(p.text) && p.bold) break;
    if (!npc.role && p.bold && p.text.length < 40) { npc.role = p.text; continue; }
    if (/^[“"]/.test(p.text) || (p.italic && p.text.length < 220)) { npc.quotes.push(p.text.replace(/^[“"]|[”"]$/g, '')); continue; }
    const f = p.text.match(RP_FIELDS);
    if (f) { const k = f[1].toLowerCase(); npc.fields[FIELD_ALIAS[k] || k] = p.text.slice(f[0].length).trim(); continue; }
    if (Object.keys(npc.fields).length) break;
    if (p.bullet || j > i + 3) break;
  }
  return npc;
}

function findNpcs(blocks, sections, enemies, allText) {
  const npcs = [];
  const byName = new Map();
  const add = n => {
    const k = n.name.toLowerCase();
    if (byName.has(k)) { const o = byName.get(k); Object.assign(o.fields, n.fields); o.quotes.push(...n.quotes); if (!o.desc) o.desc = n.desc; if (!o.role) o.role = n.role; return o; }
    byName.set(k, n); npcs.push(n); return n;
  };
  // a) "Tibalt Throgsden, LG dwarf acolyte" blocks with Appearance/Does/Secret bullets
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'para' && blocks[i].bold || blocks[i].type === 'heading') {
      const n = npcFromHeader(blocks, i);
      if (n) add(n);
    }
  }
  // b) named stat blocks with a personal description or a proper name used with pronouns
  for (const e of enemies) {
    const plain = e.name.replace(/,.*$/, '');
    const cue = PERSON_CUE.test(e.desc) || (PRONOUN.test(e.desc) && e.desc.length > 30);
    const proper = !GENERIC_FOE.test(plain) && plain.split(' ').length <= 4 && new RegExp(`\\b${plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^.]{0,80}\\b(he|she|his|her|him)\\b`, 'i').test(allText);
    if (/humanoid|fey|fiend|undead|giant/.test(e.kind) && (cue || proper)) {
      const n = add({ id: uid('n'), name: plain, role: e.kind + (e.type.match(/\(([^)]+)\)/) ? ' (' + e.type.match(/\(([^)]+)\)/)[1] + ')' : ''), alignment: e.alignment, page: e.page, fields: {}, quotes: [], desc: e.desc, why: 'named creature with a stat block' + (cue ? ' and a personal description' : '') });
      n.enemyId = e.id; e.npc = true;
    }
  }
  // c) heading that is a person's name, and the next paragraph uses that name with he/she
  walk(sections, s => {
    if (!s.heading || s.heading.statName) return;
    const title = s.title.replace(NAME_NOISE, '').trim();
    if (title.split(' ').length > 3 || /\d/.test(title) || FRONT.test(title) || TREASURE_HEAD.test(title) || HOOK_HEAD.test(title) || ACTION_HEADS.test(title) || THING_WORDS.test(title) || GROUP_WORDS.test(title)) return;
    if (!/^[A-ZÄÖÜ]/.test(title) || titleCaseRatio(title) < 1 || /^(the|a|an|der|die|das|ein|eine)\s/i.test(title)) return;
    const p = s.blocks.find(b => b.type === 'para');
    if (!p) return;
    const first = firstSentences(p.text, 2);
    const nameWord = title.split(' ')[0];
    if (!new RegExp(`\\b${nameWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(p.text)) return;
    if (!/\b(he|she|his|her|him|er|sie|sein|seine|ihr|ihre)\b/.test(p.text)) return;
    add({ id: uid('n'), name: title, role: (first.match(/,?\s(?:a|an|the)\s([a-z][^,.]{3,40}?)(?:[,.]| who| is| and)/) || [])[1] || '', page: s.page, fields: {}, quotes: [], desc: p.text, why: 'name heading followed by a description of a person' });
  });
  // d) prose: "Odile Varn, the harbor master, ..." at the start of a paragraph or anywhere in a sentence
  for (const b of blocks) {
    if (b.type !== 'para') continue;
    const prot = b.text.replace(ABBR, '$1․');
    for (const m of prot.matchAll(/(?:^|[.!?]\s+|\b(?:named|called|as|is|meet)\s+)([A-Z][a-zäöüß'’]+(?:\s[A-Z][a-zäöüß'’]+){0,2}),\s+(?:a|an|the)\s+([^,.]{3,50})[,.]/g)) {
      const role = m[2].replace(/․/g, '.');
      if (SENTENCE_START.test(m[1]) || THING_WORDS.test(m[1]) || GROUP_WORDS.test(m[1]) || /^[A-Z][a-z]+ly$/.test(m[1])) continue;
      if (PERSON_CUE.test(role) || (m.index === 0 && PRONOUN.test(b.text))) add({ id: uid('n'), name: m[1], role, page: b.page, fields: {}, quotes: [], desc: b.text, why: '"Name, a/the role" sentence' });
    }
  }
  // e) character heading followed by "39 Jahre, Leichenbestatter" / "42 years old, smuggler" (Cthulhu style)
  for (let i = 0; i < blocks.length - 1; i++) {
    const h = blocks[i], nx = blocks[i + 1];
    if (h.type !== 'heading') continue;
    const m = nx.text.match(/^(\d{1,3})\s*(?:jahre|jahre alt|years old|years|yrs\.?)\s*,\s*(.{2,60})$/i);
    if (!m) continue;
    const n = add({ id: uid('n'), name: prettyCaps(h.text), role: m[2], age: +m[1], page: h.page, fields: {}, quotes: [], desc: '', why: 'name heading + "age, occupation" line' });
    for (let j = i + 2; j < Math.min(blocks.length, i + 40); j++) {
      const p = blocks[j];
      if (p.type === 'heading' && p.level <= h.level) break;
      const f = p.text.match(RP_FIELDS);
      if (f) { const k = f[1].toLowerCase(); n.fields[FIELD_ALIAS[k] || k] = p.text.slice(f[0].length).trim(); continue; }
      const hp = p.text.match(/^(?:trefferpunkte|hit points|tp)\s*:?\s*(\d+)/i);
      if (hp) { n.stats = { ...(n.stats || {}), hp: +hp[1] }; continue; }
      const san = p.text.match(/^(?:geistige stabilität|stabilität|sanity|san)\s*:?\s*(\d+)/i);
      if (san) { n.stats = { ...(n.stats || {}), sanity: +san[1] }; continue; }
      if (p.type === 'para' && !n.desc && p.text.length > 80) n.desc = p.text;
    }
  }
  // "Roleplaying Guz" / "Tenor Description" sections are roleplay notes for an NPC we already know
  walk(sections, s => {
    const m = s.heading && s.title.match(ROLEPLAY_HEAD);
    if (!m) return;
    const who = (m[2] || m[3] || '').trim();
    const n = npcs.find(x => x && (x.name === who || x.name.split(' ').includes(who) || who.split(' ').includes(x.name.split(' ').pop())));
    const text = sectionText(s).replace(/\n/g, ' ').trim();
    if (n) { n.fields.personality = [n.fields.personality, text].filter(Boolean).join(' '); n.why += ' + "' + s.title + '" section'; }
    else if (/^[A-Z]/.test(who) && who.split(' ').length <= 3 && !/^(cues|tips|notes|npcs|characters|the npcs|guide|advice)$/i.test(who)) add({ id: uid('n'), name: who, role: '', page: s.page, fields: { personality: text }, quotes: [], desc: text, why: '"' + s.title + '" section' });
    s.roleplayFor = who;
  });
  // "Father Baird" and "Reginald Baird" are one person if the book also says "Father Reginald Baird"
  for (let i = 0; i < npcs.length; i++) for (let j = i + 1; j < npcs.length; j++) {
    const a = npcs[i], b = npcs[j];
    if (!a || !b) continue;
    const la = a.name.split(' '), lb = b.name.split(' ');
    const sameLast = la.length > 1 && lb.length > 1 && la[la.length - 1] === lb[lb.length - 1];
    const contained = a.name.includes(b.name) || b.name.includes(a.name);
    const joined = sameLast && (allText.includes(`${la[0]} ${b.name}`) || allText.includes(`${lb[0]} ${a.name}`));
    if (contained || joined) {
      const keep = a.why.startsWith('NPC header') || a.enemyId ? a : b, drop = keep === a ? b : a;
      for (const [k, v] of Object.entries(drop.fields)) if (!keep.fields[k]) keep.fields[k] = v;
      keep.quotes.push(...drop.quotes); keep.desc = [keep.desc, drop.desc].filter(Boolean).join(' ');
      keep.aka = [...(keep.aka || []), drop.name]; if (!keep.role) keep.role = drop.role; keep.enemyId = keep.enemyId || drop.enemyId;
      npcs[npcs.indexOf(drop)] = null;
    }
  }
  for (let i = npcs.length - 1; i >= 0; i--) if (!npcs[i]) npcs.splice(i, 1);
  // gather extra roleplay material from the whole text for each NPC
  const prose = sentences(blocks.filter(b => b.type === 'para').map(b => b.text).join(' '));
  for (const n of npcs) {
    const names = [n.name, ...(n.aka || [])].map(x => x.split(' ').filter(w => !/^(father|mother|brother|sister|lord|lady|sir|captain|old|master|mistress|the)$/i.test(w))).map(w => w[w.length - 1] || '').filter(Boolean);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(`\\b(${[...new Set([...names, n.name.split(' ')[0]])].map(esc).join('|')})\\b`);
    const mentions = prose.filter(s => nameRe.test(s));
    n.mentions = mentions.length;
    // the NPC must come before the verb ("Odile wants…"), so "They don't want to upset Jack" doesn't count
    const pick = rx => mentions.find(s => { const a = s.search(nameRe), m = s.search(rx); return a >= 0 && m > a && m - a < 70; });
    n.fields.wants = n.fields.wants || n.fields.goal || n.fields.motivation || pick(/\b(wants?|seeks?|hopes?|desires?|needs?|wishes|will (?:pay|reward)|is (?:looking|searching) for)\b/i) || '';
    n.fields.secret = n.fields.secret || n.fields.geheimnis || pick(/\b(secret(?:ly)?|actually|in truth|hides?|disguised|is really)\b/i) || '';
    n.fields.knows = pick(/\b(knows?|reveals?|can tell|remembers?|has heard)\b/i) || '';
    Object.assign(n, roleplayTips(n));
  }
  // NPCs mentioned only once and found only by the weakest rule are likely noise
  return npcs.filter(n => n.mentions > 1 || !/name heading/.test(n.why));
}

/* ---------------- 7. story, hooks, locations, items, tables ---------------- */
function chapterLevel(sections) {
  const counts = new Map();
  walk(sections, s => { if (s.level && !FRONT.test(s.title) && !s.heading?.statName && !ACTION_HEADS.test(s.title)) counts.set(s.level, (counts.get(s.level) || 0) + 1); });
  const levels = [...counts.keys()].sort((a, b) => a - b);
  for (const lv of levels) { const n = counts.get(lv); if (n >= 3 && n <= 40) return lv; }
  return levels[0] || 1;
}

function readAloudOf(sec) {
  const out = [];
  sec.blocks.forEach((b, i) => {
    const prev = sec.blocks[i - 1];
    if (b.type !== 'para') return;
    if ((b.italic && b.text.length > 60) || (prev && /read (?:or summari[sz]e )?(?:the following|aloud)|vorlesen/i.test(prev.text))) out.push(b.text);
  });
  return out;
}

function findStory(sections, enemies, npcs) {
  const lv = chapterLevel(sections);
  const beats = [], hooks = [], locations = [], summary = [];
  const npcNames = npcs.map(n => n.name);
  const foeNames = [...new Set(enemies.map(e => e.name))];
  walk(sections, s => {
    if (!s.heading) return;
    // front/back matter (contents, credits, licence) only covers what is on its own pages
    const inFront = [s, ...ancestors(s)].some(a => FRONT.test(a.title || '') && s.page === a.page);
    if (inFront) return;
    if (SUMMARY_HEAD.test(s.title)) { summary.push(...s.blocks.filter(b => b.type === 'para').map(b => b.text)); return; }
    if (HOOK_HEAD.test(s.title)) {
      if (/^appeal to/i.test(s.title)) { hooks.push({ id: uid('h'), title: s.title, text: firstSentences(sectionText(s), 3), page: s.page, why: '"Appeal to …" hook heading' }); return; }
      const paras = s.blocks.filter(b => b.type === 'para');
      const bullets = paras.filter(b => b.bullet);
      if (s.children.length && !bullets.length) s.children.forEach(c => hooks.push({ id: uid('h'), title: c.title, text: firstSentences(sectionText(c), 3), page: c.page, why: 'under "' + s.title + '"' }));
      else {
        // an intro sentence ending in ":" is not a hook itself
        const list = bullets.length ? bullets : paras.filter((b, i) => !(i === 0 && /:\s*$/.test(b.text)));
        list.forEach(b => hooks.push({ id: uid('h'), text: b.text, page: b.page, why: 'listed under "' + s.title + '"' }));
      }
      return;
    }
    const area = s.raw.match(AREA_RE);
    if (area && s.level > lv - 1 && !/^\d{4}$/.test(area[1])) {
      const beat = ancestors(s).find(a => a.level === lv);
      locations.push({ id: uid('l'), key: area[1], name: prettyCaps(area[2]), text: firstSentences(sectionText(s), 3), page: s.page, beat: beat ? beat.title : '', why: 'numbered area heading' });
    }
    if (s.level !== lv || /^appendix|^anhang/i.test(s.title) || s.heading.statName || ACTION_HEADS.test(s.title) || s.roleplayFor) return;
    const text = sectionText(s);
    if (text.replace(/\s/g, '').length < 80) return;
    const paras = [];
    walk(s, x => x.blocks.forEach(b => b.type === 'para' && paras.push({ b, sec: x })));
    const SENSE = /^(light|sound|sounds|smell|smells|sight|sights|feel|terrain|licht|geräusche?|geruch)\s*:\s*/i;
    const senses = paras.filter(p => SENSE.test(p.b.text) && p.sec === s).map(p => p.b.text);
    const prose = paras.filter(p => !p.b.italic && !RP_FIELDS.test(p.b.text) && !SENSE.test(p.b.text) && !/^encounters?\s*:/i.test(p.b.text) && p.b.text.length > 60 && !TYPE_RE.test(p.b.text) && !STAT_LINE.test(p.b.text));
    const child = re => s.children.find(c => re.test(c.title));
    const dq = child(/dramatic question|leitfrage/i), tr = child(/^transition|übergang/i);
    const all = sentences(text);
    beats.push({
      id: uid('s'), title: s.title, page: s.page,
      summary: firstSentences(prose[0]?.b.text || paras[0]?.b.text || '', 2),
      question: dq ? sectionText(dq).replace(/\n/g, ' ').trim() : '',
      transition: tr ? sectionText(tr).replace(/\n/g, ' ').trim() : '',
      branches: all.filter(x => /^(if|should|when) (the )?(characters|party|players|pcs|heroes|investigators)\b/i.test(x)).slice(0, 4),
      readAloud: readAloudOf(s).slice(0, 2),
      senses,
      scenes: s.children.filter(c => !TREASURE_HEAD.test(c.title) && !/dramatic question|transition|development|combat/i.test(c.title)).map(c => c.title).slice(0, 12),
      npcs: npcNames.filter(n => new RegExp(`\\b${n.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)),
      foes: foeNames.filter(n => new RegExp(`\\b${n.split(/[ ,]/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)),
      why: `level-${lv} heading (the book's chapter style)`
    });
  });
  // If the book names its parts ("Part 1", "Chapter 2"), only those (plus intro/ending) are story beats;
  // other same-size sections (appendices, charts, credits) become reference sections.
  const PART = /^(part|chapter|act|scene|episode|teil|kapitel|akt|szene)\s*[\dIVX]+|^(introduction|prologue|conclusion|epilogue|aftermath|finale|ending|einleitung|prolog|epilog|abschluss|finale)\b/i;
  let reference = [];
  if (beats.filter(b => PART.test(b.title)).length >= 2) {
    const firstPart = beats.findIndex(b => PART.test(b.title));
    const lastPart = beats.length - 1 - [...beats].reverse().findIndex(b => PART.test(b.title));
    reference = beats.filter((b, i) => !PART.test(b.title) && (i > lastPart || i < firstPart - 1));
    const keep = new Set(beats.filter(b => !reference.includes(b)));
    for (let i = beats.length - 1; i >= 0; i--) if (!keep.has(beats[i])) beats.splice(i, 1);
  }
  return { beats, hooks, locations, summary: summary.join(' '), reference: reference.map(b => ({ title: b.title, page: b.page })) };
}

function findItems(blocks, sections) {
  const items = [];
  const seen = new Set();
  const add = it => { const k = it.name.toLowerCase().replace(/^an? /, ''); if (seen.has(k) || it.name.length > 70) return; seen.add(k); items.push(it); };
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type !== 'para') continue;
    const m = b.text.match(ITEM_TYPE);
    if (m) {
      const prev = blocks[i - 1];
      const name = prev && prev.text.length < 60 ? prettyCaps(prev.text) : '';
      if (name) add({ id: uid('i'), name, type: b.text.split(',')[0], rarity: m[2].toLowerCase(), desc: blocks[i + 1]?.text || '', page: b.page, why: 'magic item line "' + b.text.slice(0, 40) + '"' });
    }
  }
  walk(sections, s => {
    if (!TREASURE_HEAD.test(s.title)) return;
    const where = s.parent?.title || '';
    s.blocks.filter(b => b.type === 'para').forEach(b => {
      const first = firstSentences(b.text, 1).replace(/[.:]$/, '');
      const lead = b.text.match(/^([A-Z][^.:(]{2,50}?)(?:[.:(]|\s[–—-]\s)/);
      add({ id: uid('i'), name: lead && lead[1].split(' ').length <= 6 ? lead[1].trim() : first.length <= 70 ? first : first.slice(0, 67) + '…', desc: b.text, gp: (b.text.match(/(\d[\d,]*)\s*gp/) || [])[1] || '', page: b.page, where, why: 'listed under "' + s.title + '"' + (where ? ' in ' + where : '') });
    });
  });
  for (const b of blocks) {
    if (b.type !== 'para') continue;
    for (const m of b.text.matchAll(NAMED_ITEM)) {
      const name = m[1].replace(/\s+(?:of|the)$/, '').replace(/^./, c => c.toUpperCase());
      add({ id: uid('i'), name, desc: firstSentences(b.text.slice(Math.max(0, m.index - 80)), 1), page: b.page, why: '"… of <Name>" item pattern', mention: true });
    }
  }
  // "Wand of True" is a cut-off "Wand of True Polymorph"; "Wand of True Polymorph Transformed" ran into the next sentence
  const names = items.filter(i => i.mention).map(i => i.name.toLowerCase());
  return items.filter(i => {
    if (!i.mention) return true;
    const n = i.name.toLowerCase();
    if (names.some(o => o !== n && o.startsWith(n + ' '))) return false;
    if (names.some(o => o !== n && n.startsWith(o + ' ') && n.split(' ').length - o.split(' ').length === 1 && names.filter(x => x === o).length)) return false;
    return true;
  });
}

// Roll tables work on raw lines: the die header ("d8", "d20 Result") is followed by
// numbers ("1", "10-11", "20+") that start each row, with the row text on the same or next lines.
function findTables(lines, typo) {
  const tables = [];
  const ROLL = /^(\d{1,3}(?:\s*[-–]\s*\d{1,3})?\+?)(?:\s+(.+))?$/;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const die = l.text.match(/^d(4|6|8|10|12|20|100)\b/i);
    if (!die || l.text.length > 40) continue;
    let head = null;
    for (let k = i - 1; k >= Math.max(0, i - 4); k--) { if (lines[k].text.length < 60 && (lines[k].bold || lines[k].size > typo.bodySize)) { head = lines[k]; break; } }
    const rows = [];
    let j = i + 1;
    while (j < lines.length && !ROLL.test(lines[j].text) && j < i + 3) j++; // column headers like "Detail"
    for (; j < lines.length && rows.length < 100; j++) {
      const p = lines[j];
      if (p.size > l.size + 1.5 || (p.page !== l.page && !ROLL.test(p.text) && !rows.length)) break;
      const r = p.text.match(ROLL);
      if (r && (rows.length === 0 || r[1] !== rows[rows.length - 1].roll)) rows.push({ roll: r[1].replace(/\s/g, ''), text: r[2] || '' });
      else if (rows.length && p.page - lines[i].page <= 1) rows[rows.length - 1].text = (rows[rows.length - 1].text + ' ' + p.text).trim();
      else break;
      if (/^d(4|6|8|10|12|20|100)\b/i.test(lines[j + 1]?.text || '')) break;
    }
    if (rows.length >= 3) tables.push({ id: uid('t'), title: head ? prettyCaps(head.text) : 'Table', die: die[0].toLowerCase(), rows, page: l.page, why: 'die header "' + die[0] + '" with numbered rows' });
  }
  return tables;
}

/* ---------------- 8. whole-document facts ---------------- */
function detectLanguage(text) {
  const w = text.toLowerCase().match(/\b[a-zäöüß]+\b/g) || [];
  const de = w.filter(x => /^(der|die|das|und|ist|nicht|mit|sich|ein|eine|den|auf|für|sie|wird|auch|wenn|oder)$/.test(x)).length;
  const en = w.filter(x => /^(the|and|is|not|with|of|to|a|an|they|you|for|if|or|are|this)$/.test(x)).length;
  return de > en ? 'de' : 'en';
}
function detectSystem(text) {
  const score = {
    '5e': (text.match(/\b(Armor Class|Hit Points|saving throw|Challenge \d|d20|5e|fifth edition|spell slot|Dungeon Master|DC \d{1,2}|short rest|long rest|advantage|disadvantage|(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) \((?:[A-Z][a-z]+ ?)+\)|passive (?:Wisdom|Perception))\b/g) || []).length,
    coc: (text.match(/\b(Stabilität|Stabilitätspunkte|geistige Stabilität|Investigator(?:en)?|Sanity|SAN|Keeper of Arcane Lore|Spielleiter|Cthulhu-Mythos|Glückswurf|Luck roll)\b/g) || []).length * 2,
    pf2: (text.match(/\b(Pathfinder|Perception \+\d+|three actions|\[one-action\])\b/gi) || []).length
  };
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 3 ? best[0] : null;
}
function docKind(r, numPages) {
  const statPerPage = r.enemies.length / Math.max(1, numPages);
  if (r.beats.length >= 2 || r.locations.length >= 3) return 'adventure';
  if (statPerPage > 0.6) return 'bestiary';
  if (/subclass|archetype|feat|background/i.test(r.headings.join(' '))) return 'supplement';
  return r.beats.length ? 'adventure' : 'other';
}

// Combat card sheets: names like "Ghoul, M" with a size letter, plus CR markers.
export function readCards(doc) {
  const names = [];
  for (const p of doc.pages) for (const l of p.lines) {
    const m = l.text.match(/^([A-Z][\w'’ ,-]{1,40}?), (T|S|M|L|H|G)$/); // "Chimera, L", also "Elf, Drow, M"
    if (m && l.bold) names.push({ name: m[1], size: m[2], page: p.n });
  }
  return names;
}

export function readAdventure(doc) {
  const cleaned = cleanDocument(doc);
  const typo = analyseTypography(cleaned.lines);
  const blocks = buildBlocks(cleaned.lines, typo);
  const sections = buildSections(blocks);
  const allText = blocks.map(b => b.text).join('\n');
  const enemies = parseStatBlocks(blocks, typo);
  const npcs = findNpcs(blocks, sections, enemies, allText);
  const story = findStory(sections, enemies, npcs);
  const items = findItems(blocks, sections);
  const tables = findTables(cleaned.lines, typo);
  const titleLine = doc.pages.slice(0, 3).flatMap(p => p.lines).filter(l => l.text.length > 3 && !/^\d+$/.test(l.text)).sort((a, b) => b.size - a.size)[0];
  const r = {
    title: doc.meta?.title && !/^untitled|\.(indd|pdf|docx?)$/i.test(doc.meta.title) ? doc.meta.title : prettyCaps(titleLine?.text || ''),
    language: detectLanguage(allText), system: detectSystem(allText),
    summary: story.summary, beats: story.beats, hooks: story.hooks, locations: story.locations, reference: story.reference,
    npcs, enemies, items, tables,
    headings: blocks.filter(b => b.type === 'heading').map(b => b.text),
    stats: { pages: doc.pages.length, lines: cleaned.lines.length, paragraphs: blocks.filter(b => b.type === 'para').length, headings: blocks.filter(b => b.type === 'heading').length, bodySize: typo.bodySize, fixes: cleaned.fixes, imagePages: doc.pages.filter(p => p.imageCover > 0.6 && p.lines.length < 15).map(p => p.n) }
  };
  r.kind = docKind(r, doc.pages.length);
  r.profile = profileAdventure(r, allText);
  return r;
}

// Fingerprint for "is this the same text?" between two versions of a book.
export function textFingerprint(doc, maxPages = 10) {
  const words = doc.pages.slice(0, maxPages).flatMap(p => p.lines.map(l => l.text)).join(' ').toLowerCase().match(/[a-zäöüß]{3,}/g) || [];
  const shingles = new Set();
  for (let i = 0; i + 4 < words.length; i++) shingles.add(words.slice(i, i + 4).join(' '));
  return shingles;
}
export function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const s of a) if (b.has(s)) inter++;
  return inter / Math.min(a.size, b.size);
}
