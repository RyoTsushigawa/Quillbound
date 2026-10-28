/* Stakes combat rules: the one rules engine behind the Combat tab.
   Every change to a fight happens here, so every confirmed exchange can be undone.
   Fight state lives in s.combat.lite (the name is kept so older saves still open).
   Version 3: hit points and stamina (prototypes/stakes-v2/RULESET.md). Heroes keep HP, stamina, Hit Dice and
   death saves on their sheet; enemies keep HP on themselves. Every die is fair (rejection sampling). */
(function (root) {
  const actions = {
    attack: { name: 'Attack', hint: 'Roll against the target’s armor. A hit deals your damage; missing by 5 or less still deals half.' },
    defend: { name: 'Defend', hint: 'Cover an ally: their next defense roll gets an opening (roll twice, keep the higher).' },
    help: { name: 'Help', hint: 'Give an ally an opening: roll twice, keep the higher die.' },
    move: { name: 'Move', hint: 'Reach a dangerous position or escape trouble.' },
    improvise: { name: 'Improvise', hint: 'Agree on a concrete result before rolling.' }
  };
  const zones = ['cover', 'center', 'objective'];
  const OUT = ['down', 'dead', 'fled', 'surrendered', 'bargained'];
  const PRIMARY = { Fighter: 'STR', Rogue: 'DEX', Barbarian: 'STR', Paladin: 'STR', Cleric: 'WIS', Bard: 'CHA', Ranger: 'DEX', Warlock: 'CHA', Wizard: 'INT', Druid: 'WIS' };
  const clone = x => JSON.parse(JSON.stringify(x));
  const A = () => root.QBAttacks;
  const mod = s => Math.floor(((Number(s) || 10) - 10) / 2);
  const LANDS = ['crit', 'success', 'mixed'], FAILS = ['mixed', 'setback', 'disaster'];

  // Explicit fictional outcomes, not guesses from free text. Reasons stay in the DM log.
  const contextEvents = {
    trapped: {name:'Trap a limb or equipment', add:'Pinned', reason:'The confirmed action traps a limb or equipment.'},
    disarmed: {name:'Knock a weapon out of reach', add:'Disarmed', reason:'The confirmed action removes access to a weapon.'},
    knockedDown: {name:'Knock someone off their feet', add:'Knocked down', reason:'The confirmed action knocks the target off their feet.'},
    freed: {name:'Remove a restraint', remove:['Pinned','Sword pinned'], reason:'The confirmed action removes the restraint. Other conditions remain.'},
    recoveredWeapon: {name:'Recover a usable weapon', remove:['Disarmed'], reason:'The confirmed action restores access to a weapon.'},
    stoodUp: {name:'Get back on their feet', remove:['Knocked down'], reason:'The confirmed action gets the target back on their feet.'}
  };
  function contextPreview(p) {
    const lands = p.mode === 'enemy' ? ['setback','disaster'].includes(p.band) : LANDS.includes(p.band);
    const enabled = p.mode === 'enemy' ? p.enemyEffect === 'context' : p.action === 'improvise' && p.effect === 'context';
    return lands && enabled ? contextEvents[p.contextEvent] || null : null;
  }
  function clearConditions(s,id,labels) {
    const l=init(s);const removed=l.conditions[id].filter(x=>labels.some(y=>y.toLowerCase()===x.toLowerCase()));
    l.conditions[id]=l.conditions[id].filter(x=>!removed.includes(x));
    for(const label of removed)if(l.conditionNotes[id])delete l.conditionNotes[id][label];
    return removed;
  }

  /* ---- fair dice ---- */
  // Rejection sampling: values that would make some faces more likely are thrown away, so each face is exactly 1/sides.
  function die(sides) { const limit = 4294967296 - (4294967296 % sides), v = new Uint32Array(1); do { root.crypto.getRandomValues(v); } while (v[0] >= limit); return 1 + (v[0] % sides); }
  const d20 = () => die(20);
  // "2d6+3", "1d4+4+5d6": every die rolled fairly; a critical hit doubles the dice, not the flat bonus.
  function rollDamage(expr, crit = false) {
    let total = 0;
    for (const m of String(expr || '').replace(/\s/g, '').matchAll(/([+-]?)(\d*)d(\d+)|([+-]?\d+)/g)) {
      if (m[3]) { const n = (+(m[2] || 1)) * (crit ? 2 : 1), sign = m[1] === '-' ? -1 : 1; for (let i = 0; i < n; i++) total += sign * die(+m[3]); }
      else if (m[4]) total += +m[4];
    }
    return Math.max(0, total);
  }

  /* ---- state ---- */
  const hero = (s, id) => s.party.some(p => p.id === id);
  const partyLevel = s => { const ls = s.party.map(p => Number(p.level) || 1); return ls.length ? ls.reduce((a, b) => a + b, 0) / ls.length : 1; };
  const staminaMax = p => Number(p.prof) || A().profFor(Number(p.level) || 1);
  function prepareHero(p) {
    if (!(Number(p.hp) > 0)) p.hp = Math.max(1, Number(p.hp) || 1);
    if (!Number.isFinite(p.hpNow)) p.hpNow = p.hp;
    if (!Number.isFinite(p.stamina)) p.stamina = staminaMax(p);
    if (!p.hitDice) p.hitDice = { die: 8, left: Number(p.level) || 1 };
  }
  function prepareFoe(s, f) {
    const n = A();
    f.hpMax ??= n.firstInt(f.hp); f.acNum ??= n.firstInt(f.ac); f.crNum ??= n.crValue(f.cr); f.attacks ??= []; f.turn ??= [];
    if (n.fillFromSrd) Object.assign(f, n.fillFromSrd(f)); // standard monsters missing numbers: SRD 5.1, never over the book
    f.breaks ??= /humanoid|beast|monstrosity/i.test(f.type || f.kind || '');
    if (!Number.isFinite(f.hpNow) && Number.isFinite(f.hpMax)) f.hpNow = f.status === 'down' ? 0 : f.hpMax;
    if (f.breakHp === undefined && f.breaks && Number.isFinite(f.hpMax)) f.breakHp = Math.ceil(f.hpMax * n.breakShare(f.crNum, partyLevel(s)));
  }
  function init(s) {
    const c = s.combat; if (!c) return null;
    if (!c.lite) c.lite = {
      version: 3,
      draft: { actor: (s.party.find(p => !(p.hpNow <= 0) && !c.acted?.[p.id]) || s.party[0])?.id || '', action: 'attack', target: c.foes.find(f => !OUT.includes(f.status))?.id || '', ability: '', trained: true, intent: '', stakes: '', effect: 'condition', condition: 'Disarmed', destination: 'objective', die: '', mode: 'hero', threat: 'An enemy strikes' },
      zones: { cover: 'Cover', center: 'Open ground', objective: 'The objective' },
      positions: {}, conditions: {}, protected: {}, openings: {}, acted: { ...(c.acted || {}) }, history: [], pending: null, lastRoll: null
    };
    const l = c.lite;
    l.conditionNotes ??= {}; l.secretRolls ??= []; l.breaking ??= {}; l.broke ??= {}; l.protected ??= {}; l.openings ??= {};
    l.draft.contextEvent ??= 'trapped'; l.draft.stakes ??= ''; l.draft.enemyOutcome ??= ''; l.draft.enemyCondition ??= 'Pinned';
    if (!l.draft.enemyEffect || l.draft.enemyEffect === 'wound') l.draft.enemyEffect = 'damage';
    if (l.draft.effect === 'wound') l.draft.effect = 'damage';
    if ((l.version || 1) < 3) convert(s, l);
    s.party.forEach(prepareHero); c.foes.forEach(f => prepareFoe(s, f));
    for (const a of [...s.party, ...c.foes]) {
      if (!(a.id in l.positions)) l.positions[a.id] = hero(s, a.id) ? 'cover' : 'center';
      if (!(a.id in l.conditions)) l.conditions[a.id] = [];
    }
    return l;
  }
  // Fights saved under the wound rules: wounds become lost HP by share, mobs become members. Undo stops here.
  function convert(s, l) {
    const c = s.combat, wounds = l.wounds || {};
    if ((l.version || 1) < 2) for (const f of c.foes) { const marks = f.marks || []; if (marks.length && l.conditions?.[f.id]) { l.conditions[f.id] = l.conditions[f.id].filter(x => !marks.includes(x)); wounds[f.id] = Math.max(wounds[f.id] || 0, marks.length); } }
    const book = f => (s.bestiary || []).find(b => b.id === f.ref) || (s.bestiary || []).find(b => b.name.toLowerCase() === f.name.replace(/\s+(mob\s+)?\d+$/i, '').replace(/\s+mob$/i, '').toLowerCase()) || {};
    const stats = f => { const b = book(f), n = A(); return { hpMax: f.hpMax ?? b.hpMax ?? n.firstInt(f.hp ?? b.hp), acNum: f.acNum ?? b.acNum ?? n.firstInt(f.ac ?? b.ac), crNum: f.crNum ?? b.crNum ?? n.crValue(f.cr ?? b.cr), attacks: f.attacks || b.attacks || [], turn: f.turn || b.turn || [], type: f.type || b.type || '', ref: f.ref || b.id }; };
    for (const p of s.party) {
      prepareHero(p);
      const w = Math.min(4, wounds[p.id] ?? (p.conds || []).filter(Boolean).length);
      p.hpNow = w >= 4 ? 0 : Math.max(1, Math.round(p.hp * (1 - w / 4)));
      p.stamina = staminaMax(p); p.conds = [null, null, null, null];
    }
    const foes = [];
    for (const f of c.foes) {
      const st = stats(f);
      if (f.mob) {
        const size = f.size || f.slots || 1, gone = Math.min(size, wounds[f.id] || 0), base = f.name.replace(/\s+mob(\s+\d+)?$/i, '');
        for (let i = 0; i < size; i++) {
          const id = f.id + '-' + (i + 1), out = i < gone;
          foes.push({ ...f, ...st, id, name: base + ' ' + (i + 1), mob: undefined, size: undefined, group: f.id, groupName: base, status: out ? 'down' : f.status, hpNow: out ? 0 : st.hpMax });
          l.positions[id] = l.positions[f.id]; l.conditions[id] = [...(l.conditions[f.id] || [])]; if (l.acted?.[f.id]) l.acted[id] = true;
        }
      } else {
        const cap = Math.max(1, Number(f.slots) || 2), w = Math.min(cap, wounds[f.id] || 0);
        foes.push({ ...f, ...st, hpNow: f.status === 'down' || w >= cap ? 0 : Number.isFinite(st.hpMax) ? Math.max(1, Math.round(st.hpMax * (1 - w / cap))) : null });
      }
    }
    c.foes = foes;
    delete l.wounds; delete l.dramaUsed; delete l.dramaTried; delete l.lastDrama; delete s.dramaSettings;
    l.history = []; l.pending = null; l.version = 3;
    log(s, 'This fight was converted from wound boxes to hit points: lost wounds became lost HP by share, and stamina starts full. Undo cannot go back past this point.');
  }
  function actor(s, id) { return [...s.party, ...(s.combat?.foes || [])].find(x => x.id === id); }
  function active(s, a) {
    if (!a || OUT.includes(a.status)) return false;
    return hero(s, a.id) ? a.hpNow > 0 && !a.dead : !(Number.isFinite(a.hpNow) && a.hpNow <= 0);
  }
  // What a combatant still needs before it can be rolled for (an enemy without a stat block).
  function needs(s, a) {
    if (!a || hero(s, a.id)) return [];
    return [!Number.isFinite(a.hpMax) && 'hit points', !Number.isFinite(a.acNum) && 'armor class', !(a.attacks || []).length && 'an attack'].filter(Boolean);
  }
  function setStats(s, id, st) {
    const l = init(s), f = actor(s, id); if (!f || hero(s, id)) return; if (l.pending) throw Error('Finish the current roll first.');
    const hp = Math.round(Number(st.hpMax)), ac = Math.round(Number(st.acNum));
    if (st.hpMax !== undefined && !(hp > 0)) throw Error('Hit points must be a whole number above 0.');
    if (st.acNum !== undefined && !(ac > 0)) throw Error('Armor class must be a whole number above 0.');
    if (st.attack && (!Number.isFinite(Number(st.attack.bonus)) || !/^\s*\d*d?\d+(\s*[+-]\s*\d*d?\d+)*\s*$/.test(st.attack.damage || ''))) throw Error('Give the attack a bonus like +4 and damage like 1d6+2.');
    remember(s);
    // The numbers belong to the creature: they go to every member of its group and to its bestiary entry, so the DM types them once.
    const atk = st.attack && { name: String(st.attack.name || 'Attack').slice(0, 60), bonus: Number(st.attack.bonus), damage: String(st.attack.damage).replace(/\s/g, '') };
    const kin = f.group ? s.combat.foes.filter(x => x.group === f.group) : [f], book = (s.bestiary || []).find(b => b.id === f.ref);
    for (const x of kin) {
      if (st.hpMax !== undefined) { const lost = Number.isFinite(x.hpMax) && Number.isFinite(x.hpNow) ? x.hpMax - x.hpNow : 0; x.hpMax = hp; x.hpNow = x.status === 'down' ? 0 : Math.max(0, hp - lost); delete x.breakHp; }
      if (st.acNum !== undefined) x.acNum = ac;
      if (atk) { x.attacks = [atk, ...(x.attacks || []).filter(a => a.name !== atk.name)]; x.turn = [atk.name]; }
      prepareFoe(s, x);
    }
    if (book) { if (st.hpMax !== undefined) book.hpMax = hp; if (st.acNum !== undefined) book.acNum = ac; if (atk) { book.attacks = [atk, ...(book.attacks || []).filter(a => a.name !== atk.name)]; book.turn = [atk.name]; } }
    log(s, `${f.group ? f.groupName || f.name : f.name}: numbers set by the DM.`);
  }
  function remember(s) { const l = init(s); const history = l.history; const c = { ...s.combat, lite: { ...l, history: [], pending: null } }; history.push(clone({ combat: c, party: s.party })); if (history.length > 20) history.shift(); }
  function undo(s) { const l = init(s), prior = l.history.pop(); if (!prior) return false; const history = l.history; s.combat = prior.combat; s.party = prior.party; s.combat.lite.history = history; return true; }
  function log(s, text, kind = 'scene') { s.combat.log.unshift({ kind, text }); }

  /* ---- a roll ---- */
  // Stakes bands for actions that are not attacks or defense (Help, Move, Improvise, Defend).
  function grade(die, total) { if (die === 20) return 'crit'; if (die === 1) return 'disaster'; return total >= 15 ? 'success' : total >= 8 ? 'mixed' : 'setback'; }
  // An attack against armor: hit at AC or more, graze ("mixed") up to 5 below.
  function attackBand(die, total, ac) { if (die === 20) return 'crit'; if (die === 1) return 'disaster'; return total >= ac ? 'success' : total >= ac - 5 ? 'mixed' : 'setback'; }
  // A hero's defense: d20 + AC − 10 must beat 11 + the attack bonus (a tie hits). Exactly 5e's chance to be hit.
  function defenseBand(die, total, atk) { if (die === 20) return 'crit'; if (die === 1) return 'disaster'; return total >= 12 + atk ? 'success' : 'setback'; }
  function bonus(p, ability, trained) { return mod(p?.abil?.[ability]) + (trained ? Number(p?.prof) || 0 : 0); }
  function targets(s, d) {
    if (d.mode === 'enemy') return s.party.filter(p => active(s, p));
    if (d.action === 'attack') return s.combat.foes.filter(f => active(s, f));
    if (d.action === 'defend') return s.party.filter(p => active(s, p));
    if (d.action === 'help') return s.party.filter(p => p.id !== d.actor && active(s, p));
    if (d.action === 'improvise') return [...s.combat.foes, ...s.party].filter(p => active(s, p));
    return [];
  }
  // Non-attack actions pick the ability and training from the rolling hero's sheet.
  function configure(s, d) {
    const p = s.party.find(p => p.id === (d.mode === 'enemy' ? d.target : d.actor)); if (!p) return;
    const best = keys => keys.reduce((a, b) => (Number(p.abil?.[b]) || 10) > (Number(p.abil?.[a]) || 10) ? b : a);
    const action = d.mode === 'enemy' ? 'defend' : d.action;
    let ability = action === 'move' ? 'DEX' : action === 'defend' ? best(['DEX', 'CON']) : PRIMARY[p.cls] || 'STR';
    if (action === 'improvise' && d.effect === 'condition') {
      const label = d.condition || '';
      if (/pin|disarm|knock|push|hold/i.test(label)) ability = best(['STR', 'DEX']);
      else if (/fear|shak|distract|intimidat/i.test(label)) ability = 'CHA';
      else if (/hidden|hide|sneak/i.test(label)) ability = 'DEX';
      else if (/spell|confus|plan/i.test(label)) ability = best(['INT', 'WIS']);
    }
    const sheet = p.combatActions?.[action];
    d.ability = sheet?.ability && p.abil?.[sheet.ability] !== undefined ? sheet.ability : ability;
    d.trained = typeof sheet?.trained === 'boolean' ? sheet.trained : (p.trained || []).includes(d.ability);
  }
  const enemyAttacks = f => (f.turn?.length ? f.turn : (f.attacks || []).slice(0, 1).map(a => a.name)).map(n => (f.attacks || []).find(a => a.name === n)).filter(Boolean);
  // How many d20s this exchange needs: one per attack for Attack and for a damaging enemy move, otherwise one.
  function rollsNeeded(s, d) {
    if (d.mode === 'enemy') return (d.enemyEffect || 'damage') === 'damage' ? Math.max(1, enemyAttacks(actor(s, d.actor) || {}).length) : 1;
    if (d.action === 'attack') return A().heroAttack(actor(s, d.actor) || {}).count;
    return 1;
  }
  // The roller may roll twice on the first die: an opening from Help, or on defense the cover of a Defend.
  const hasEdge = (l, d, roller) => !!(l.openings[roller] || (d.mode === 'enemy' && l.protected[roller]));
  function rollFor(s, d) { const l = init(s), roller = d.mode === 'enemy' ? d.target : d.actor; return Array.from({ length: rollsNeeded(s, d) }, (_, i) => i === 0 && hasEdge(l, d, roller) ? [d20(), d20()] : d20()); }
  function prepare(s, d, rolls) {
    const l = init(s); configure(s, d);
    const a = actor(s, d.actor);
    if (l.pending) throw Error('Confirm or cancel the current roll first.');
    if (!active(s, a)) throw Error('Choose a character who can act.');
    if (l.acted[a.id]) throw Error('This character has acted. Start the next round or choose someone else.');
    const effect = d.mode === 'enemy' ? (d.enemyEffect === 'wound' ? 'damage' : d.enemyEffect || 'damage') : null;
    if (d.mode === 'enemy' && !['damage','position','condition','goal','context'].includes(effect)) throw Error('Choose an enemy consequence.');
    if (d.mode === 'enemy' && effect !== 'damage' && !d.enemyOutcome?.trim()) throw Error('Describe the consequence before rolling defense.');
    if (d.mode === 'enemy' && effect === 'condition' && !d.enemyCondition?.trim()) throw Error('Name the condition before rolling.');
    if ((d.mode === 'enemy' ? effect === 'context' : d.action === 'improvise' && d.effect === 'context') && !contextEvents[d.contextEvent]) throw Error('Choose the fictional outcome.');
    if (!actions[d.action]) throw Error('Choose an action.');
    const needTarget = d.mode === 'enemy' || ['attack', 'defend', 'help'].includes(d.action) || (d.action === 'improvise' && d.effect !== 'objective');
    const t = actor(s, d.target);
    if (needTarget && !targets(s, d).some(x => x.id === d.target)) throw Error('Choose a valid target.');
    if (d.mode !== 'enemy' && d.action === 'improvise' && !d.intent.trim()) throw Error('Describe what your idea will accomplish before rolling.');
    if (d.mode !== 'enemy' && d.action === 'improvise' && d.effect === 'condition' && !d.condition.trim()) throw Error('Name the condition you want to create.');
    if ((d.action === 'move' || (d.mode === 'enemy' && effect === 'position')) && !zones.includes(d.destination)) throw Error('Choose a destination.');
    const foe = d.mode === 'enemy' ? a : d.action === 'attack' ? t : null, missing = needs(s, foe);
    if (foe && missing.length) throw Error(`${foe.name} needs ${missing.join(', ')} before this roll. Add them on the enemy card.`);
    rolls = Array.isArray(rolls) ? rolls : [rolls];
    const roller = d.mode === 'enemy' ? t : a, edge = hasEdge(l, d, roller.id);
    if (rolls.length !== rollsNeeded(s, d)) throw Error(`This exchange needs ${rollsNeeded(s, d)} d20${rollsNeeded(s, d) > 1 ? 's' : ''}.`);
    const kept = rolls.map((r, i) => {
      const dice = Array.isArray(r) ? r : [r];
      if (!dice.every(v => Number.isInteger(v) && v >= 1 && v <= 20)) throw Error('Enter a whole number from 1 to 20.');
      if (dice.length > (i === 0 && edge ? 2 : 1)) throw Error('Only an opening allows a second die, on the first roll.');
      return { dice, die: Math.max(...dice) };
    });
    const stakes = (d.stakes || '').trim();
    const p = { ...clone(d), enemyEffect: effect || d.enemyEffect, stakes, roller: roller.id, edgeUsed: edge && kept[0].dice.length > 1, cost: { stamina: 0, hd: 0 }, consequence: stakes ? 'goal' : 'position', consequenceText: stakes || 'The enemy gains ground.', striker: s.combat.foes.find(f => active(s, f))?.id || '', reward: 'opening', rewardTarget: s.party.find(x => active(s, x))?.id || '', confirmed: false };
    if (d.mode === 'enemy') {
      const atks = effect === 'damage' ? enemyAttacks(a) : [enemyAttacks(a).reduce((x, y) => y.bonus > x.bonus ? y : x)];
      p.rolls = kept.map((k, i) => { const atk = atks[i], b = Number(t.ac) - 10, total = k.die + b, band = defenseBand(k.die, total, atk.bonus);
        return { ...k, bonus: b, total, band, against: 12 + atk.bonus, attack: atk.name, expr: atk.damage, damage: effect === 'damage' && FAILS.includes(band) ? rollDamage(atk.damage, band === 'disaster') : 0 }; });
    } else if (d.action === 'attack') {
      const atk = A().heroAttack(a), back = enemyAttacks(t)[0];
      p.rolls = kept.map(k => { const total = k.die + atk.bonus, band = attackBand(k.die, total, t.acNum);
        return { ...k, bonus: atk.bonus, total, band, against: t.acNum, attack: atk.name, expr: atk.damage, damage: null, push: null,
          strike: { by: t.id, name: back?.name || 'Attack', damage: back ? rollDamage(back.damage, band === 'disaster') : 0, reach: true } }; });
    } else {
      const b = bonus(roller, d.ability, d.trained), k = kept[0], total = k.die + b, band = grade(k.die, total);
      p.rolls = [{ ...k, bonus: b, total, band, push: null, expr: d.action === 'improvise' && d.effect === 'damage' ? A().heroAttack(a).damage : null, damage: null }];
    }
    sync(p);
    // Player dice are public the moment they are rolled; Undo never removes them.
    s.publicRolls ??= [];
    for (const r of p.rolls) s.publicRolls.push({ id: root.crypto.randomUUID?.() || String(Date.now()) + '-' + s.publicRolls.length, die: r.die, dice: r.dice.slice(), total: r.total, band: r.band, roller: roller.name || 'Hero' });
    while (s.publicRolls.length > 20) s.publicRolls.shift();
    l.pending = p;
    return p;
  }
  // The pending exchange's headline band and total follow its first roll (used by the log and the player screen).
  function sync(p) { p.die = p.rolls[0].die; p.dice = p.rolls[0].dice; p.total = p.rolls[0].total; p.bonus = p.rolls[0].bonus; p.band = p.rolls.reduce((best, r) => LANDS.indexOf(r.band) >= 0 && (LANDS.indexOf(best) < 0 || LANDS.indexOf(r.band) < LANDS.indexOf(best)) ? r.band : best, p.rolls[0].band); }

  /* ---- stamina ---- */
  // Push: +1d4 on one of your own action's rolls. Paid with stamina, or, when Winded, with a Hit Die (overexert).
  function pushInfo(s, i = 0) {
    const l = init(s), p = l.pending, r = p?.rolls?.[i], a = p && actor(s, p.actor);
    if (!p || p.mode === 'enemy' || !r) return { ok: false, why: 'Only your own action’s roll can be pushed.' };
    if (r.push) return { ok: false, why: 'This roll is already pushed.' };
    if (r.die === 1 || r.die === 20) return { ok: false, why: 'A natural 1 or 20 stands.' };
    if (!FAILS.includes(r.band)) return { ok: false, why: 'This roll already succeeds.' };
    const sta = a.stamina - p.cost.stamina, hd = a.hitDice.left - p.cost.hd;
    if (sta > 0) return { ok: true, pay: 'stamina', left: sta };
    if (hd > 0) return { ok: true, pay: 'hitdie', left: hd };
    return { ok: false, why: 'No stamina or Hit Dice left. A long rest restores them.' };
  }
  function push(s, i = 0, d4 = die(4)) {
    const l = init(s), p = l.pending, info = pushInfo(s, i); if (!info.ok) throw Error(info.why);
    if (!Number.isInteger(d4) || d4 < 1 || d4 > 4) throw Error('Enter a d4 result from 1 to 4.');
    const r = p.rolls[i], t = actor(s, p.target);
    if (info.pay === 'stamina') p.cost.stamina++; else p.cost.hd++;
    r.push = { d4, pay: info.pay }; r.total += d4;
    r.band = p.action === 'attack' ? attackBand(r.die, r.total, t.acNum) : grade(r.die, r.total);
    sync(p); return r;
  }

  /* ---- damage ---- */
  // A landed hit needs its damage: entered from the table's dice, or rolled fairly here. Grazes deal half at confirm.
  function damage(s, i, n) {
    const l = init(s), r = l.pending?.rolls?.[i]; if (!r || !r.expr) throw Error('This roll has no damage to set.');
    if (n === undefined || n === '') n = rollDamage(r.expr, r.band === 'crit');
    n = Number(n); if (!Number.isInteger(n) || n < 0 || n > 999) throw Error('Enter the damage as a whole number from 0 to 999.');
    r.damage = n; return n;
  }
  const dealt = r => r.band === 'mixed' && r.attack !== undefined && r.against !== undefined && r.strike ? Math.floor(r.damage / 2) : r.damage;
  function hurt(s, id, n) {
    const a = actor(s, id); if (!a || !(n > 0)) return a ? `${a.name} takes no damage.` : '';
    if (hero(s, id)) {
      const before = a.hpNow; a.hpNow = Math.max(0, a.hpNow - n);
      if (before <= 0) { a.dying ??= { s: 0, f: 0 }; a.dying.f += 1; if (n >= a.hp || a.dying.f >= 3) { a.dead = true; return `${a.name} takes ${n} damage while dying and dies.`; } return `${a.name} takes ${n} damage while dying: one failed death save.`; }
      if (a.hpNow === 0) { if (n - before >= a.hp) { a.dead = true; return `${a.name} takes ${n} damage and dies outright.`; } a.dying = { s: 0, f: 0 }; return `${a.name} takes ${n} damage and drops to 0 HP: dying.`; }
      return `${a.name} takes ${n} damage (${a.hpNow}/${a.hp} HP).`;
    }
    a.hpNow = Math.max(0, (Number.isFinite(a.hpNow) ? a.hpNow : 0) - n);
    if (a.hpNow === 0) { a.status = 'down'; const l = init(s); delete l.breaking[id]; return `${a.name} takes ${n} damage and is out of the fight.`; }
    return `${a.name} takes ${n} damage.`;
  }
  function heal(s, id, n) {
    const a = actor(s, id); if (!a || !(n > 0) || a.dead) return '';
    if (hero(s, id)) { a.hpNow = Math.min(a.hp, a.hpNow + n); a.dying = null; return `${a.name} regains ${n} HP (${a.hpNow}/${a.hp}).`; }
    if (!Number.isFinite(a.hpMax)) return '';
    a.hpNow = Math.min(a.hpMax, a.hpNow + n); if (a.status === 'down') a.status = 'fighting'; return `${a.name} regains ${n} HP.`;
  }
  // 5e death save with a fair d20: 10+ succeeds, a 20 brings the hero back with 1 HP, a 1 counts twice.
  function deathSave(s, id, roll = d20()) {
    const a = actor(s, id); if (!a || !hero(s, id) || a.hpNow > 0 || a.dead || !a.dying) throw Error('Only a dying hero makes death saves.');
    if (!Number.isInteger(roll) || roll < 1 || roll > 20) throw Error('Enter a whole number from 1 to 20.');
    if (s.combat) remember(s);
    let text;
    if (roll === 20) { a.hpNow = 1; a.dying = null; text = `${a.name} rolls a natural 20 on a death save and is back up with 1 HP.`; }
    else { if (roll >= 10) a.dying.s++; else a.dying.f += roll === 1 ? 2 : 1;
      if (a.dying.f >= 3) { a.dead = true; text = `${a.name} fails a third death save and dies.`; }
      else if (a.dying.s >= 3) { a.dying = { s: 3, f: a.dying.f, stable: true }; text = `${a.name} is stable at 0 HP.`; }
      else text = `${a.name} death save: ${roll} (${a.dying.s} successes, ${a.dying.f} failures).`; }
    if (s.combat) log(s, text, roll === 20 ? 'crit' : roll === 1 ? 'disaster' : 'scene');
    return { roll, text };
  }

  /* ---- rests ---- */
  // Short rest: spend Hit Dice to heal (each die + CON modifier, at least 0). Long rest: everything back.
  function shortRest(s, spend) {
    if (s.combat) throw Error('End the fight before resting.');
    const out = [];
    for (const p of s.party) { prepareHero(p); let n = Math.min(Number(spend?.[p.id]) || 0, p.hitDice.left); if (p.dead || p.hpNow <= 0) n = 0;
      let healed = 0; for (; n > 0 && p.hpNow < p.hp; n--) { const h = Math.max(0, die(p.hitDice.die) + mod(p.abil?.CON)); p.hitDice.left--; healed += h; p.hpNow = Math.min(p.hp, p.hpNow + h); }
      if (healed) out.push(`${p.name} regains ${healed} HP (${p.hpNow}/${p.hp}).`); }
    return out;
  }
  function longRest(s) {
    if (s.combat) throw Error('End the fight before resting.');
    for (const p of s.party) { prepareHero(p); if (p.dead) continue; p.hpNow = p.hp; p.hitDice.left = Number(p.level) || 1; p.stamina = staminaMax(p); p.dying = null; }
    return 'Long rest: full HP, all Hit Dice and full stamina.';
  }

  /* ---- breaking points ---- */
  // An enemy that reaches its breaking point stops to decide: flee, surrender, make a deal, or fight on. The DM chooses.
  // Tough enemies (compared with the party) hold out longer: 30% → 15% HP. A group breaks when half of it is down.
  function groups(s) { const g = {}; for (const f of s.combat.foes) if (f.group) (g[f.group] ||= []).push(f); return g; }
  function checkBreaking(s) {
    const l = init(s);
    for (const f of s.combat.foes) {
      if (!f.breaks || !Number.isFinite(f.breakHp) || l.broke[f.id] || l.broke[f.group] || l.breaking[f.id] || !active(s, f)) continue;
      if (f.hpNow <= f.breakHp) { l.breaking[f.id] = true; log(s, `${f.name} is wavering${f.breaking ? ': ' + f.breaking : ''}. What do they do?`, 'break'); }
    }
    for (const [g, members] of Object.entries(groups(s))) {
      if (members.length < 3 || !members[0].breaks || l.broke[g] || l.breaking[g]) continue;
      const down = members.filter(f => !active(s, f)).length;
      if (down >= members.length / 2 && down < members.length) { l.breaking[g] = true; log(s, `${members[0].groupName || 'The group'}: half of them are down and the rest lose heart. What do they do?`, 'break'); }
    }
  }
  const BREAK_TEXT = { fled: 'flees the fight', surrendered: 'surrenders', bargained: 'offers a deal', fighting: 'refuses to break and fights on' };
  function resolveBreak(s, id, choice) {
    const l = init(s);
    if (l.pending) throw Error('Finish the current roll first.');
    const members = groups(s)[id], f = actor(s, id);
    if ((!f && !members) || !BREAK_TEXT[choice]) return;
    remember(s);
    delete l.breaking[id]; l.broke[id] = true;
    for (const x of members || [f]) { if (choice !== 'fighting' && active(s, x)) x.status = choice; if (members) { delete l.breaking[x.id]; l.broke[x.id] = true; } }
    log(s, `${members ? (members[0].groupName || 'The group') : f.name} ${BREAK_TEXT[choice]}.`, 'break');
  }
  // DM correction from the token's Status… menu
  function setStatus(s, id, status) {
    const l = init(s), f = actor(s, id); if (!f) return;
    remember(s); f.status = status; delete l.breaking[id]; if (status !== 'fighting') l.broke[id] = true;
    if (status === 'fighting' && Number.isFinite(f.hpNow) && f.hpNow <= 0) f.hpNow = 1;
    log(s, `${f.name}: ${status}.`);
  }

  /* ---- confirming a roll ---- */
  function apply(s) {
    const l = init(s), p = l.pending; if (!p) return;
    const a = actor(s, p.actor), t = actor(s, p.target);
    if (!active(s, a)) throw Error('The acting character can no longer act. Cancel this roll.');
    if (p.mode === 'enemy' && !active(s, t)) throw Error('Choose a different defender.');
    // Damage typed into the result panel arrives as text; an empty box means "not entered yet".
    const num = v => v === null || v === undefined || v === '' ? null : Number(v), ok = v => v === null || (Number.isInteger(v) && v >= 0 && v <= 999);
    for (const r of p.rolls) { r.damage = num(r.damage); if (r.strike) r.strike.damage = num(r.strike.damage) ?? 0; }
    p.strikeDamage = num(p.strikeDamage) ?? undefined;
    if (!p.rolls.every(r => ok(r.damage) && (!r.strike || ok(r.strike.damage))) || !(p.strikeDamage === undefined || ok(p.strikeDamage))) throw Error('Enter damage as a whole number from 0 to 999.');
    if (p.mode !== 'enemy' && p.rolls.some(r => r.expr && LANDS.includes(r.band) && (p.action === 'attack' || p.effect === 'damage') && r.damage === null)) throw Error('Enter or roll the damage for every hit first.');
    const strikesNeeded = p.mode !== 'enemy' && p.action !== 'attack' && FAILS.includes(p.band);
    if (strikesNeeded && p.consequence === 'goal' && !p.consequenceText.trim()) throw Error('Describe what changes in the scene.');
    if (strikesNeeded && p.consequence === 'strike' && !active(s, actor(s, p.striker))) throw Error('Choose which enemy strikes.');
    if (p.action === 'attack' && p.mode !== 'enemy' && p.rolls.some(r => FAILS.includes(r.band) && !r.strike.reach) && p.consequence === 'goal' && !p.consequenceText.trim()) throw Error('Describe what changes in the scene.');
    remember(s);
    const lines = [];
    // The second die spends one edge: on defense the Defend cover first, otherwise the Help opening.
    if (p.edgeUsed) { if (p.mode === 'enemy' && l.protected[p.roller]) delete l.protected[p.roller]; else delete l.openings[p.roller]; }
    if (p.cost.stamina || p.cost.hd) { a.stamina -= p.cost.stamina; a.hitDice.left -= p.cost.hd; lines.push(`${a.name} pushes: ${[p.cost.stamina && p.cost.stamina + ' stamina', p.cost.hd && p.cost.hd + ' Hit Die (overexert)'].filter(Boolean).join(' and ')}${a.stamina === 0 ? '; now Winded' : ''}.`); }
    const fallback = band => { if (p.consequence === 'goal') lines.push(`${band === 'disaster' ? 'Major reversal' : 'Consequence'}: ${p.consequenceText}`); else { l.positions[a.id] = 'center'; condition(s, a.id, band === 'disaster' ? 'Separated and pinned' : 'Exposed'); lines.push(`${a.name} loses their safe position${band === 'disaster' ? ' and is separated and pinned' : ''}.`); } };
    if (p.mode === 'enemy') {
      p.rolls.forEach((r, i) => {
        if (r.band === 'crit' || r.band === 'success') { lines.push(`${t.name} avoids ${r.attack}${p.rolls.length > 1 ? ' (' + (i + 1) + ')' : ''}.`); return; }
        if (p.enemyEffect === 'damage') { if (!t.dead) lines.push(hurt(s, t.id, r.damage)); return; }
        if (p.enemyEffect === 'position') { l.positions[t.id] = p.destination; lines.push(`${t.name} is moved to ${l.zones[p.destination]}.`); }
        if (p.enemyEffect === 'condition') condition(s, t.id, p.enemyCondition, { description: p.enemyOutcome, clears: 'Resolve the cause in the fiction with the DM.' });
        lines.push(p.enemyOutcome);
      });
    } else if (p.action === 'attack') {
      let missed = false;
      p.rolls.forEach(r => {
        if (LANDS.includes(r.band) && active(s, t)) lines.push((r.band === 'mixed' ? 'Graze: ' : r.band === 'crit' ? 'Critical hit: ' : '') + hurt(s, t.id, dealt(r)));
        if (!FAILS.includes(r.band)) return;
        if (r.strike.reach && active(s, t)) lines.push(`${t.name} strikes back${r.band === 'disaster' ? ' (critical)' : ''}: ` + hurt(s, a.id, r.strike.damage));
        else if (!r.strike.reach && !missed) { missed = true; fallback(r.band); }
      });
    } else if (LANDS.includes(p.band)) {
      if (p.action === 'defend') { l.protected[t.id] = true; lines.push(`${t.name} is covered: an opening on their next defense roll.`); }
      if (p.action === 'help') { l.openings[t.id] = true; lines.push(`${t.name} has an opening on their next roll.`); }
      if (p.action === 'move') { l.positions[a.id] = p.destination; lines.push(`${a.name} reaches ${l.zones[p.destination]}.`); }
      if (p.action === 'improvise') {
        if (p.effect === 'damage') lines.push(hurt(s, t.id, p.rolls[0].damage));
        if (p.effect === 'condition') { condition(s, t.id, p.condition, { description: p.intent, clears: 'Resolve the cause in the fiction with the DM.' }); lines.push(`${t.name}: ${p.condition}. This changes what they can do.`); }
        if (p.effect === 'move') { l.positions[t.id] = p.destination; lines.push(`${t.name} is moved to ${l.zones[p.destination]}.`); }
        lines.push(p.intent);
      }
    }
    if (strikesNeeded) {
      if (p.consequence === 'strike') { const e = actor(s, p.striker), atk = enemyAttacks(e)[0]; lines.push(`${e.name} strikes${p.band === 'disaster' ? ' (critical)' : ''}: ` + hurt(s, a.id, Number.isInteger(p.strikeDamage) ? p.strikeDamage : rollDamage(atk?.damage || '0', p.band === 'disaster'))); }
      else fallback(p.band);
    }
    const crit = p.rolls.some(r => r.band === 'crit') && !(p.mode !== 'enemy' && (p.action === 'attack' || p.effect === 'damage'));
    if (crit) {
      const ally = actor(s, p.rewardTarget);
      if (p.reward === 'move') { l.positions[p.mode === 'enemy' ? t.id : a.id] = p.destination; lines.push(`Seize better ground: ${l.zones[p.destination]}.`); }
      else if (ally && hero(s, ally.id)) { if (p.reward === 'protect') { l.protected[ally.id] = true; lines.push(`${ally.name} is covered.`); } else { l.openings[ally.id] = true; lines.push(`${ally.name} gets an opening.`); } }
    }
    const contextual = contextPreview(p);
    if(contextual && t) {
      if(contextual.add) { condition(s,t.id,contextual.add); lines.push(t.name+': '+contextual.add+'. '+contextual.reason); }
      else { const removed=clearConditions(s,t.id,contextual.remove);lines.push(t.name+': '+(removed.length?'cleared '+removed.join(', '):'no matching condition to clear')+'. '+contextual.reason); }
    }
    if(p.clearExposure && p.mode!=='enemy' && p.action==='move' && LANDS.includes(p.band) && p.destination==='cover' && l.positions[a.id]==='cover') {
      const removed=clearConditions(s,a.id,['Exposed']);if(removed.length)lines.push(a.name+': Exposed cleared after the DM confirmed the new cover provides safety.');
    }
    l.acted[a.id] = true;
    l.lastRoll = { die: p.die, total: p.total, band: p.band, roller: actor(s, p.roller)?.name || '', dice: p.dice };
    const dice = p.rolls.map(r => `d20 ${r.dice.length > 1 ? r.dice.join('/') + '→' : ''}${r.die}${r.push ? ' +d4 ' + r.push.d4 : ''} ${r.bonus >= 0 ? '+' : ''}${r.bonus} = ${r.total}`).join(' · ');
    log(s, `${a.name} · ${p.mode === 'enemy' ? 'enemy move: ' + p.threat : actions[p.action].name} · ${dice}. ${p.rolls.some(r => r.die === 20) ? 'NATURAL 20! ' : p.rolls.some(r => r.die === 1) ? 'NATURAL 1! ' : ''}${p.stakes && p.mode !== 'enemy' ? 'At risk: ' + p.stakes + '. ' : ''}${lines.filter(Boolean).join(' ')}`, p.band);
    l.pending = null; l.draft.intent = ''; l.draft.stakes = ''; l.draft.die = '';
    checkBreaking(s);
    return l.lastRoll;
  }
  function condition(s, id, label, notes) {
    const l = init(s); if (!actor(s, id) || !label.trim()) return;
    label = label.trim().slice(0, 80);
    if (!l.conditions[id].includes(label)) l.conditions[id].push(label);
    if (notes) { l.conditionNotes[id] ??= {}; l.conditionNotes[id][label] = { description: String(notes.description || '').slice(0, 1000), clears: String(notes.clears || '').slice(0, 500) }; }
  }
  function describe(s, id, label) { return root.ConditionGuide.get(label, init(s)?.conditionNotes?.[id]?.[label]); }
  function nextRound(s) { const l = init(s); if (l.pending) throw Error('Finish the current roll first.'); remember(s); s.combat.round++; l.acted = {}; log(s, `Round ${s.combat.round}. Everyone gets a spotlight again.`); }
  function move(s, id, zone) { const l = init(s); if (!zones.includes(zone) || !actor(s, id)) return; if (l.pending) throw Error('Finish this roll before moving tokens.'); if (l.positions[id] === zone) return; remember(s); l.positions[id] = zone; log(s, `${actor(s, id).name} placed in ${l.zones[zone]}.`); }
  // Manual HP correction by the DM (healing magic, potions, a mistake). Positive heals, negative damages.
  function adjust(s, id, n) {
    const l = init(s), a = actor(s, id); n = Number(n); if (!a || l.pending || !Number.isInteger(n) || !n) return;
    remember(s);
    log(s, 'DM adjustment: ' + (n > 0 ? heal(s, id, n) : hurt(s, id, -n)));
    checkBreaking(s);
  }
  // The DM's private roll: never enters the public dice.
  function secret(s, label, b) {
    const l = init(s); b = Number(b);
    if (!Number.isInteger(b) || Math.abs(b) > 100) throw Error('Use a whole-number bonus between −100 and 100.');
    const roll = d20(); const r = { label: String(label || 'Secret check').slice(0, 120), die: roll, bonus: b, total: roll + b };
    l.secretRolls.unshift(r); l.secretRolls.length = Math.min(l.secretRolls.length, 20); return r;
  }

  root.Stakes = { contextEvents, contextPreview, actions, zones, init, actor, hero, active, needs, setStats, remember, undo, grade, attackBand, defenseBand, bonus, targets, configure,
    rollsNeeded, rollFor, prepare, pushInfo, push, damage, rollDamage, apply, nextRound, move, adjust, hurt, heal, deathSave, shortRest, longRest, condition, describe, log, d20, die, secret, resolveBreak, setStatus, groups, staminaMax };
})(globalThis);
