// Foundry VTT modules: the journal holds clean room text, the actors hold full creatures,
// and tables of "Adventure Level / Encounter" say who is in each fight at each level.
// Runs on plain text, so it needs no browser. Nothing is written back to the module.
import { shapeFoe } from './reader.js';

const uid = (() => { let n = 0; const run = Date.now().toString(36); return p => `${p}-mod-${run}-${++n}`; })();
const ENTITY = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };
const decode = s => s.replace(/&(#x?[\da-f]+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITY[e] ?? m);
// Foundry links read as their label: @Compendium[pack.id]{Iron Flask} and @Item[Sun Blade].
const unlink = s => s.replace(/@\w+\[[^\]]*\]\{([^}]*)\}/g, '$1').replace(/@\w+\[([^\]]*)\]/g, '$1');
const plain = html => decode(unlink(String(html)).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const IRREGULAR = { mummy: 'Mummies', succubus: 'Succubi', 'vampire spawn': 'Vampire Spawn', shadow: 'Shadows' };
const plural = name => IRREGULAR[name.toLowerCase()] || (/s$/i.test(name) ? name : name + 's');
// "7 {Zombie} led by a {Wight}" → "7 Zombies led by a Wight"
const readable = text => text.replace(/\b(\d+)\s*\{([^}]+)\}/g, (m, n, name) => `${n} ${+n > 1 ? plural(name.trim()) : name.trim()}`).replace(/\{([^}]+)\}/g, '$1').replace(/\s+/g, ' ').trim();

