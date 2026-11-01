/* Hero rules (SRD 5.2): a hero is stored as the choices made in the creator; the sheet is always calculated from them.
   Data: src/app/srd-heroes.js (QBHERO). Every die is fair (rejection sampling, as in combat).
   build = { name, species, sub, size, speciesSkill, keenSense, speciesFeat, cls, level,
             abilities: { method: 'array'|'pointbuy'|'roll'|'set', base: {STR..CHA}, rolls },
             background, boost: {ABIL: 1|2}, toolChoice, skills: [], expertise: [], fightingStyle, mastery: [],
             asi: { [level]: { feat, plus: {ABIL: n} } }, hp: { method: 'average'|'roll', rolls: { [level]: n } },
             gear: { cls: optionIndex, bg: optionIndex }, equip: { armor, shield, weapons: [] },
             spells: { cantrips: [], prepared: [] }, featPicks: { [featId]: [...] } } */
(function (root) {
  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ARRAY = [15, 14, 13, 12, 10, 8];
  const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }, POINTS = 27;
  // SRD data plus the homebrew the creator may offer right now (set by the app with setHomebrew).
  let extra = null, merged = null, mergedFrom = null;
  const H = () => {
    const d = root.QBHERO; if (!extra?.backgrounds?.length && !extra?.species?.length && !extra?.classes?.length && !extra?.feats?.length && !extra?.subclasses?.length) return d;
    if (merged && mergedFrom === d) return merged;
    const add = (base, more) => [...base, ...(more || []).filter(b => !base.some(x => x.id === b.id))];
    // homebrew subclasses join copies of their class (the shared data stays untouched)
    const withSubs = c => { const mine = (extra.subclasses || []).filter(s => s.cls === c.id); return mine.length ? { ...c, subclasses: add(c.subclasses || [{ ...c.subclass, source: 'srd' }], mine) } : c; };
    mergedFrom = d; merged = { ...d, backgrounds: add(d.backgrounds, extra.backgrounds), species: add(d.species, extra.species), classes: add(d.classes, extra.classes).map(withSubs), feats: add(d.feats, extra.feats),
      features: Object.assign({}, d.features, ...(extra.classes || []).map(c => c.features || {})) };
    return merged;
  };
  function setHomebrew(x) { extra = x || null; merged = null; }
  const getHomebrew = () => extra;
  const mod = s => Math.floor((Number(s) - 10) / 2);
  const profFor = level => 2 + Math.floor((Math.max(1, level) - 1) / 4);
  const fmt = n => (n >= 0 ? '+' : '') + n;
  const byId = (list, id) => (list || []).find(x => x.id === id);

  /* ---- fair dice ---- */
  function die(sides) { const limit = 4294967296 - (4294967296 % sides), v = new Uint32Array(1); do { root.crypto.getRandomValues(v); } while (v[0] >= limit); return 1 + (v[0] % sides); }
  // 4d6, drop the lowest, six times. The dice are kept so the roll can be shown (and not quietly redone).
  function rollAbilities() { return ABIL.map(() => Array.from({ length: 4 }, () => die(6))); }
  const rollTotal = dice => dice.reduce((a, b) => a + b, 0) - Math.min(...dice);
  const rollHp = hitDie => die(hitDie);

  /* ---- levels and features ---- */
  const cls = b => byId(H().classes, b.cls);
  const levelsUpTo = b => (cls(b)?.levels || []).filter(l => l.level <= (b.level || 1));
  // Training from the class, plus training a (homebrew) subclass adds at its level (an Armorer's heavy armor at 3).
  // The hero's subclass: the one chosen (build.subclass) among the class's subclasses, otherwise the class's SRD subclass.
  const subOf = b => { const c = cls(b); return (c?.subclasses || []).find(s => s.id === b.subclass) || c?.subclass || null; };
  const classProfs = b => [...(cls(b)?.profs || []), ...[...(cls(b)?.profsAt || []), ...(subOf(b)?.profsAt || [])].filter(p => p.level <= (b.level || 1)).map(p => p.prof)];
  const spellList = b => cls(b)?.spellList || subOf(b)?.spell?.list || b.cls; // a homebrew class borrows an SRD class's spell list
  const has = (b, featureId) => levelsUpTo(b).some(l => l.features.includes(featureId));
  const countUpTo = (b, re) => levelsUpTo(b).reduce((n, l) => n + l.features.filter(f => re.test(f)).length, 0);
  const specific = (b, key) => { let v; for (const l of levelsUpTo(b)) if (l.specific && key in l.specific) v = l.specific[key]; return v; };
  // Levels at which the class grants an Ability Score Improvement (or a feat) or the level-19 Epic Boon.
  const asiLevels = b => levelsUpTo(b).filter(l => l.features.some(f => /ability-score-improvement|epic-boon/.test(f))).map(l => l.level);
  const EXPERTISE = { rogue: { 1: 2, 6: 2 }, bard: { 2: 2, 9: 2 }, ranger: { 2: 1, 9: 2 } }; // "deft explorer" gives one at Ranger 2
  // SRD expertise by class, plus a homebrew class's expertise_gain per level
  const expertiseCount = b => Object.entries(EXPERTISE[b.cls] || {}).reduce((n, [lv, k]) => n + (b.level >= +lv ? k : 0), 0) + levelsUpTo(b).reduce((n, l) => n + (l.specific?.expertise_gain || 0), 0);
  const styleLevel = { fighter: 1, paladin: 2, ranger: 2 };

  /* ---- abilities ---- */
  function baseScores(b) {
    const a = b.abilities || {};
    if (a.method === 'roll' && Array.isArray(a.rolls) && a.order) return Object.fromEntries(ABIL.map(k => [k, rollTotal(a.rolls[a.order[k]])]));
    return Object.fromEntries(ABIL.map(k => [k, Number(a.base?.[k]) || 10]));
  }
  function abilityChecks(b) {
    const a = b.abilities || {}, base = baseScores(b), out = [];
    if (a.method === 'pointbuy') {
      const spent = ABIL.reduce((n, k) => n + (POINT_COST[base[k]] ?? 99), 0);
      if (ABIL.some(k => base[k] < 8 || base[k] > 15)) out.push('Point buy scores go from 8 to 15.');
      else if (spent > POINTS) out.push(`Point buy: ${spent} of ${POINTS} points spent.`);
    }
    if (a.method === 'array' && ABIL.map(k => base[k]).sort((x, y) => y - x).join() !== ARRAY.join()) out.push('Use each standard array score once: 15, 14, 13, 12, 10, 8.');
    if (a.method === 'set' && ABIL.some(k => base[k] < 3 || base[k] > 20 || !Number.isInteger(base[k]))) out.push('Set scores are whole numbers from 3 to 20.');
    if (a.method === 'roll' && !(Array.isArray(a.rolls) && a.order)) out.push('Roll the ability scores first.');
    return out;
  }
  function boostCheck(b) {
    const bg = byId(H().backgrounds, b.background); if (!bg) return 'Choose a background.';
    const boost = Object.entries(b.boost || {}).filter(([, v]) => v > 0);
    if (boost.some(([k]) => !bg.abilities.includes(k))) return `${bg.name} can only raise ${bg.abilities.join(', ')}.`;
    const vals = boost.map(([, v]) => v).sort().join();
    if (vals !== '1,2' && vals !== '1,1,1') return `Raise one of ${bg.abilities.join(', ')} by 2 and another by 1, or all three by 1.`;
    return '';
  }
  function scores(b) {
    const s = baseScores(b);
    for (const [k, v] of Object.entries(b.boost || {})) if (s[k] !== undefined) s[k] = Math.min(20, s[k] + (Number(v) || 0));
    for (const lv of asiLevels(b)) { const pick = b.asi?.[lv]; if (!pick?.plus) continue;
      const boon = pick.feat?.startsWith('boon-') || byId(H().feats, pick.feat)?.type === 'epic-boon';
      for (const [k, v] of Object.entries(pick.plus)) if (s[k] !== undefined) s[k] = Math.min(boon ? 30 : 20, s[k] + (Number(v) || 0)); }
    return s;
  }

  // A feat's prerequisites at the level it would be taken: scores and feats from before that level, the class, spellcasting.
  // SRD feats carry no prereq object here (their level is minLevel), so they're always allowed.
  // What stops this hero from taking a feat at a level, in plain words (empty: allowed). Used to list future feats too.
  function featBlockers(b, f, lv) { const out = [], p = f?.prereq || {}, N = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };
    if ((Number(f?.minLevel) || 1) > lv) out.push(`from level ${f.minLevel}`);
    const earlier = { ...b, asi: Object.fromEntries(Object.entries(b.asi || {}).filter(([l]) => +l < lv)) }, s = scores(earlier);
    if ((p.abilities || []).length && !p.abilities.some(k => s[k] >= (Number(p.score) || 13))) out.push(`needs ${p.abilities.map(k => N[k]).join(' or ')} ${Number(p.score) || 13}`);
    if (p.spellcasting && !cls(b)?.spellAbility && !subOf(b)?.spell) out.push('needs the Spellcasting feature');
    if (p.cls && b.cls !== p.cls) out.push(`needs the ${byId(H().classes, p.cls)?.name || p.cls} class`);
    if (p.feat) { const bg = byId(H().backgrounds, b.background); if (![bg?.feat?.id, b.speciesFeat, b.fightingStyle, ...Object.values(earlier.asi).map(x => x?.feat)].includes(p.feat)) out.push(`needs the ${byId(H().feats, p.feat)?.name || p.feat} feat first`); }
    return out; }
  const featAllowed = (b, f, lv) => !featBlockers(b, f, lv).length;

  /* ---- gear ---- */
  // Resolve character-owned weapons without adding them to the global shop or granting proficiency.
  function customWeapon(x){
    if(!x||typeof x!=='object'||! /^[a-zA-Z0-9_-]{1,100}$/.test(String(x.id || '')))return null;
    const legacy=!x.kind&&/^damokles[ -]?schwert$/i.test(String(x.name || ''));
    if(x.kind!=='weapon'&&!legacy)return null;
    const config=x.weapon || {},baseId=config.base || (legacy?'longsword':''),base=H().equipment[baseId];
    if(!base||base.kind!=='weapon')return null;
    const rawBonus=Number(config.magicBonus ?? (legacy?1:0)),magicBonus=Number.isInteger(rawBonus)?Math.max(-3,Math.min(3,rawBonus)):0;
    const requiresAttunement=x.attunement===true||(legacy&&x.attunement===undefined),attuned=x.attuned===true,activeBonus=requiresAttunement&&!attuned?0:magicBonus;
    const dice=/^(?:[1-9]|1[0-2])d(?:4|6|8|10|12)$/.test(config.dice || '')?config.dice:base.dice;
    const type=['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'].includes(config.damageType)?config.damageType:base.type;
    return {...base,id:'custom-'+x.id,kind:'weapon',baseWeapon:baseId,name:String(x.name || base.name).slice(0,120),dice,type,props:[...base.props],magicBonus:activeBonus,configuredBonus:magicBonus,requiresAttunement,attuned,custom:true};
  }
  const item = (id,b) => b&&String(id).startsWith('custom-')?customWeapon((b.customItems || []).find(x=>'custom-'+x?.id===id)):H().equipment[id];
  const gpOf = cost => { const m = String(cost || '').match(/([\d.]+)\s*(gp|sp|cp)/i); return m ? +m[1] * ({ gp: 1, sp: 0.1, cp: 0.01 })[m[2].toLowerCase()] : 0; };
  // The price of `count` of an item (ammunition is sold in bundles: 20 arrows for 1 GP).
  const priceOf = (id, count = 1) => { const e = item(id); return e ? Math.round(gpOf(e.cost) * count / (e.bundle || 1) * 100) / 100 : 0; };
  // Starting kits, plus extra gear: bought with the kits' gold, or granted by the DM (free).
  // b.gear.extra = [{ id, count, how: 'buy' | 'grant' }]
  function inventory(b) {
    const items = [], add = (opt, from) => { if (!opt) return; for (const it of opt.items) items.push({ ...it, from }); };
    const c = cls(b), bg = byId(H().backgrounds, b.background);
    if (c?.equipment) add(c.equipment.choices[b.gear?.cls ?? 0], c.name);
    if (bg?.equipment) add(bg.equipment.choices[b.gear?.bg ?? 0], bg.name);
    const startGp = (c?.equipment?.choices[b.gear?.cls ?? 0]?.gp || 0) + (bg?.equipment?.choices[b.gear?.bg ?? 0]?.gp || 0);
    let spent = 0;
    for (const x of b.gear?.extra || []) { const e = item(x.id); if (!e) continue; const count = Math.max(1, Number(x.count) || 1);
      items.push({ id: x.id, name: e.name, count, from: x.how === 'grant' ? 'Granted by the DM' : 'Bought' }); if (x.how !== 'grant') spent += priceOf(x.id, count); }
    for(const x of (Array.isArray(b.customItems)?b.customItems:[]).filter(x=>x&&typeof x==='object').slice(0,100))items.push({id:'custom-'+String(x.id || ''),name:String(x.name || 'Homebrew item').slice(0,120),count:Math.max(1,Math.min(999,Number(x.quantity)||1)),from:customWeapon(x)?'Homebrew weapon':'Homebrew item'});
    return { items, gp: Math.round((startGp - spent) * 100) / 100, startGp, spent: Math.round(spent * 100) / 100 };
  }
  // What the hero is wearing and wielding: the player's picks, or the best of what they own.
  function equipped(b) {
    const own = inventory(b).items.map(i => i.id), e = b.equip || {};
    // By default only armor and shields the class is trained in are put on; the player can still choose otherwise.
    const armor = e.armor !== undefined ? e.armor : own.filter(id => item(id,b)?.kind === 'armor' && proficientWith(b, id)).sort((x, y) => item(y,b).ac - item(x,b).ac)[0] || null;
    const shield = e.shield !== undefined ? !!e.shield : own.some(id => item(id,b)?.kind === 'shield') && proficientWith(b, 'shield');
    const weapons = e.weapons || [...new Set(own.filter(id => item(id,b)?.kind === 'weapon'))];
    return { armor, shield, weapons };
  }
  // Proficiency with a weapon or armor, from the class's list ("Simple Weapons", "Martial Weapons that have the Finesse or Light property", …).
  // b.training: extra training the DM granted (a house rule), as item ids ('longbow') or kinds ('martial-weapons', 'light-armor', 'shields').
  const TRAINING = { 'martial-weapons': 'Martial Weapons', 'simple-weapons': 'Simple Weapons', 'light-armor': 'Light Armor', 'medium-armor': 'Medium Armor', 'heavy-armor': 'Heavy Armor', shields: 'Shields' };
  // The feats a build has taken (background, species, Fighting Style, improvements), as feat objects; their effects change the sheet.
  const featsOf = b => [byId(H().backgrounds, b.background)?.feat?.id, b.speciesFeat, b.fightingStyle, ...Object.values(b.asi || {}).map(x => x?.feat)].map(id => id && byId(H().feats, id)).filter(Boolean);
  const featTraining = b => featsOf(b).flatMap(f => f.effects?.training || []);
  function proficientWith(b, id) {
    const it = item(id,b), granted = [...(b.training || []), ...featTraining(b)];
    const profs = [...classProfs(b), ...granted.map(g => TRAINING[g] || (item(g,b) ? item(g,b).name + 's' : ''))].map(p => p.toLowerCase()); if (!it) return false;if(granted.includes(id))return true;
    if (it.kind === 'weapon') return profs.some(p => p === `${it.group} weapons` || (p.startsWith(`${it.group} weapons that have`) && it.props.some(x => p.includes(x.replace(/-/g, ' ')))) || p === (it.baseWeapon?item(it.baseWeapon).name:it.name).toLowerCase() + 's');
    if (it.kind === 'shield') return profs.includes('shields');
    return profs.includes('all armor') || profs.includes(`${it.group} armor`);
  }

  /* ---- the sheet ---- */
  function derive(b) {
    const data = H(), c = cls(b), sp = byId(data.species, b.species), sub = byId(sp?.sub, b.sub), bg = byId(data.backgrounds, b.background);
    const level = Math.max(1, Math.min(20, Number(b.level) || 1)), prof = profFor(level), s = scores(b), m = Object.fromEntries(ABIL.map(k => [k, mod(s[k])]));
    const warn = [...abilityChecks(b)];
    const feats = [bg?.feat?.id, b.speciesFeat, b.fightingStyle, ...asiLevels(b).map(lv => b.asi?.[lv]?.feat)].filter(Boolean);
    const hasFeat = id => feats.includes(id);

    // hit points: level 1 is the full die; later levels the average (die/2 + 1) or a logged fair roll, always at least 1 with Constitution
    const perLevel = [];
    for (let lv = 1; lv <= level; lv++) {
      const roll = lv === 1 ? c?.hitDie || 8 : b.hp?.method === 'roll' && Number.isInteger(b.hp?.rolls?.[lv]) ? b.hp.rolls[lv] : (c?.hitDie || 8) / 2 + 1;
      perLevel.push(Math.max(1, roll + m.CON));
      if (lv > 1 && b.hp?.method === 'roll' && !Number.isInteger(b.hp?.rolls?.[lv])) warn.push(`Roll hit points for level ${lv}, or use the average.`);
    }
    let hpMax = perLevel.reduce((a, x) => a + x, 0);
    if (sp?.traits.some(t => t.id === 'dwarven-toughness')) hpMax += level;
    for (const f of featsOf(b)) hpMax += (f.effects?.hpPerLevel || 0) * level + (f.effects?.hpFlat || 0); // Tough, Boon of Fortitude
    if (level >= 3 && (b.cls === 'sorcerer' && subOf(b)?.id === 'draconic-sorcery' || subOf(b)?.hpPerLevel)) hpMax += level; // Draconic Resilience (or a homebrew subclass like it): +3 at 3, +1 per level after

    // armor class: the best of what applies
    const eq = equipped(b), armor = item(eq.armor), shieldAc = eq.shield ? 2 : 0, options = [];
    if (armor) {
      const dex = armor.dex ? (armor.maxDex === null || armor.maxDex === undefined ? m.DEX : Math.min(m.DEX, armor.maxDex)) : 0;
      options.push({ ac: armor.ac + dex + shieldAc + (hasFeat('defense') ? 1 : 0), from: armor.name + (eq.shield ? ' and shield' : '') + (hasFeat('defense') ? ', Defense' : '') });
      if (!proficientWith(b, eq.armor)) warn.push(`${c?.name || 'This class'} is not trained in ${armor.name}: attacks and spells suffer in it.`);
      if (armor.str && s.STR < armor.str) warn.push(`${armor.name} needs Strength ${armor.str}; speed drops by 10 feet.`);
    } else {
      options.push({ ac: 10 + m.DEX + shieldAc, from: 'no armor' + (eq.shield ? ', shield' : '') });
      if (has(b, 'barbarian-unarmored-defense')) options.push({ ac: 10 + m.DEX + m.CON + shieldAc, from: 'Unarmored Defense (Dex + Con)' });
      const ua = specific(b, 'unarmored_ability'); if (ua) options.push({ ac: 10 + m.DEX + m[ua] + shieldAc, from: `Unarmored Defense (Dex + ${ua.charAt(0) + ua.slice(1).toLowerCase()})` }); // homebrew classes
      if (has(b, 'monk-unarmored-defense') && !eq.shield) options.push({ ac: 10 + m.DEX + m.WIS, from: 'Unarmored Defense (Dex + Wis)' });
      if (b.cls === 'sorcerer' && level >= 3 && subOf(b)?.id === 'draconic-sorcery') options.push({ ac: 10 + m.DEX + m.CHA + shieldAc, from: 'Draconic Resilience (Dex + Cha)' });
    }
    if (eq.shield && !proficientWith(b, 'shield')) warn.push(`${c?.name || 'This class'} is not trained with shields.`);
    const ac = options.sort((x, y) => y.ac - x.ac)[0];

    // speed
    let speed = sp?.speed || 30;
    if (!armor && !eq.shield && specific(b, 'unarmored_movement_bonus')) speed += specific(b, 'unarmored_movement_bonus');
    if (has(b, 'barbarian-fast-movement') && armor?.group !== 'heavy') speed += 10;
    if (armor?.str && s.STR < armor.str) speed -= 10;

    // saving throws and skills
    const saveProf = new Set(c?.saves || []);
    if (has(b, 'monk-disciplined-survivor')) ABIL.forEach(k => saveProf.add(k));
    if (has(b, 'rogue-slippery-mind')) { saveProf.add('WIS'); saveProf.add('CHA'); }
    for (const pick of Object.values(b.asi || {})) if (byId(H().feats, pick?.feat)?.effects?.saveFromPlus) Object.keys(pick.plus || {}).forEach(k => saveProf.add(k)); // Resilient
    const saves = Object.fromEntries(ABIL.map(k => [k, { bonus: m[k] + (saveProf.has(k) ? prof : 0), prof: saveProf.has(k) }]));
    const lore = b.cls === 'bard' && level >= 3 && subOf(b)?.id === 'college-of-lore'; // Bonus Proficiencies: three skills of your choice
    const skillProf = new Set([...(bg?.skills || []), ...(b.skills || []), ...(sp?.effects?.skills || []), ...(b.speciesSkill ? [b.speciesSkill] : []), ...(b.keenSense ? [b.keenSense] : []), ...(b.featPicks?.skilled || []).filter(x => data.skills.some(k => k.id === x)), ...(lore ? (b.featPicks?.lore || []).slice(0, 3) : [])]);
    const expert = new Set((b.expertise || []).filter(x => skillProf.has(x)));
    const jack = has(b, 'bard-jack-of-all-trades');
    const skills = Object.fromEntries(data.skills.map(k => { const p = skillProf.has(k.id), e = expert.has(k.id);
      return [k.id, { name: k.name, ability: k.ability, prof: p, expert: e, bonus: m[k.ability] + (e ? 2 * prof : p ? prof : jack ? Math.floor(prof / 2) : 0) }]; }));

    // spellcasting
    let spellcasting = null;
    const castLevel = levelsUpTo(b).filter(l => l.spell).pop();
    if (c?.spellAbility && castLevel) { const k = c.spellAbility;
      spellcasting = { ability: k, dc: 8 + prof + m[k], attack: prof + m[k], cantrips: castLevel.spell.cantrips, prepared: castLevel.spell.prepared, slots: castLevel.spell.slots }; }
    // a subclass that casts on its own (Eldritch Knight, Arcane Trickster)
    else if (subOf(b)?.spell && level >= subOf(b).spell.from) { const sp = subOf(b).spell, k = sp.ability, s9 = [...sp.slots(level)]; while (s9.length < 9) s9.push(0);
      spellcasting = { ability: k, dc: 8 + prof + m[k], attack: prof + m[k], cantrips: sp.cantrips(level), prepared: sp.prepared(level), slots: s9 }; }

    // attacks: equipped weapons, attack cantrips, and Sneak Attack / Martial Arts / Extra Attack from the class
    const count = 1 + (levelsUpTo(b).some(l => l.features.some(f => /-extra-attack$/.test(f))) || level >= (subOf(b)?.extraAttackAt || 99) ? 1 : 0) // Extra Attack, SRD or homebrew
      + (has(b, 'fighter-two-extra-attacks') ? 1 : 0) + (has(b, 'fighter-three-extra-attacks') ? 1 : 0);
    const sneak = specific(b, 'sneak_attack'), martial = specific(b, 'martial_arts_die');
    const attacks = [];
    // Sneak Attack is its own line beside the plain one: it needs Advantage or an ally next to the target, once per turn, so the table picks it.
    const withSneak = a => { attacks.push(a); if (a.sneakable && sneak) attacks.push({ ...a, name: a.name + ' + Sneak Attack', damage: a.damage + `+${sneak.dice_count}d${sneak.dice_value}`, note: [a.note, 'Advantage or an ally next to the target; once per turn'].filter(Boolean).join('; '), sneak: true }); delete a.sneakable; };
    for (const id of eq.weapons) {
      const w = item(id,b); if (!w || w.kind !== 'weapon') continue;
      const monkWeapon = martial && (w.group === 'simple' && !w.ranged || w.group === 'martial' && w.props.includes('light'));
      const ab = w.ranged ? 'DEX' : (w.props.includes('finesse') || monkWeapon) && m.DEX > m.STR ? 'DEX' : 'STR';
      const proficient = proficientWith(b, id), dice = monkWeapon && /^1d/.test(w.dice) && Number(w.dice.split('d')[1] || 0) < martial ? '1d' + martial : w.dice;
      const magic=w.magicBonus || 0,bonus = m[ab] + (proficient ? prof : 0) + (w.ranged && hasFeat('archery') ? 2 : 0) + magic,damageMod=m[ab]+magic;
      withSneak({ name: w.name, bonus, damage: dice + (damageMod ? fmt(damageMod) : ''), sneakable: w.ranged || w.props.includes('finesse'), count, type: w.type, mastery: w.mastery, note: [proficient?'':'not proficient',w.requiresAttunement&&!w.attuned?'not attuned: magic bonus inactive':''].filter(Boolean).join('; '), kind: 'weapon' });
    }
    // natural weapons from a (homebrew) species: always proficient; finesse ones may use Dexterity
    for (const n of sp?.effects?.natural || []) { const ab = n.finesse && m.DEX > m.STR ? 'DEX' : 'STR';
      withSneak({ name: n.name, bonus: m[ab] + prof, damage: n.dice + (m[ab] ? fmt(m[ab]) : ''), sneakable: n.finesse, count, type: n.type, kind: 'natural' }); }
    // attacks a (homebrew) class grants, such as an Armorer's Lightning Launcher: the chosen ability plus proficiency
    for (const a of c?.attacksFrom || []) if (a.level <= level) attacks.push({ name: a.name, bonus: m[a.ability] + prof, damage: a.dice + (a.addMod !== false && m[a.ability] ? fmt(m[a.ability]) : ''), count, type: a.type, kind: 'class' });
    if (martial) attacks.push({ name: 'Unarmed Strike', bonus: Math.max(m.STR, m.DEX) + prof, damage: '1d' + martial + fmt(Math.max(m.STR, m.DEX)), count, kind: 'unarmed' });
    if (spellcasting) for (const id of b.spells?.cantrips || []) {
      const sp0 = (root.QBSPELLS || []).find(x => x.id === id); if (!sp0?.damage) continue;
      // Some saving-throw cantrips (Sacred Flame) carry no save field in the data: read it from the text. Stakes rolls them like attacks.
      const save = sp0.save || ({ Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON', Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA' })[(sp0.desc.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/) || [])[1]] || '';
      if (!sp0.attack && !save) continue;
      const base = String(sp0.damage['0'] || sp0.damage['1'] || Object.values(sp0.damage)[0] || ''), steps = 1 + (level >= 5) + (level >= 11) + (level >= 17);
      const beams = id === 'eldritch-blast';
      attacks.push({ name: sp0.name, bonus: spellcasting.attack, damage: beams ? base : base.replace(/^(\d+)d/, (_, n) => `${n * steps}d`), count: beams ? steps : 1, type: sp0.damageType, save, kind: 'cantrip' });
    }

    // strongest first (average damage per action, then attack bonus): the Combat tab uses the first one
    const avg = e => String(e).split('+').reduce((n, t) => { const d = t.match(/^(\d+)d(\d+)$/); return n + (d ? d[1] * (+d[2] + 1) / 2 : Number(t) || 0); }, 0);
    // best first, ranked without Sneak Attack, so each Sneak Attack line stays right after its weapon (the sort is stable)
    const plainDmg = x => avg(x.sneak ? x.damage.replace(/\+\d+d\d+$/, '') : x.damage) * x.count;
    attacks.sort((x, y) => plainDmg(y) - plainDmg(x) || y.bonus - x.bonus);

    // features
    const features = [];
    for (const l of levelsUpTo(b)) for (const f of l.features) { const x = data.features[f]; if (x) features.push({ name: x.name, level: l.level, source: c.name, desc: x.desc }); }
    const subc = subOf(b); for (const f of subc?.features || []) if (f.level <= level) features.push({ name: f.name, level: f.level, source: subc.name, desc: f.desc });
    for (const t of [...(sp?.traits || []), ...(sub?.traits || [])]) features.push({ name: t.name, level: 1, source: sub ? `${sp.name} (${sub.name})` : sp.name, desc: t.desc });
    for (const id of feats) { const f = byId(data.feats, id); if (f) features.push({ name: f.name, level: 1, source: 'Feat', desc: f.desc }); }

    // choices still open (the creator shows these as counters)
    const open = [];
    const need = (step, label, have, want) => { if (have < want) open.push({ step, label, left: want - have }); };
    need('species', 'Species', sp ? 1 : 0, 1);
    if (sp?.sub.length) need('species', `${sp.name} lineage`, sub ? 1 : 0, 1);
    if (sp?.traits.some(t => t.id === 'skillful')) need('skills', 'Skillful: one skill', b.speciesSkill ? 1 : 0, 1);
    if (sp?.traits.some(t => t.id === 'versatile')) need('species', 'Versatile: an origin feat', b.speciesFeat ? 1 : 0, 1);
    if (sp?.traits.some(t => t.id === 'keen-senses')) need('skills', 'Keen Senses: Insight, Perception or Survival', b.keenSense ? 1 : 0, 1);
    need('class', 'Class', c ? 1 : 0, 1);
    need('abilities', 'Ability scores', abilityChecks(b).length ? 0 : 1, 1);
    need('background', 'Background', bg ? 1 : 0, 1);
    if (bg) need('background', 'Background ability increases', boostCheck(b) ? 0 : 1, 1);
    if (bg?.toolChoice) need('background', bg.toolChoice.desc, b.toolChoice ? 1 : 0, 1);
    if (c?.skillChoice) need('skills', `${c.name} skills`, (b.skills || []).filter(x => c.skillChoice.from.includes(x) && !(bg?.skills || []).includes(x)).length, c.skillChoice.choose);
    need('skills', 'Expertise', expert.size, expertiseCount(b));
    if (lore) need('skills', 'College of Lore: three skills', (b.featPicks?.lore || []).length, 3);
    if ((styleLevel[b.cls] && level >= styleLevel[b.cls]) || levelsUpTo(b).some(l => l.features.some(f => /-fighting-style$/.test(f)) && c?.homebrew)) need('class', 'Fighting Style feat', b.fightingStyle ? 1 : 0, 1);
    if (specific(b, 'weapon_mastery')) need('equipment', 'Weapon Mastery', (b.mastery || []).length, specific(b, 'weapon_mastery'));
    for (const lv of asiLevels(b)) need('class', `Level ${lv}: ${lv === 19 ? 'Epic Boon or feat' : 'Ability Score Improvement or feat'}`, b.asi?.[lv]?.feat ? 1 : 0, 1);
    if (spellcasting) { need('spells', 'Cantrips', (b.spells?.cantrips || []).length, spellcasting.cantrips); need('spells', 'Prepared spells', (b.spells?.prepared || []).length, spellcasting.prepared); }
    if (b.featPicks === undefined && feats.includes('skilled')) need('skills', 'Skilled: three skills or tools', 0, 3);
    else if (feats.includes('skilled')) need('skills', 'Skilled: three skills or tools', (b.featPicks.skilled || []).length, 3);
    if (sp && !sp.size && !b.size) need('species', 'Size (Small or Medium)', 0, 1);
    const boostMsg = bg ? boostCheck(b) : ''; if (boostMsg) warn.push(boostMsg);

    const gear = inventory(b);
    if (gear.gp < 0) warn.push(`The extra gear costs ${gear.spent} GP, but the kits give ${gear.startGp} GP: ${-gear.gp} GP short. Choose the gold option of a kit, buy less, or ask the DM to grant it.`);
    const tools = [...new Set([...classProfs(b).filter(p => /^tool:|kit$|supplies$|tools$|instruments?/i.test(p)).map(p => p.replace(/^Tool:\s*/i, '')), ...(bg?.tools || []), ...(b.toolChoice ? [b.toolChoice] : [])])];
    if ((b.training || []).length) features.push({ name: 'Training granted by the DM', level: 1, source: 'House rule', desc: (b.training || []).map(g => TRAINING[g] || item(g)?.name || g).join(', ') + '. Not part of the class; your DM allowed it.' });
    const granted=[...(b.training || []),...featTraining(b)].map(g=>TRAINING[g] || item(g)?.name || g),labels=[...new Set([...classProfs(b),...granted])];
    const weaponNames=new Set(Object.values(data.equipment).filter(x=>x.kind==='weapon').flatMap(x=>[x.name.toLowerCase(),x.name.toLowerCase()+'s']));
    const proficiencies={weapons:labels.filter(x=>/weapons?/i.test(x)||weaponNames.has(x.toLowerCase())),armor:labels.filter(x=>/armor|shields?/i.test(x)),tools,granted};
    const companions=(Array.isArray(b.companions)?b.companions:[]).filter(x=>x&&typeof x==='object').slice(0,10).map(x=>({name:String(x.name || 'Companion').slice(0,100),kind:String(x.kind || '').slice(0,100),ac:Number.isInteger(x.ac)?x.ac:null,hp:Number.isInteger(x.hp)?x.hp:null,speed:String(x.speed || '').slice(0,100),notes:String(x.notes || '').slice(0,4000)}));
    const customItems=(Array.isArray(b.customItems)?b.customItems:[]).filter(x=>x&&typeof x==='object').slice(0,100).map(x=>({name:String(x.name || 'Homebrew item').slice(0,120),quantity:Math.max(1,Math.min(999,Number(x.quantity)||1)),rarity:String(x.rarity || '').slice(0,80),attunement:x.attunement===true||customWeapon(x)?.requiresAttunement===true,maxCharges:Number.isInteger(x.maxCharges)?Math.max(0,x.maxCharges):0,charges:Number.isInteger(x.charges)?Math.max(0,x.charges):0,description:String(x.description || '').slice(0,6000),weapon:customWeapon(x),kind:customWeapon(x)?'weapon':'item',equipped:eq.weapons.includes('custom-'+x.id)}));
    return { tools, proficiencies, companions, customItems, name: b.name || '', level, prof, species: sp?.name || '', sub: sub?.name || '', cls: c?.name || '', subclass: level >= 3 ? subOf(b)?.name || '' : '', background: bg?.name || '',
      size: sp?.size || b.size || '', scores: s, mods: m, saves, skills, passive: 10 + skills.perception.bonus, initiative: m.DEX + (hasFeat('alert') ? prof : 0), speed,
      senses: (sp?.traits || []).filter(t => /^darkvision/.test(t.id)).map(t => t.name),
      hp: { max: hpMax, perLevel }, hitDice: { die: c?.hitDie || 8, count: level }, ac: ac.ac, acFrom: ac.from, attacks, spellcasting, features, feats,
      gear: { ...gear, equipped: eq }, open, warnings: [...new Set(warn)], stamina: prof };
  }

  // The fields the Stakes engine and the rest of the app read from a hero, built from the sheet.
  function toHero(b, sheet = derive(b), keep = {}) {
    const best = sheet.attacks[0];
    return { ...keep, name: sheet.name || keep.name || 'Hero', cls: sheet.cls, anc: sheet.species, level: sheet.level, prof: sheet.prof, abil: sheet.scores,
      trained: Object.entries(sheet.saves).filter(([, v]) => v.prof).map(([k]) => k), hp: sheet.hp.max, hpNow: Math.min(keep.hpNow ?? sheet.hp.max, sheet.hp.max), ac: sheet.ac,
      hitDice: { die: sheet.hitDice.die, left: Math.min(keep.hitDice?.left ?? sheet.level, sheet.level) }, stamina: Math.min(keep.stamina ?? sheet.prof, sheet.prof),
      // Combat reads name, bonus, damage and count; type, save (a saving-throw cantrip) and kind ride along for it.
      attacks: sheet.attacks.map(a => ({ name: a.name, bonus: a.bonus, damage: a.damage, count: a.count, type: a.type || '', save: a.save || '', kind: a.kind || '' })), attack: best ? { name: best.name } : keep.attack,
      perceptionBonus: sheet.skills.perception.bonus, build: b, sheetVersion: 2, conds: keep.conds || [null, null, null, null] };
  }

  // A sensible starting build for a class: the recommended choices a new player can accept with one click ("Quick build").
  // keep: choices the player already made that Quick build must not replace (for example the species).
  function quickBuild(clsId, name = '', level = 1, keep = {}) {
    const b = quickBase(clsId, name, level);
    if (keep.species) { Object.assign(b, { species: keep.species, sub: keep.sub || '', size: keep.size || '', keenSense: keep.keenSense || '', speciesSkill: keep.speciesSkill || (keep.species === 'human' ? b.speciesSkill : ''), speciesFeat: keep.speciesFeat || '' }); }
    return fillDefaults(b);
  }
  // Fill whatever is still open with the recommended pick (the player can change any of it).
  const STYLE = { fighter: 'defense', paladin: 'defense', ranger: 'archery' };
  function fillDefaults(b) {
    const data = H(), sp = byId(data.species, b.species), c = cls(b);
    if (sp) { // species choices: first lineage, Medium size, Perception for Keen Senses, Skilled for Versatile
      if (sp.sub.length && !b.sub) b.sub = sp.sub[0].id;
      if (!sp.size && !b.size) b.size = 'Medium';
      if (sp.traits.some(t => t.id === 'keen-senses') && !b.keenSense) b.keenSense = 'perception';
      if (sp.traits.some(t => t.id === 'versatile') && !b.speciesFeat) b.speciesFeat = 'skilled';
      if (sp.traits.some(t => t.id === 'skillful') && !b.speciesSkill) { const known = Object.entries(derive(b).skills).filter(([, v]) => v.prof).map(([k]) => k); b.speciesSkill = ['perception', 'insight', 'stealth', 'athletics', ...data.skills.map(k => k.id)].find(x => !known.includes(x)); }
    }
    const bgo = byId(data.backgrounds, b.background); if (bgo?.toolChoice && !b.toolChoice) b.toolChoice = bgo.toolChoice.from[0]; // a background's tool of choice: the first
    const prio = [...new Set([...(c.primary || []), ...(c.spellAbility ? [c.spellAbility] : []), 'CON', 'DEX'])];
    if (STYLE[b.cls] && !b.fightingStyle) b.fightingStyle = STYLE[b.cls];
    b.asi = b.asi || {};
    const sc = scores(b);
    for (const lv of asiLevels(b)) if (!b.asi[lv]) {
      const k = prio.find(x => sc[x] <= 18), k2 = prio.find(x => x !== k && sc[x] < 20);
      b.asi[lv] = k ? { feat: 'ability-score-improvement', plus: { [k]: 2 } } : { feat: 'ability-score-improvement', plus: k2 ? { [k2]: 2 } : {} };
      for (const [a, v] of Object.entries(b.asi[lv].plus)) sc[a] = Math.min(20, sc[a] + v);
    }
    const feats = [data.backgrounds.find(x => x.id === b.background)?.feat?.id, b.speciesFeat];
    const sheet = derive(b), known = Object.entries(sheet.skills).filter(([, v]) => v.prof).map(([k]) => k);
    if (feats.includes('skilled') && !(b.featPicks?.skilled || []).length) { b.featPicks = { ...(b.featPicks || {}), skilled: [...new Set(['perception', 'stealth', 'persuasion', 'insight', 'athletics', 'investigation', ...data.skills.map(k => k.id)])].filter(x => !known.includes(x)).slice(0, 3) }; }
    if (b.cls === 'bard' && b.level >= 3 && !(b.featPicks?.lore || []).length) { const k2 = Object.entries(derive(b).skills).filter(([, v]) => v.prof).map(([k]) => k);
      b.featPicks = { ...(b.featPicks || {}), lore: ['perception', 'insight', 'investigation', 'arcana', 'history', 'stealth', ...data.skills.map(k => k.id)].filter((x, i, a) => !k2.includes(x) && a.indexOf(x) === i).slice(0, 3) }; }
    const want = expertiseCount(b); if (want && (b.expertise || []).length < want) { const prof = Object.entries(derive(b).skills).filter(([, v]) => v.prof).sort((x, y) => y[1].bonus - x[1].bonus).map(([k]) => k); b.expertise = prof.slice(0, want); }
    const m = specific(b, 'weapon_mastery'); if (m && (b.mastery || []).length < m) {
      const kit = equipped(b).weapons.filter(id => item(id)?.mastery && proficientWith(b, id)), more = Object.keys(data.equipment).filter(id => item(id).kind === 'weapon' && item(id).mastery && proficientWith(b, id));
      b.mastery = [...new Set([...kit, ...more])].slice(0, m); }
    const spc = derive(b).spellcasting, list = root.QBSPELLS;
    if (spc && list) { const mine = list.filter(x => x.classes.includes(spellList(b))), max = spc.slots.reduce((n, v, i) => v ? i + 1 : n, 0);
      b.spells = { cantrips: mine.filter(x => x.level === 0).sort((x, y) => (!!y.damage * 2 + !!y.attack) - (!!x.damage * 2 + !!x.attack)).slice(0, spc.cantrips).map(x => x.id), // damaging cantrips first (attack or saving throw)
        prepared: mine.filter(x => x.level >= 1 && x.level <= max).sort((x, y) => y.level - x.level).slice(0, spc.prepared).map(x => x.id) }; }
    return b;
  }
  function quickBase(clsId, name = '', level = 1) {
    const c = byId(H().classes, clsId); if (!c) throw Error('Unknown class: ' + clsId);
    const order = [...new Set([...c.primary, ...(c.spellAbility ? [c.spellAbility] : []), 'CON', 'DEX', 'WIS', 'STR', 'CHA', 'INT'])].slice(0, 6);
    const base = Object.fromEntries(order.map((k, i) => [k, ARRAY[i]]));
    const bg = H().backgrounds.slice().sort((x, y) => x.abilities.filter(k => order.slice(0, 2).includes(k)).length > y.abilities.filter(k => order.slice(0, 2).includes(k)).length ? -1 : 1)[0];
    const top = order.filter(k => bg.abilities.includes(k));
    const boost = top.length >= 2 ? { [top[0]]: 2, [top[1]]: 1 } : Object.fromEntries(bg.abilities.map(k => [k, 1]));
    const b = { name, species: 'human', cls: clsId, level: Math.max(1, Math.min(20, Number(level) || 1)), abilities: { method: 'array', base }, background: bg.id, boost, toolChoice: bg.toolChoice?.from[0] || '',
      skills: (c.skillChoice?.from || []).filter(x => !bg.skills.includes(x)).slice(0, c.skillChoice?.choose || 0), hp: { method: 'average', rolls: {} }, gear: { cls: 0, bg: 0 }, spells: { cantrips: [], prepared: [] } };
    b.speciesSkill = H().skills.map(k => k.id).find(x => !bg.skills.includes(x) && !b.skills.includes(x) && H().skills.find(k => k.id === x).ability === order[0]) || 'perception';
    b.speciesFeat = 'skilled';
    return b;
  }

  root.QBHeroRules = { customWeapon, equipmentItem:(b,id)=>item(id,b), subOf, featAllowed, featBlockers, getHomebrew, spellList, classProfs, TRAINING, priceOf, setHomebrew, data: () => H(), ABIL, ARRAY, POINT_COST, POINTS, mod, profFor, die, rollAbilities, rollTotal, rollHp, derive, toHero, quickBuild, fillDefaults, inventory, equipped, proficientWith, asiLevels, expertiseCount, abilityChecks, boostCheck };
})(globalThis);
