/* Stat-block numbers for HP combat: hit points, armor class, challenge and the attacks of one turn.
   Shared by the offline reader (imported as a module) and the app (loaded as a plain script). No guessing beyond the text:
   anything that can't be read stays empty so the DM is asked instead. */
(function (root) {
  const WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const count = w => WORDS[String(w).toLowerCase()] || +w || 0;
  const firstInt = x => { const m = String(x ?? '').match(/-?\d+/); return m ? +m[0] : null; };
  const crValue = x => { const s = String(x ?? '').trim(); if (!s || s === '?') return null; if (s.includes('/')) { const [a, b] = s.split('/'); return +a / +b; } return Number.isFinite(+s) ? +s : null; };
  const clean = s => String(s).replace(/[–−]/g, '-').replace(/\s+/g, '');

  // "Melee Weapon Attack: +7 to hit, ... Hit: 6 (1d4 + 4) piercing damage plus 17 (5d6) poison damage." → { bonus: 7, damage: '1d4+4+5d6' }
  function parseAction(action) {
    const text = String(action?.text || '');
    const hit = text.match(/([+\-–−]\s*\d+)\s*to hit/i); if (!hit) return null;
    const after = text.slice(text.search(/Hit:/i) >= 0 ? text.search(/Hit:/i) : 0);
    let parts = [...after.matchAll(/\d+\s*\(\s*(\d+d\d+(?:\s*[+\-–−]\s*\d+)?)\s*\)/gi)].map(m => clean(m[1]));
    if (!parts.length) { const flat = after.match(/Hit:\s*(\d+)\s+\w+\s+damage/i); if (flat) parts = [flat[1]]; }
    if (!parts.length) return null;
    return { name: String(action.name || 'Attack').trim(), bonus: firstInt(clean(hit[1])), damage: parts.join('+') };
  }
  // Combat-card attack line: "Scimitar: +4, 1d6+2s" or "Shortbow: 80/320, +4, 1d6+2p" → { name, bonus, damage }
  function parseCardLine(line) {
    const m = String(line).match(/^\s*([A-Z][\w' -]{1,40}?):\s*(?:[\d/’' ]+f?t?\.?,\s*)?([+\-–−]\s*\d+),\s*(\d+d\d+(?:\s*[+\-–−]\s*\d+)?)/);
    return m ? { name: m[1].trim(), bonus: firstInt(clean(m[2])), damage: clean(m[3]) } : null;
  }
  // One turn of attacks, following Multiattack when the text says which attacks it makes.
  function turnOf(actions, attacks) {
    if (!attacks.length) return [];
    const multi = (actions || []).find(a => /^multiattack\b/i.test(String(a.name).trim())); // also "Multiattack (Hybrid Form Only)"
    if (!multi) return [attacks[0].name];
    const t = multi.text, total = count((t.match(/makes\s+(\w+)/i) || [])[1]) || 2;
    const picked = [];
    for (const a of attacks) {
      const base = a.name.toLowerCase().replace(/\s*\(.*\)$/, '');
      const m = t.toLowerCase().match(new RegExp(`\\b(one|two|three|four|\\d)\\s+(?:(?:attacks?\\s+)?with\\s+(?:its|his|her|their)\\s+)?${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
      if (m) for (let i = 0; i < count(m[1]); i++) picked.push(a.name);
    }
    if (picked.length) return picked.slice(0, Math.max(total, picked.length));
    return Array(total).fill(attacks[0].name);
  }
  const BREAKS = /humanoid|beast|monstrosity/i;
  // Everything HP combat needs from one reader stat block (or a pasted one).
  function fromStatBlock(sb) {
    const attacks = (sb.actions || []).map(parseAction).filter(Boolean);
    return { hpMax: firstInt(sb.hp), acNum: firstInt(sb.ac), crNum: crValue(sb.cr), attacks, turn: turnOf(sb.actions, attacks), breaks: BREAKS.test(sb.kind || sb.type || '') };
  }
  // Breaking point, Monster Hunter style: the tougher the enemy compared with the party, the longer it holds out.
  function breakShare(cr, partyLevel) {
    if (cr == null || !partyLevel) return 0.25;
    const r = cr / partyLevel; return r <= 0.25 ? 0.30 : r <= 0.5 ? 0.25 : r <= 1 ? 0.20 : 0.15;
  }
  /* ---- heroes ---- */
  // Starter attack per class: a simple, editable default (weapon adds the ability modifier; cantrip dice grow at 5/11/17).
  const STARTER = {
    Fighter: { name: 'Greatsword', ability: 'STR', dice: '2d6', kind: 'weapon' },
    Barbarian: { name: 'Greataxe', ability: 'STR', dice: '1d12', kind: 'weapon' },
    Paladin: { name: 'Longsword', ability: 'STR', dice: '1d8', kind: 'weapon' },
    Ranger: { name: 'Longbow', ability: 'DEX', dice: '1d8', kind: 'weapon' },
    Rogue: { name: 'Rapier', ability: 'DEX', dice: '1d8', kind: 'weapon', extra: 'sneak' },
    Bard: { name: 'Rapier', ability: 'DEX', dice: '1d8', kind: 'weapon' },
    Cleric: { name: 'Sacred Flame', ability: 'WIS', dice: '1d8', kind: 'cantrip' },
    Druid: { name: 'Produce Flame', ability: 'WIS', dice: '1d8', kind: 'cantrip' },
    Warlock: { name: 'Eldritch Blast', ability: 'CHA', dice: '1d10', kind: 'cantrip' },
    Wizard: { name: 'Fire Bolt', ability: 'INT', dice: '1d10', kind: 'cantrip' }
  };
  const EXTRA_ATTACK = ['Fighter', 'Barbarian', 'Paladin', 'Ranger'];
  const profFor = level => 2 + Math.floor((Math.max(1, level) - 1) / 4);
  const mod = s => Math.floor(((Number(s) || 10) - 10) / 2);
  // What one Attack action is for this hero right now: attack bonus (always proficient), damage per hit, attacks per action.
  function heroAttack(p) {
    // A hero built in the creator carries its real attacks (from its weapons and cantrips); the first one is used.
    const built = (p.attacks || [])[0];
    if (built && Number.isFinite(built.bonus) && built.damage) return { name: built.name, bonus: built.bonus, damage: built.damage, count: built.count || 1, sneak: /\d+d6$/.test(built.damage) && p.cls === 'Rogue' };
    const a = p.attack || STARTER[p.cls] || STARTER.Fighter, level = Number(p.level) || 1;
    const m = mod(p.abil?.[a.ability]), prof = Number(p.prof) || profFor(level);
    let damage = a.dice, count = 1;
    if (a.kind === 'cantrip') { const n = 1 + (level >= 5) + (level >= 11) + (level >= 17); damage = a.dice.replace(/^(\d+)d/, (_, k) => `${k * n}d`); }
    else { damage += m ? (m > 0 ? '+' : '') + m : ''; if (EXTRA_ATTACK.includes(p.cls)) count = p.cls === 'Fighter' ? 1 + (level >= 5) + (level >= 11) + (level >= 20) : 1 + (level >= 5); }
    if (a.extra === 'sneak') damage += `+${Math.ceil(level / 2)}d6`; // Sneak Attack rides on the rogue's one attack
    return { name: a.name, bonus: m + prof, damage, count, sneak: a.extra === 'sneak' };
  }
  // Combat-only selection: different weapons may be chosen for separate rolls in one Attack action.
  // Keep the first attack's count: a cantrip cannot gain extra weapon attacks, nor vice versa.
  // Creator attacks are authoritative; changing the first selection changes the
  // total number of rolls (e.g. weapon Extra Attack versus a one-roll cantrip).
  // Later selections must use the same action count. This blocks extra spell
  // casts and never grants extra attacks simply because another weapon exists.
  function heroAttackOptions(p) {
    const primary = heroAttack(p), seen = new Set();
    const matching = (p.attacks || []).filter(a => a && typeof a.name === 'string'
      && Number.isFinite(a.bonus) && typeof a.damage === 'string'
      && a.damage.trim() && Number.isInteger(Number(a.count || 1))
      && Number(a.count || 1) >= 1 && Number(a.count || 1) <= 4);
    const options = matching.filter(a => {
      if (seen.has(a.name)) return false;
      seen.add(a.name); return true;
    }).map(a => ({ name: a.name, bonus: a.bonus, damage: a.damage, count: Number(a.count || 1) }));
    return options.length ? options : [primary];
  }
  function heroAttackSequence(p, names = []) {
    const options = heroAttackOptions(p);
    const first = options.find(a => a.name === names?.[0]) || options[0];
    const matching = options.filter(a => a.count === first.count);
    return Array.from({ length: first.count }, (_, i) =>
      matching.find(a => a.name === names?.[i]) || first);
  }
  /* ---- SRD 5.1 lookup (src/app/srd-monsters.js) ---- */
  // Exact names only, after removing what books and cards add: numbers ("Goblin 3"), "mob", sizes ("Chimera, L"),
  // plurals ("goblins", "wolves") and "Elf, Drow" ordering. No fuzzy matching: a wrong monster is worse than asking.
  let index = null;
  const key = s => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function srdIndex() {
    if (index || !root.QBSRD) return index;
    index = new Map(root.QBSRD.monsters.map(r => [key(r[0]), r]));
    return index;
  }
  function nameVariants(name) {
    const parts = String(name || '').split(',').map(x => x.trim()).filter(x => x && !/^(t|s|m|l|h|g)$/i.test(x));
    const base = parts.join(' ').replace(/\s+(mob\s*)?\d+$/i, '').replace(/\s+mob$/i, '');
    const out = new Set([base, parts.slice().reverse().join(' '), ...parts, ...[...base.matchAll(/\(([^)]+)\)/g)].map(m => m[1])]); // "Snow Ape (ape)"
    for (const v of [...out]) { out.add(v.replace(/ies$/i, 'y')); out.add(v.replace(/ves$/i, 'f')); out.add(v.replace(/es$/i, '')); out.add(v.replace(/s$/i, '')); }
    return [...out].map(key).filter(Boolean);
  }
  function srdMatch(name) {
    const idx = srdIndex(); if (!idx) return null;
    for (const v of nameVariants(name)) {
      const r = idx.get(v); if (!r) continue;
      const attacks = r[5].map(([n, bonus, damage]) => ({ name: n, bonus, damage }));
      return { hpMax: r[2], acNum: r[3], crNum: r[4], attacks, turn: r[6], type: r[1], breaks: BREAKS.test(r[1]), statsFrom: 'SRD 5.1: ' + r[0] };
    }
    return null;
  }
  // Fill only what is missing: the book's own stat block always wins.
  function fillFromSrd(e) {
    const missing = !Number.isFinite(e.hpMax) || !Number.isFinite(e.acNum) || !(e.attacks || []).length;
    const m = missing && srdMatch(e.name); if (!m) return {};
    const out = { statsFrom: m.statsFrom };
    if (!Number.isFinite(e.hpMax)) out.hpMax = m.hpMax;
    if (!Number.isFinite(e.acNum)) out.acNum = m.acNum;
    if (!Number.isFinite(e.crNum)) out.crNum = m.crNum;
    if (!(e.attacks || []).length) { out.attacks = m.attacks; out.turn = m.turn; }
    if (!e.type) { out.type = m.type; out.breaks = m.breaks; }
    return out;
  }
  // Typical numbers for a challenge rating: the median of the SRD's own monsters at that CR (a suggestion for the DM).
  function suggestFor(cr) {
    if (!root.QBSRD || !Number.isFinite(cr)) return null;
    const rows = root.QBSRD.monsters.filter(r => r[4] === cr && r[5].length); if (!rows.length) return null;
    const med = xs => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const atk = rows.map(r => r[5][0]), typical = atk.slice().sort((a, b) => a[1] - b[1])[Math.floor(atk.length / 2)];
    return { hpMax: med(rows.map(r => r[2])), acNum: med(rows.map(r => r[3])), attack: { name: 'Attack', bonus: med(atk.map(a => a[1])), damage: typical[2] }, from: rows.length };
  }
  const api = { parseAction, parseCardLine, turnOf, fromStatBlock, breakShare, firstInt, crValue, STARTER, heroAttack, heroAttackOptions, heroAttackSequence, profFor, srdMatch, fillFromSrd, suggestFor };
  root.QBAttacks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