function rows(table) {
  return (table.match(/<tr\b[\s\S]*?<\/tr>/gi) || []).map(row => (row.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) || []).map(plain));
}
// The top-level pieces of a journal page, in order.
function blocksOf(html) {
  const out = [];
  for (const m of String(html).matchAll(/<(h[1-6]|p|blockquote|table|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const tag = m[1].toLowerCase();
    if (tag[0] === 'h') { const text = plain(m[2]); if (text) out.push({ type: 'heading', level: +tag[1], text }); }
    else if (tag === 'table') { const [head, ...body] = rows(m[0]); if (head) out.push({ type: 'table', head, body }); }
    else if (tag === 'ul' || tag === 'ol') { for (const li of m[2].match(/<li\b[\s\S]*?<\/li>/gi) || []) out.push({ type: 'para', text: '- ' + plain(li) }); }
    else if (tag === 'blockquote') { const text = plain(m[2]); if (text) out.push({ type: 'read', text }); }
    else {
      const text = plain(m[2]); if (!text) continue;
      const lead = m[2].match(/^\s*<strong[^>]*>\s*(?:<em[^>]*>)?([\s\S]*?)(?:<\/em>\s*)?<\/strong>/i);
      out.push({ type: 'para', text, lead: lead ? plain(lead[1]) : '' });
    }
  }
  return out;
}

const levelOf = cell => { const m = String(cell).match(/^(\d+)(?:st|nd|rd|th)?(?:[- ]level)?$/i); return m ? +m[1] : null; };
const isLevelTable = t => /level/i.test(t.head[0] || '') && !/party/i.test(t.head[0]) && t.body.length > 1 && t.body.every(r => levelOf(r[0]) != null);
const isRollTable = t => /^d\d+$/i.test((t.head[0] || '').trim());
const isChart = t => /party level/i.test(t.head[0] || '') && /version/i.test(t.head[1] || '');
const FEATURE_LEAD = /^(Encounter|Hazard|Trap|Trick|Treasure)\b/i;
const ROOM_HEAD = /^(\d+)\s*[-–—:.]\s*(.+)$/;
const ENDING = /aftermath|conclusion|epilogue|wrapping up/i;

// One fight's foes for one table row: "1 {Vampire Spawn} with 121 hit points" keeps that number.
function foesIn(cells) {
  const foes = [];
  for (const cell of cells) for (const m of cell.matchAll(/\b(\d+|an?|one|two|three|four|five|six)\s*\{([^}]+)\}(\s*with\s+(\d+)\s+hit points)?/gi)) {
    const n = /^\d/.test(m[1]) ? +m[1] : { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }[m[1].toLowerCase()];
    foes.push({ name: m[2].trim(), n, ...(m[4] ? { hp: +m[4] } : {}) });
  }
  return foes;
}

// Keep the level rows with their braces; the chosen level turns them into text later.
function textOf(blocks, level) {
  const out = [];
  for (const [i, b] of blocks.entries()) {
    if (b.type === 'heading') { const next = blocks[i + 1]; if (b.level > 1 && !(next?.type === 'table' && isLevelTable(next))) out.push('## ' + b.text); continue; }
    if (b.type === 'read') out.push('> ' + b.text);
    else if (b.type === 'table') {
      if (isLevelTable(b)) {
        const row = b.body.find(r => levelOf(r[0]) === level);
        if (row) out.push(`${b.title || 'Encounter'} (level ${level}): ${row.slice(1).map((c, i) => (b.head.length > 2 ? b.head[i + 1] + ': ' : '') + readable(c)).join('. ')}`);
      } else out.push(...b.body.map(r => '- ' + r.map(readable).join(': ')));
    } else if (b.lead && FEATURE_LEAD.test(b.lead)) {
      const title = b.lead.replace(/\.$/, ''), rest = b.text.slice(b.lead.length).trim();
      out.push('### ' + readable(title)); if (rest) out.push(readable(rest));
    } else out.push(readable(b.text));
  }
  return out.join('\n\n');
}

// Every table takes the heading written just above it as its name.
function nameTables(blocks) {
  let last = '';
  for (const b of blocks) { if (b.type === 'heading') last = b.text; else if (b.type === 'table') { b.title = last; last = ''; } }
  return blocks;
}

// Armor class as written, or worked out from the armor the creature wears.
function armor(a) {
  const ac = a.data?.attributes?.ac || {}, given = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v);
  if (given(ac.flat)) return +ac.flat;
  if (given(ac.value)) return +ac.value;
  const mod = Math.floor(((a.data?.abilities?.dex?.value ?? 10) - 10) / 2);
  const worn = (a.items || []).filter(i => i.type === 'equipment' && i.data?.equipped !== false && i.data?.armor?.value);
  const body = worn.find(i => /light|medium|heavy|natural/.test(i.data.armor.type || ''));
  const shield = worn.find(i => i.data.armor.type === 'shield');
  if (!body && !shield) return null;
  const type = body?.data.armor.type, value = body?.data.armor.value;
  const base = !body ? 10 + mod : type === 'heavy' || type === 'natural' ? value : value + (type === 'medium' ? Math.min(mod, 2) : mod);
  return base + (shield?.data.armor.value || 0);
}
// The module stores damage as data, which is cleaner than reading it back out of a sentence.
function exactAttacks(actor, foe) {
  const d = actor.data || {}, sheet = actor.items || [];
  const modOf = k => Math.floor(((d.abilities?.[k]?.value ?? 10) - 10) / 2);
  for (const attack of foe.attacks) {
    const item = sheet.find(i => i.name === attack.name), parts = item?.data?.damage?.parts;
    attack.melee = /^m/.test(item?.data?.actionType || '');
    if (!parts?.length) continue;
    const mod = modOf(item.data.ability || (item.data.actionType === 'rwak' ? 'dex' : 'str'));
    const dice = parts.map(p => String(p[0]).replace(/@mod/g, String(mod)).replace(/\s+/g, '').replace(/\+-/g, '-').replace(/\+0$/, '')).filter(p => /^\d+(d\d+)?([+-]\d+)*$/.test(p));
    // A sheet can leave the modifier out of the main hit; the written line still has it.
    const written = plain(item.data.description?.value || '').match(/Hit:\s*\d+\s*\(\s*(\d+d\d+)\s*([+\-–−])\s*(\d+)\s*\)/i);
    if (written && dice[0] === written[1]) dice[0] = written[1] + (written[2] === '+' ? '+' : '-') + written[3];
    if (dice.length) attack.damage = dice.join('+');
  }
  foe.attacks = [...foe.attacks.filter(a => a.melee), ...foe.attacks.filter(a => !a.melee)].map(({ melee, ...a }) => a);
  const multi = sheet.find(i => /^multiattack\b/i.test(i.name)), text = multi ? plain(multi.data?.description?.value || '') : '';
  // "only one of which can be a bite" means the other attack comes first; "two longswords or two longbows" is a choice.
  const limited = text.match(/only one of which can be (?:a|an|its)\s+([\w'-]+)/i), starts = a => a.name.toLowerCase().startsWith(limited[1].toLowerCase());
  const once = limited && foe.attacks.find(starts), other = limited && foe.attacks.find(a => !starts(a));
  foe.turn = once && other ? [other.name, once.name] : globalThis.QBAttacks.turnOf(multi ? [{ name: 'Multiattack', text: text.split(/\bor\b/)[0] }] : [], foe.attacks);
  return foe;
}
function enemyFrom(actor) {
  const d = actor.data || {}, items = actor.items || [], desc = i => plain(i.data?.description?.value || '');
  const score = k => d.abilities?.[k]?.value;
  const typeOf = d.details?.type?.value ?? d.details?.type ?? '';
  const size = { tiny: 'Tiny', sm: 'Small', med: 'Medium', lg: 'Large', huge: 'Huge', grg: 'Gargantuan' }[d.traits?.size] || '';
  const speed = d.attributes?.movement?.walk ?? d.attributes?.speed?.value;
  const acted = items.filter(i => i.type !== 'equipment' && i.type !== 'spell' && desc(i));
  const when = i => String(i.data?.activation?.type || '').toLowerCase();
  const isAction = i => i.type === 'weapon' || when(i) === 'action' || when(i) === 'bonus';
  const entry = i => ({ name: i.name, text: desc(i) });
  const sb = {
    id: uid('e'), name: actor.name, kind: String(typeOf).toLowerCase(), type: [size, typeOf].filter(Boolean).join(' '), page: null,
    desc: plain(d.details?.biography?.value || '').slice(0, 400),
    traits: acted.filter(i => !isAction(i) && !/reaction|legendary|lair/.test(when(i))).map(entry),
    actions: acted.filter(isAction).map(entry),
    reactions: acted.filter(i => i.type !== 'weapon' && when(i) === 'reaction').map(entry),
    legendary: acted.filter(i => i.type !== 'weapon' && /legendary|lair/.test(when(i))).map(entry), why: 'creature sheet in the module',
    ac: armor(actor) == null ? undefined : String(armor(actor)), hp: d.attributes?.hp?.max == null ? undefined : String(d.attributes.hp.max), hpDice: d.attributes?.hp?.formula || '',
    speed: speed == null ? '' : String(speed), cr: d.details?.cr == null ? undefined : String(d.details.cr),
    abilities: { STR: score('str'), DEX: score('dex'), CON: score('con'), INT: score('int'), WIS: score('wis'), CHA: score('cha') }
  };
  return exactAttacks(actor, shapeFoe(sb));
}

// A handout page names its picture. The book doesn't say where it belongs, so its own words give a first idea:
// a fight named the same, or else a room named the same.
function handoutsFrom(journal, fights, beats) {
  const roomFor = title => {
    const words = title.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 4);
    const named = text => { const own = String(text).toLowerCase().split(/[^a-z]+/); return words.some(w => own.includes(w)); };
    return fights.find(f => named(f.name))?.where || beats.find(b => !b.reference && named(b.title))?.title || '';
  };
  return journal.filter(j => j.img && /handout/i.test(j.name)).map(j => {
    const title = j.name.split(/[>:]/).pop().trim();
    return { id: uid('art'), title, file: j.img, where: roomFor(title), why: 'handout page in the module', page: null };
  });
}

// packs: { journal: [...], actors: [...], items: [...] }, each the parsed lines of one .db file
export function readModule({ manifest = {}, journal = [], actors = [], items = [] }, source = '') {
  const pages = journal.filter(j => plain(j.content || ''))
    .map(j => ({ name: j.name, order: parseFloat(j.name) || 0, blocks: nameTables(blocksOf(j.content)) }))
    .sort((a, b) => a.order - b.order);
  const beats = [], hooks = [], tables = [], locations = [], reference = [], treasures = [], fights = [], chart = [];
  const anyRooms = pages.some(p => p.blocks.some(b => b.type === 'heading' && ROOM_HEAD.test(b.text)));
  const pageTitle = p => p.blocks.find(b => b.type === 'heading' && b.level === 1)?.text || p.name.replace(/^[\d.\s]+/, '');
  const makeBeat = (title, blocks, chapter, extra = {}) => ({
    id: uid('b'), title, chapter, page: null, parts: blocks, summary: '', fullText: '', question: '', transition: '', branches: [], senses: [], scenes: [], npcs: [], foes: [],
    readAloud: blocks.filter(b => b.type === 'read').map(b => b.text), why: 'journal page "' + chapter + '" in the module', ...extra
  });
  const takeFights = (blocks, where) => {
    let lead = null;
    for (const b of blocks) {
      if (b.lead && /^Encounter\b/i.test(b.lead)) { lead = b; }
      if (b.type === 'table' && isLevelTable(b)) {
        const name = b.title || (lead ? lead.lead.replace(/^Encounter:?\s*/i, '').replace(/\.$/, '') : 'Encounter');
        fights.push({ name, where, byLevel: Object.fromEntries(b.body.map(r => [levelOf(r[0]), foesIn(r.slice(1))])) });
        lead = null;
      } else if (lead === b && /\{[^}]+\}/.test(b.text)) {
        const next = blocks[blocks.indexOf(b) + 1], nextHead = next?.type === 'heading' ? blocks[blocks.indexOf(b) + 2] : next;
        if (nextHead?.type === 'table' && isLevelTable(nextHead)) continue;
        // The book says who but not how many: one to start with, and the DM sets the number.
        const names = [...b.text.matchAll(/\{([^}]+)\}/g)].map(m => m[1].trim());
        fights.push({ name: b.lead.replace(/^Encounter:?\s*/i, '').replace(/\.$/, ''), where, askCount: true, always: [...new Set(names)].map(name => ({ name, n: 1 })) });
      } else if (lead === b) {
        // "Similar to the one in area 13": the same creatures, in a room of their own.
        const name = b.lead.replace(/^Encounter:?\s*/i, '').replace(/\.$/, ''), earlier = fights.find(f => f.name === name && f.always);
        if (earlier) fights.push({ ...earlier, where });
      }
    }
  };
  const takeTreasure = (blocks, where) => {
    for (const b of blocks) if (b.lead && /^Treasure\b/i.test(b.lead)) {
      const name = b.lead.replace(/^Treasure:?\s*/i, '').replace(/\.$/, '') || 'Treasure in ' + where;
      treasures.push({ id: uid('i'), name, desc: readable(b.text.slice(b.lead.length).trim()), where, why: 'marked as treasure in ' + where, page: null });
    }
  };

  for (const p of pages) {
    for (const b of p.blocks) if (b.type === 'table') {
      if (isChart(b)) chart.push(...b.body.map(r => ({ party: +r[0], level: levelOf(String(r[1]).replace(/-level.*/i, '')), difficulty: r[2] || '' })).filter(c => c.party && c.level));
      else if (isRollTable(b)) {
        if (/hook/i.test(b.title || '')) hooks.push(...b.body.map(r => ({ id: uid('h'), title: r.length > 2 ? r[1] : '', text: readable(r[r.length - 1]), page: null, why: 'listed under "' + b.title + '"' })));
        else tables.push({ id: uid('t'), title: b.title || 'Roll table', die: b.head[0].trim(), rows: b.body.map(r => ({ roll: r[0], text: readable(r.slice(1).join(': ')) })), page: null, why: 'roll table in the module' });
      }
    }
    const roomAt = p.blocks.map((b, i) => b.type === 'heading' && ROOM_HEAD.test(b.text) ? i : -1).filter(i => i >= 0);
    const chapter = pageTitle(p);
    if (roomAt.length) {
      const intro = p.blocks.slice(0, roomAt[0]);
      if (intro.reduce((n, b) => n + (b.text && b.type !== 'heading' ? b.text.length : 0), 0) > 150) beats.push(makeBeat(chapter, intro, chapter, { reference: true }));
      roomAt.forEach((at, i) => {
        const [, key, name] = p.blocks[at].text.match(ROOM_HEAD), blocks = p.blocks.slice(at + 1, roomAt[i + 1] ?? p.blocks.length);
        const title = `${key}. ${name}`;
        beats.push(makeBeat(title, blocks, chapter));
        locations.push({ id: uid('l'), key, name, beat: chapter, parts: blocks, text: '', readAloud: blocks.filter(b => b.type === 'read').map(b => b.text), page: null, why: 'numbered room in "' + chapter + '"' });
        takeFights(blocks, title); takeTreasure(blocks, title);
      });
    } else if (anyRooms && !ENDING.test(p.name)) {
      const named = p.name.replace(/^[\d.\s]+/, '');
      const title = beats.some(b => b.title === named) ? p.blocks.find(b => b.type === 'heading' && b.level === 2)?.text || chapter : named;
      beats.push(makeBeat(title, p.blocks, chapter, { reference: true })); reference.push({ title });
    } else {
      beats.push(makeBeat(chapter, p.blocks, chapter)); takeFights(p.blocks, chapter); takeTreasure(p.blocks, chapter);
    }
  }

  const enemies = actors.filter(a => a.type === 'npc' || a.data?.details?.cr != null).map(enemyFrom);
  const same = s => s.toLowerCase().replace(/[’']/g, '');
  const known = new Map(treasures.map(t => [same(t.name), t]));
  const gear = items.filter(i => i.name).map(i => {
    const match = known.get(same(i.name));
    return { id: uid('i'), name: i.name, desc: plain(i.data?.description?.value || '').slice(0, 600), rarity: i.data?.rarity || '', where: match?.where || '', why: 'item sheet in the module', page: null };
  });
  const levels = [...new Set(fights.flatMap(f => Object.keys(f.byLevel || {}).map(Number)))].sort((a, b) => a - b);
  const words = beats.flatMap(b => b.parts).reduce((n, b) => n + (b.text ? 1 : 0), 0);
  const firstPara = pages[0]?.blocks.find(b => b.type === 'para' && !b.lead)?.text || '';
  const description = plain(manifest.description || '');
  const result = {
    module: true, title: pageTitle(pages[0] || { blocks: [], name: manifest.title || source }), language: 'en', system: /dnd5e/.test(JSON.stringify(manifest.packs || manifest.system || '')) ? '5e' : '',
    summary: readable(firstPara || description), beats, hooks, locations, reference, npcs: [], enemies, items: [...gear, ...treasures.filter(t => !gear.some(g => same(g.name) === same(t.name)))],
    tables, headings: [], handouts: handoutsFrom(journal, fights, beats), fightPlan: fights, levels, levelChart: chart, kind: 'adventure', importWarnings: [], characterOptions: [],
    stats: { pages: pages.length, lines: 0, paragraphs: words, headings: 0, bodySize: 0, fixes: [], imagePages: 0, rooms: locations.length },
    profile: { title: '', themes: [], tone: [], villains: [], levels: levels.length ? [levels[0], levels[levels.length - 1]] : [] }
  };
  applyLevel(result, levels[0] ?? 0);
  return result;
}

// The book's chart decides the version for this party; without one, the nearest version not above them.
export function levelForParty(result, partyLevel) {
  const levels = result.levels || []; if (!levels.length) return { level: 0, difficulty: '' };
  const hit = (result.levelChart || []).find(c => c.party === Math.round(partyLevel));
  if (hit && levels.includes(hit.level)) return { level: hit.level, difficulty: hit.difficulty };
  const under = levels.filter(l => l <= partyLevel);
  return { level: under.length ? under[under.length - 1] : levels[0], difficulty: '' };
}

// Scene text, fights and which creatures are needed all follow the chosen version of the adventure.
export function applyLevel(result, level) {
  result.level = level;
  for (const b of result.beats) { b.summary = textOf(b.parts, level); b.fullText = b.summary; }
  for (const l of result.locations) l.text = textOf(l.parts, level);
  const byName = new Map(result.enemies.filter(e => !e.variantOf).map(e => [e.name.toLowerCase(), e]));
  const needed = new Set(), fights = [], missing = new Set();
  result.enemies = result.enemies.filter(e => !e.variantOf);
  for (const plan of result.fightPlan || []) {
    const foes = [];
    for (const f of plan.always || plan.byLevel?.[level] || []) {
      const base = byName.get(f.name.toLowerCase());
      if (!base) { missing.add(f.name); continue; }
      let foe = base;
      if (f.hp && f.hp !== base.hpMax) {
        const name = `${base.name} (${f.hp} hit points)`;
        foe = result.enemies.find(e => e.name === name);
        if (!foe) { foe = { ...base, id: uid('e'), name, variantOf: base.name, hp: String(f.hp), hpMax: f.hp, why: 'the adventure gives this one its own hit points' }; result.enemies.push(foe); }
      }
      needed.add(foe.name); foes.push({ name: foe.name, n: f.n });
    }
    if (foes.length) fights.push({ id: uid('f'), name: plan.name, where: plan.where, foes, goal: 'Defend their ground', askCount: !!plan.askCount, include: true, why: plan.askCount ? 'The book names this creature but gives no number here. Check the room text and set how many.' : `the book's table for level ${level}` });
  }
  result.fights = fights;
  result.missingFoes = [...missing];
  const anyFights = (result.fightPlan || []).length > 0;
  for (const e of result.enemies) e.include = !anyFights || needed.has(e.name);
  return result;
}
