/* Homebrew: the DM's own backgrounds (species and classes come next), built inside the 2024 structure and
   compared with the SRD ones. The comparison guides; it never blocks saving. Only homebrew the DM approved
   reaches the hero creator. A hero keeps a copy of the homebrew it was built with. */
(function (root) {
  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const KIT_MIN = 40, KIT_MAX = 60; // SRD background kits are worth 45–56 GP; the alternative is 50 GP
  const H = () => root.QBHERO;
  const uid = p => p + '-' + (root.crypto?.randomUUID?.() || String(Date.now()) + Math.random()).replace(/[^a-z0-9]/gi, '').slice(0, 10);
  const gpOf = cost => { const m = String(cost || '').match(/([\d.]+)\s*(gp|sp|cp)/i); return m ? +m[1] * ({ gp: 1, sp: 0.1, cp: 0.01 })[m[2].toLowerCase()] : 0; };

  function newBackground() { return { id: uid('hb-bg'), kind: 'background', name: '', desc: '', abilities: [], feat: '', skills: [], tool: '', kit: { items: [], gp: 50 }, approved: false, updated: Date.now() }; }
  function kitValue(kit) {
    let v = Number(kit?.gp) || 0;
    for (const it of kit?.items || []) { const e = H().equipment[it.id]; if (e) v += gpOf(e.cost) * (Number(it.count) || 1) / (e.bundle || 1); } // ammunition is priced per bundle (20 arrows)
    return Math.round(v * 10) / 10;
  }
  const tools = () => Object.values(H().equipment).filter(e => e.kind === 'tool').map(e => e.name).sort();
  // The 2024 background structure, part by part. Each result: { ok, label, detail }.
  function checkBackground(bg) {
    const d = H(), r = [], add = (ok, label, detail) => r.push({ ok, label, detail });
    add(!!bg.name?.trim(), 'A name', bg.name?.trim() ? '' : 'Give the background a name.');
    const taken = d.backgrounds.some(b => b.name.toLowerCase() === bg.name?.trim().toLowerCase());
    add(!taken, 'A name of its own', taken ? 'An SRD background already has this name.' : '');
    const ab = [...new Set(bg.abilities || [])].filter(k => ABIL.includes(k));
    add(ab.length === 3, 'Three abilities it can raise', `${ab.length} of 3 chosen. Players raise one by 2 and another by 1, or all three by 1.`);
    const feat = d.feats.find(f => f.id === bg.feat);
    add(feat?.type === 'origin', 'One origin feat', feat ? (feat.type === 'origin' ? feat.name : `${feat.name} is not an origin feat.`) : 'Choose an origin feat.');
    const sk = [...new Set(bg.skills || [])].filter(s => d.skills.some(k => k.id === s));
    add(sk.length === 2, 'Two skills', `${sk.length} of 2 chosen.`);
    add(tools().includes(bg.tool), 'One tool', bg.tool ? (tools().includes(bg.tool) ? bg.tool : `${bg.tool} is not a tool in the SRD list.`) : 'Choose a tool.');
    const v = kitValue(bg.kit);
    add(v >= KIT_MIN && v <= KIT_MAX, `A kit worth ${KIT_MIN}–${KIT_MAX} GP`, `This kit is worth ${v} GP (SRD kits: 45–56 GP, or 50 GP instead).`);
    return r;
  }
  const fits = bg => checkBackground(bg).every(x => x.ok);
  // The shape the hero creator and the rules read (the same as an SRD background).
  function backgroundToSrd(bg) {
    const feat = H().feats.find(f => f.id === bg.feat);
    const items = (bg.kit?.items || []).filter(it => H().equipment[it.id]).map(it => ({ id: it.id, name: H().equipment[it.id].name, count: Number(it.count) || 1 }));
    return { id: bg.id, name: bg.name.trim() || 'Unnamed background', abilities: [...new Set(bg.abilities)].slice(0, 3), feat: feat ? { id: feat.id, name: feat.name, note: '' } : null,
      skills: [...new Set(bg.skills)].slice(0, 2), tools: bg.tool ? [bg.tool] : [], toolChoice: null, desc: bg.desc || '', homebrew: true,
      equipment: { desc: `Choose A or B: (A) ${items.map(i => (i.count > 1 ? i.count + ' ' : '') + i.name).join(', ')}${bg.kit?.gp ? ', ' + bg.kit.gp + ' GP' : ''}; or (B) 50 GP`, choices: [{ items, gp: Number(bg.kit?.gp) || 0, other: [] }, { items: [], gp: 50, other: [] }] } };
  }
  // What the creator offers: approved homebrew, plus copies the hero being built already uses (so a choice never vanishes).
  function forCreator(hb, build) {
    const pick = (kind, conv) => { const approved = (hb?.[kind] || []).filter(b => b.approved).map(conv); return [...approved, ...(build?.hbData?.[kind] || []).filter(b => !approved.some(a => a.id === b.id))]; };
    return { backgrounds: pick('backgrounds', backgroundToSrd), species: pick('species', speciesToSrd), classes: pick('classes', classToSrd) };
  }

  /* ---- species: a base plus traits from building blocks, each with a weight ---- */
  // Weights are calibrated so all 9 SRD species (with a typical lineage) score 4–8; see SRD_WEIGHTS below.
  const BAND = { min: 4, max: 8 };
  const BLOCKS = {
    darkvision: { label: 'Darkvision', weight: t => Number(t.range) >= 120 ? 2 : 1, needs: ['range'], id: t => `darkvision-${Number(t.range) >= 120 ? 120 : 60}`, name: t => `Darkvision (${Number(t.range) >= 120 ? 120 : 60} ft.)`, desc: t => `You have Darkvision with a range of ${Number(t.range) >= 120 ? 120 : 60} feet.` },
    resistance: { label: 'Resistance to a damage type', weight: () => 1, needs: ['damage'], name: t => `${t.damage} Resistance`, desc: t => `You have Resistance to ${t.damage} damage.` },
    saveAdvantage: { label: 'Advantage on saves against a condition', weight: () => 1, needs: ['condition'], name: t => `Steadfast (${t.condition})`, desc: t => `You have Advantage on saving throws you make to avoid or end the ${t.condition} condition.` },
    skill: { label: 'A skill (always this one)', weight: () => 1, needs: ['skill'], name: t => `Trained: ${t.skillName || t.skill}`, desc: t => `You have proficiency in the ${t.skillName || t.skill} skill.` },
    skillChoice: { label: 'A skill of the player’s choice', weight: () => 1, id: () => 'skillful', name: () => 'Skillful', desc: () => 'You gain proficiency in one skill of your choice.' },
    originFeat: { label: 'An origin feat of the player’s choice', weight: () => 2, id: () => 'versatile', name: () => 'Versatile', desc: () => 'You gain an Origin feat of your choice. Skilled is recommended.' },
    toughness: { label: '+1 hit point per level', weight: () => 2, id: () => 'dwarven-toughness', name: () => 'Toughness', desc: () => 'Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.' },
    speed: { label: '+5 ft speed', weight: () => 1, name: () => 'Fleet', desc: () => 'Your speed increases by 5 feet.' },
    climb: { label: 'Climb speed equal to your speed', weight: () => 1, name: () => 'Climber', desc: () => 'You have a Climb Speed equal to your Speed.' },
    cantrip: { label: 'A cantrip', weight: () => 1, needs: ['spell'], name: t => `Innate: ${t.spellName || t.spell}`, desc: t => `You know the ${t.spellName || t.spell} cantrip.` },
    spell: { label: 'A spell once per long rest (from level 3 or 5)', weight: () => 1, needs: ['spell'], name: t => `Innate: ${t.spellName || t.spell}`, desc: t => `Starting at character level ${t.level || 3}, you can cast ${t.spellName || t.spell} once without a spell slot; you regain the ability on a Long Rest.` },
    natural: { label: 'Natural weapon (claws, bite …)', weight: () => 1, needs: ['name', 'dice', 'type'], name: t => t.name, desc: t => `You can make unarmed strikes with your ${String(t.name).toLowerCase()}: ${t.dice} ${t.type} damage${t.finesse ? ', using Strength or Dexterity' : ''}.` },
    flight: { label: 'Limited flight', weight: () => 2, needs: ['name', 'desc'] },
    action: { label: 'A damaging or powerful action (breath weapon …)', weight: () => 2, needs: ['name', 'desc'] },
    survival: { label: 'Once per long rest: drop to 1 HP instead of 0', weight: () => 2, name: () => 'Relentless', desc: () => 'When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can’t do so again until you finish a Long Rest.' },
    minor: { label: 'A small trait (utility, senses, flavor with an effect)', weight: () => 1, needs: ['name', 'desc'] },
    custom: { label: 'Custom trait (the DM rates it 1–3)', weight: t => Math.max(1, Math.min(3, Number(t.weight) || 1)), needs: ['name', 'desc', 'weight'] },
    drawback: { label: 'Drawback (a weakness, rated −1 to −3)', weight: t => -Math.max(1, Math.min(3, Number(t.weight) || 1)), needs: ['name', 'desc', 'weight'] }
  };
  // The SRD species scored with the same weights (typical lineage), so a homebrew species can be placed among them.
  const SRD_WEIGHTS = { 'darkvision-60': 1, 'darkvision-120': 2, 'draconic-flight': 2, 'dwarven-resilience': 2, 'dwarven-toughness': 2, stonecunning: 1, 'elven-lineage': 0, 'fey-ancestry': 1, 'keen-senses': 1, trance: 1,
    'gnomish-cunning': 2, 'gnomish-lineage': 0, 'giant-ancestry': 0, 'large-form': 1, 'powerful-build': 1, brave: 1, 'halfling-nimbleness': 1, luck: 2, 'naturally-stealthy': 1, resourceful: 1, skillful: 1, versatile: 2,
    'adrenaline-rush': 2, 'relentless-endurance': 2, 'fiendish-legacy': 0, 'otherworldly-presence': 1 };
  const subWeight = id => /breath-weapon|giant-ancestry-/.test(id) ? 2 : /resistance|lineage-spell|gnomish-lineage-/.test(id) ? 1 : id === 'darkvision-120' ? 1 : 0; // Drow's 120 ft upgrades the Elf's 60 ft by one step
  function srdSpeciesScores() {
    return H().species.filter(s => !s.homebrew).map(s => ({ name: s.name, speed: s.speed, size: s.size || 'Small or Medium',
      score: s.traits.reduce((n, t) => n + (SRD_WEIGHTS[t.id] ?? 1), 0) + (s.speed > 30 ? 1 : 0) + (s.sub[0]?.traits || []).reduce((n, t) => n + subWeight(t.id), 0),
      traits: [...s.traits.map(t => t.name), ...(s.sub[0] ? [s.sub[0].name.replace(/^[^:]+:\s*/, '') + ' lineage'] : [])] }));
  }
  function newSpecies() { return { id: uid('hb-sp'), kind: 'species', name: '', desc: '', size: 'Medium', speed: 30, type: 'Humanoid', traits: [], approved: false, updated: Date.now() }; }
  const traitWeight = t => BLOCKS[t.block] ? BLOCKS[t.block].weight(t) : 0;
  function speciesScore(sp) { return (sp.traits || []).reduce((n, t) => n + traitWeight(t), 0) + (Number(sp.speed) - 30) / 5; }
  function traitMissing(t) { const b = BLOCKS[t.block]; if (!b) return 'Unknown building block.'; const miss = (b.needs || []).filter(k => t[k] === undefined || t[k] === null || String(t[k]).trim() === ''); return miss.length ? `${b.label}: fill in ${miss.join(', ')}.` : ''; }
  function checkSpecies(sp) {
    const d = H(), r = [], add = (ok, label, detail = '') => r.push({ ok, label, detail: ok ? '' : detail });
    add(!!sp.name?.trim(), 'A name', 'Give the species a name.');
    add(!d.species.some(s => !s.homebrew && s.name.toLowerCase() === sp.name?.trim().toLowerCase()), 'A name of its own', 'An SRD species already has this name.');
    add(['Small', 'Medium', 'Small or Medium'].includes(sp.size), 'Size Small or Medium', 'Player species are Small or Medium.');
    add(Number(sp.speed) >= 25 && Number(sp.speed) <= 35, 'Speed 25–35 ft', 'SRD species move 30 ft (Goliath 35).');
    const missing = (sp.traits || []).map(traitMissing).filter(Boolean);
    add((sp.traits || []).length > 0 && !missing.length, 'Every trait filled in', missing[0] || 'Add at least one trait.');
    const score = speciesScore(sp);
    add(score >= BAND.min && score <= BAND.max, `Within the SRD range (${BAND.min}–${BAND.max})`, score > BAND.max ? `This species scores ${score}: stronger than every SRD species. Remove a trait or add a drawback.` : `This species scores ${score}: weaker than every SRD species. Add a trait.`);
    return r;
  }
  const speciesFits = sp => checkSpecies(sp).every(x => x.ok);
  // The shape the creator and the rules read (the same as an SRD species, plus effects the engine applies).
  function speciesToSrd(sp) {
    const named = t => ({ ...t, skillName: H().skills.find(k => k.id === t.skill)?.name || t.skill, spellName: (root.QBSPELLS || []).find(s => s.id === t.spell)?.name || String(t.spell || '').replace(/-/g, ' ') });
    const traits = (sp.traits || []).map(named).map((t, i) => { const b = BLOCKS[t.block] || {}; return { id: b.id ? b.id(t) : `hb-${t.block}-${i}`, name: (b.name ? b.name(t) : t.name) || t.name || b.label, desc: t.desc && !b.desc ? t.desc : (b.desc ? b.desc(t) : t.desc) || '', weight: traitWeight(t) }; });
    const extra = (sp.traits || []).some(t => t.block === 'speed') ? 5 : 0;
    return { id: sp.id, name: sp.name.trim() || 'Unnamed species', size: sp.size === 'Small or Medium' ? undefined : sp.size, speed: (Number(sp.speed) || 30) + extra, type: sp.type || 'Humanoid', desc: sp.desc || '', homebrew: true, traits, sub: [],
      effects: { skills: (sp.traits || []).filter(t => t.block === 'skill' && t.skill).map(t => t.skill), natural: (sp.traits || []).filter(t => t.block === 'natural').map(t => ({ name: t.name, dice: t.dice, type: t.type, finesse: !!t.finesse })) } };
  }

  /* ---- classes: a base, a progression template, calculated and written features, a subclass ---- */
  const CASTER = { none: null, half: 'paladin', full: 'wizard', pact: 'warlock' }; // spell slots and prepared spells follow this SRD class
  const MARTIAL_DIE = [6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12];
  const MASTERY = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6]; // the Fighter's count, for a full count
  const CLASS_KIT = { min: 50, max: 155 }; // SRD class kits are worth 50–155 GP
  function newClass() { return { id: uid('hb-cl'), kind: 'class', name: '', desc: '', hitDie: 8, primary: [], saves: [], skills: { choose: 2, from: [] }, armor: [], weapons: ['simple'],
    caster: 'none', spellAbility: '', spellList: '', cantrips: 0, extraAttack: false, fightingStyle: 0, mastery: 0, sneakFrom: 0, martialArtsFrom: 0, unarmored: '', expertise: [],
    attacks: [], features: [], subclass: { name: '', summary: '', training: [], features: [] }, kit: { items: [], gp: 50 }, approved: false, updated: Date.now() }; }
  const ARMOR_NAME = { light: 'Light Armor', medium: 'Medium Armor', heavy: 'Heavy Armor', shields: 'Shields' };
  function checkClass(hc) {
    const d = H(), r = [], add = (ok, label, detail = '') => r.push({ ok, label, detail: ok ? '' : detail });
    add(!!hc.name?.trim(), 'A name', 'Give the class a name.');
    add(!d.classes.some(c => !c.homebrew && c.name.toLowerCase() === hc.name?.trim().toLowerCase()), 'A name of its own', 'An SRD class already has this name.');
    add([6, 8, 10, 12].includes(Number(hc.hitDie)), 'A hit die from d6 to d12', 'Choose d6, d8, d10 or d12.');
    add((hc.primary || []).length >= 1 && hc.primary.length <= 2, 'One or two primary abilities', 'Choose the abilities the class relies on most.');
    add(new Set(hc.saves || []).size === 2, 'Two saving throws', `${(hc.saves || []).length} of 2 chosen.`);
    const sk = hc.skills || {}; add(sk.choose >= 2 && sk.choose <= 4 && (sk.from || []).length >= sk.choose, 'Skill choices (2–4)', `Players choose ${sk.choose || 0} from ${(sk.from || []).length} skills; offer at least as many as they choose.`);
    if (hc.caster !== 'none') add(!!hc.spellAbility && !!hc.spellList, 'A spellcasting ability and spell list', 'Choose which ability casts and which SRD class’s spells it uses.');
    const unnamed = [...(hc.features || []), ...(hc.subclass?.features || [])].filter(f => !String(f.name || '').trim() || !(Number(f.level) >= 1 && Number(f.level) <= 20));
    add(!unnamed.length, 'Every feature named, with a level', 'A feature is missing its name or level.');
    add((hc.attacks || []).every(a => a.name && /^\d+d\d+$/.test(a.dice || '') && ABIL.includes(a.ability)), 'Class attacks filled in', 'An attack needs a name, a die (1d6) and an ability.');
    add(!!hc.subclass?.name?.trim(), 'A subclass name', 'Every 2024 class gets its subclass at level 3.');
    const v = kitValue(hc.kit); add(v >= CLASS_KIT.min && v <= CLASS_KIT.max, `A kit worth ${CLASS_KIT.min}–${CLASS_KIT.max} GP`, `This kit is worth ${v} GP (SRD class kits: 50–155 GP).`);
    return r;
  }
  // The shape the rules read (the same as an SRD class), plus a feature dictionary for its own features.
  function classToSrd(hc) {
    hc = { ...hc, sneakFrom: Number(hc.sneakFrom) || 0, martialArtsFrom: Number(hc.martialArtsFrom) || 0, fightingStyle: Number(hc.fightingStyle) || 0, mastery: Number(hc.mastery) || 0, cantrips: Number(hc.cantrips) || 0 }; // form fields arrive as text
    const id = hc.id, tmpl = CASTER[hc.caster] ? H().classes.find(c => c.id === CASTER[hc.caster]) : null, features = {};
    const feat = (key, name, desc, level) => { const fid = `${id}-${key}`; features[fid] = { name, cls: id, level, desc }; return fid; };
    const levels = Array.from({ length: 20 }, (_, i) => { const level = i + 1, f = [], specific = {};
      for (const [n, x] of (hc.features || []).entries()) if (Number(x.level) === level) f.push(feat(`f${n}`, x.name, x.desc || '', level));
      if ([4, 8, 12, 16].includes(level)) f.push(`${id}-ability-score-improvement`); // described once below
      if (level === 19) f.push(feat('epic-boon', 'Epic Boon', 'You gain an Epic Boon feat or another feat of your choice for which you qualify.', 19));
      if (hc.extraAttack && level === 5) f.push(feat('extra-attack', 'Extra Attack', 'You can attack twice instead of once whenever you take the Attack action on your turn.', 5));
      if (Number(hc.fightingStyle) === level) f.push(feat('fighting-style', 'Fighting Style', 'You gain a Fighting Style feat of your choice.', level));
      if (hc.unarmored && level === 1) { f.push(feat('unarmored-defense', 'Unarmored Defense', `While you aren't wearing armor, your base Armor Class equals 10 plus your Dexterity and ${hc.unarmored} modifiers.`, 1)); }
      if (hc.unarmored) specific.unarmored_ability = hc.unarmored;
      if (hc.sneakFrom && level >= hc.sneakFrom) specific.sneak_attack = { dice_count: Math.ceil((level - hc.sneakFrom + 1) / 2), dice_value: 6 };
      if (hc.martialArtsFrom && level >= hc.martialArtsFrom) specific.martial_arts_die = MARTIAL_DIE[i];
      if (Number(hc.mastery) > 0) specific.weapon_mastery = Number(hc.mastery) === 9 ? MASTERY[i] : Number(hc.mastery);
      const exp = (hc.expertise || []).filter(e => Number(e.level) === level).reduce((n, e) => n + (Number(e.count) || 0), 0); if (exp) specific.expertise_gain = exp;
      const out = { level, prof: 2 + Math.floor(i / 4), features: f }; if (Object.keys(specific).length) out.specific = specific;
      if (tmpl) { const t = tmpl.levels[i].spell; out.spell = { cantrips: Number(hc.cantrips) ? Number(hc.cantrips) + (level >= 4) + (level >= 10) : 0, prepared: t.prepared, slots: t.slots.slice() }; }
      return out; });
    for (const lv of [4, 8, 12, 16]) features[`${id}-ability-score-improvement`] = { name: 'Ability Score Improvement', cls: id, level: lv, desc: 'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.' };
    const profs = [...(hc.armor || []).map(a => ARMOR_NAME[a]), ...(hc.weapons || []).map(w => w === 'martial' ? 'Martial Weapons' : 'Simple Weapons')];
    const items = (hc.kit?.items || []).filter(it => H().equipment[it.id]).map(it => ({ id: it.id, name: H().equipment[it.id].name, count: Number(it.count) || 1 }));
    return { id, name: hc.name.trim() || 'Unnamed class', hitDie: Number(hc.hitDie) || 8, primary: hc.primary || [], primaryDesc: (hc.primary || []).join(' and '), saves: hc.saves || [], profs,
      profsAt: (hc.subclass?.training || []).map(a => ({ level: 3, prof: ARMOR_NAME[a] || (a === 'martial' ? 'Martial Weapons' : a) })),
      skillChoice: { choose: Number(hc.skills?.choose) || 2, from: hc.skills?.from || [] }, spellAbility: hc.caster === 'none' ? '' : hc.spellAbility, spellList: hc.spellList || '',
      equipment: { desc: '', choices: [{ items, gp: Number(hc.kit?.gp) || 0, other: [] }, { items: [], gp: Math.round(kitValue(hc.kit)), other: [] }] },
      subclass: { id: id + '-sub', name: hc.subclass?.name || '', summary: hc.subclass?.summary || '', desc: hc.subclass?.summary || '', features: (hc.subclass?.features || []).map(f => ({ level: Number(f.level), name: f.name, desc: f.desc || '' })) },
      attacksFrom: (hc.attacks || []).map(a => ({ level: Number(a.level) || 1, name: a.name, dice: a.dice, ability: a.ability, type: a.type || '', ranged: !!a.ranged, addMod: a.addMod !== false })),
      levels, features, desc: hc.desc || '', homebrew: true };
  }

  // Measured like every SRD class: its Quick build hero at levels 1/5/11/17 (HP, AC, best attack, expected damage per
  // action against AC 15 with Stakes grazes). Weapons and cantrips only: spell slots and limited features aren't counted.
  const LEVELS = [1, 5, 11, 17];
  const avgDice = e => String(e).split('+').reduce((n, t) => { const d = t.match(/^(\d+)d(\d+)$/); return n + (d ? d[1] * (+d[2] + 1) / 2 : Number(t) || 0); }, 0);
  const hitShare = (b, ac) => { let n = 0; for (let d = 2; d <= 20; d++) n += d === 20 || d + b >= ac ? 1 : d + b >= ac - 5 ? 0.5 : 0; return n / 20; };
  function measure(clsId, level) {
    const R = root.QBHeroRules, s = R.derive(R.quickBuild(clsId, 'Test', level)), a = s.attacks[0];
    return { hp: s.hp.max, ac: s.ac, bonus: a ? a.bonus : 0, dpa: a ? Math.round(avgDice(a.damage) * a.count * hitShare(a.bonus, 15) * 10) / 10 : 0, attack: a ? `${a.name} ${a.bonus >= 0 ? '+' : ''}${a.bonus}, ${a.damage}${a.count > 1 ? ' ×' + a.count : ''}` : '' };
  }
  let srdTable = null;
  function srdClassTable() {
    if (srdTable) return srdTable;
    const R = root.QBHeroRules, keep = R.getHomebrew(); R.setHomebrew(null);
    try { srdTable = H().classes.filter(c => !c.homebrew).map(c => ({ name: c.name, rows: LEVELS.map(lv => measure(c.id, lv)) })); } finally { R.setHomebrew(keep); }
    return srdTable;
  }
  function compareClass(hc) {
    const R = root.QBHeroRules, keep = R.getHomebrew(), srd = srdClassTable();
    R.setHomebrew({ ...(keep || {}), classes: [...((keep && keep.classes) || []).filter(c => c.id !== hc.id), classToSrd(hc)] });
    let mine; try { mine = LEVELS.map(lv => measure(hc.id, lv)); } finally { R.setHomebrew(keep); }
    return LEVELS.map((level, i) => { const col = k => srd.map(c => c.rows[i][k]), max = k => Math.max(...col(k)), min = k => Math.min(...col(k)), m = mine[i];
      const flags = [m.hp > max('hp') * 1.1 && `HP ${m.hp} (SRD up to ${max('hp')})`, m.ac > max('ac') && `AC ${m.ac} (SRD up to ${max('ac')})`, m.dpa > max('dpa') * 1.1 && `damage ${m.dpa} per action (SRD up to ${max('dpa')})`].filter(Boolean);
      return { level, mine: m, min: { hp: min('hp'), ac: min('ac'), dpa: min('dpa') }, max: { hp: max('hp'), ac: max('ac'), dpa: max('dpa') }, flags }; });
  }
  // The power check that approval needs: no column more than 10% beyond the strongest SRD class at any level.
  function classPowerCheck(hc) { const rows = compareClass(hc), over = rows.filter(r => r.flags.length); return { ok: !over.length, label: 'Within the SRD range at levels 1, 5, 11 and 17', detail: over.length ? `Stronger than every SRD class: ${over.map(r => `level ${r.level}: ${r.flags.join(', ')}`).join('; ')}.` : '', rows }; }
  const classFits = hc => checkClass(hc).every(x => x.ok) && classPowerCheck(hc).ok;

  // "Test in fights": parties of four identical Quick build heroes against three SRD-monster fights at one level,
  // under the Stakes rules (attacks vs AC with grazes, defense like 5e, strike-backs). Fair dice; no stamina pushes,
  // healing or breaking points, so it measures the class, not tactics.
  function encountersFor(level) {
    const M = (root.QBSRD?.monsters || []).filter(r => r[5].length && r[6].length);
    const pick = cr => { const near = M.filter(r => Math.abs(r[4] - cr) === Math.min(...M.map(x => Math.abs(x[4] - cr)))).sort((a, b) => a[2] - b[2]); return near[Math.floor(near.length / 2)]; };
    const foe = r => ({ name: r[0], hp: r[2], ac: r[3], attacks: r[6].map(n => r[5].find(a => a[0] === n)).filter(Boolean).map(a => ({ bonus: a[1], damage: a[2] })) });
    const steps = [0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], near = x => steps.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
    return [{ name: 'A pack', foes: Array(4).fill(pick(near(level / 4))).map(foe) }, { name: 'A pair', foes: Array(2).fill(pick(near(level / 2))).map(foe) }, { name: 'A tough enemy', foes: [foe(pick(near(level)))] }]; // CR equal to the level: a hard fight without healing
  }
  function rollExpr(expr, crit) { const R = root.QBHeroRules; let t = 0; for (const p of String(expr).split('+')) { const d = p.match(/^(\d+)d(\d+)$/); if (d) for (let i = 0; i < d[1] * (crit ? 2 : 1); i++) t += R.die(+d[2]); else t += Number(p) || 0; } return Math.max(0, t); }
  function simulate(heroes, enc) {
    const R = root.QBHeroRules, party = heroes.map(h => ({ ...h, hpNow: h.hp })), foes = enc.foes.map(f => ({ ...f, hpNow: f.hp }));
    const up = l => l.filter(x => x.hpNow > 0); let round = 0;
    while (up(party).length && up(foes).length && round < 20) { round++;
      for (const h of up(party)) { const t = up(foes).sort((a, b) => a.hpNow - b.hpNow)[0]; if (!t) break;
        for (let i = 0; i < h.atk.count && t.hpNow > 0; i++) { const d = R.die(20), tot = d + h.atk.bonus;
          if (d === 20) t.hpNow -= rollExpr(h.atk.damage, true); else if (d > 1 && tot >= t.ac) t.hpNow -= rollExpr(h.atk.damage);
          else { if (d > 1 && tot >= t.ac - 5) t.hpNow -= Math.floor(rollExpr(h.atk.damage) / 2); if (t.hpNow > 0) h.hpNow -= rollExpr(t.attacks[0].damage, d === 1); } // a graze or miss: the target strikes back
          if (h.hpNow <= 0) break; } }
      for (const f of up(foes)) for (const a of f.attacks) { const h = up(party)[Math.floor(R.die(64) / 64 * up(party).length) % Math.max(1, up(party).length)]; if (!h) break;
        const d = R.die(20); if (d === 1) h.hpNow -= rollExpr(a.damage, true); else if (d !== 20 && d + h.ac - 10 < 12 + a.bonus) h.hpNow -= rollExpr(a.damage); } }
    return { rounds: round, dropped: party.some(h => h.hpNow <= 0), wiped: !up(party).length };
  }
  function fightTest(hc, level = 5, runs = 150) {
    const R = root.QBHeroRules, keep = R.getHomebrew();
    R.setHomebrew({ ...(keep || {}), classes: [...((keep && keep.classes) || []).filter(c => c.id !== hc.id), classToSrd(hc)] });
    try {
      const encs = encountersFor(level), who = [[hc.id, hc.name || 'Yours'], ['fighter', 'Fighter'], ['rogue', 'Rogue'], ['wizard', 'Wizard']];
      return { level, encounters: encs.map(e => e.name + ': ' + e.foes.length + ' × ' + e.foes[0].name), rows: who.map(([id, name]) => {
        const s = R.derive(R.quickBuild(id, 'T', level)), a = s.attacks[0] || { bonus: 0, damage: '1', count: 1 }, hero = { hp: s.hp.max, ac: s.ac, atk: { bonus: a.bonus, damage: a.damage, count: a.count } };
        return { name, cells: encs.map(e => { let rounds = 0, dropped = 0, wiped = 0; for (let i = 0; i < runs; i++) { const r = simulate([hero, hero, hero, hero], e); rounds += r.rounds; dropped += r.dropped; wiped += r.wiped; }
          return { rounds: Math.round(rounds / runs * 10) / 10, dropped: Math.round(dropped / runs * 100), wiped: Math.round(wiped / runs * 100) }; }) }; }) };
    } finally { R.setHomebrew(keep); }
  }

  /* ---- export and import ---- */
  const FORMAT = 'quillbound-homebrew';
  function exportJson(hb, ids) {
    const pick = list => (list || []).filter(x => !ids || ids.includes(x.id)).map(x => ({ ...x, approved: false }));
    return JSON.stringify({ format: FORMAT, version: 3, exported: new Date().toISOString(), backgrounds: pick(hb?.backgrounds), species: pick(hb?.species), classes: pick(hb?.classes) }, null, 2);
  }
  const str = (v, n) => String(v ?? '').slice(0, n);
  const cleanBackground = b => ({ ...newBackground(), ...b, kind: 'background', approved: false, name: str(b.name, 80), desc: str(b.desc, 2000),
    abilities: (b.abilities || []).filter(k => ABIL.includes(k)), skills: (b.skills || []).map(String), kit: { items: (b.kit?.items || []).map(i => ({ id: String(i.id), count: Number(i.count) || 1 })), gp: Number(b.kit?.gp) || 0 } });
  const cleanSpecies = s => ({ ...newSpecies(), ...s, kind: 'species', approved: false, name: str(s.name, 80), desc: str(s.desc, 2000), speed: Number(s.speed) || 30,
    traits: (s.traits || []).filter(t => t && BLOCKS[t.block]).map(t => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, typeof v === 'boolean' ? v : str(v, 1000)]))) });
  // A class file is plain data: keep the known fields, as plain values, and drop anything else.
  const textList = (xs, keys) => (Array.isArray(xs) ? xs : []).map(x => Object.fromEntries(keys.map(k => [k, typeof x?.[k] === 'boolean' ? x[k] : str(x?.[k], 2000)])));
  const cleanClass = c => { const n = newClass(); return { ...n, id: str(c.id, 60) || n.id, name: str(c.name, 80), desc: str(c.desc, 2000), hitDie: Number(c.hitDie) || 8,
    primary: (c.primary || []).filter(k => ABIL.includes(k)), saves: (c.saves || []).filter(k => ABIL.includes(k)), skills: { choose: Number(c.skills?.choose) || 2, from: (c.skills?.from || []).map(String) },
    armor: (c.armor || []).filter(a => ARMOR_NAME[a]), weapons: (c.weapons || []).filter(w => ['simple', 'martial'].includes(w)), caster: CASTER[c.caster] !== undefined ? c.caster : 'none',
    spellAbility: ABIL.includes(c.spellAbility) ? c.spellAbility : '', spellList: str(c.spellList, 30), cantrips: Number(c.cantrips) || 0, extraAttack: !!c.extraAttack, fightingStyle: Number(c.fightingStyle) || 0,
    mastery: Number(c.mastery) || 0, sneakFrom: Number(c.sneakFrom) || 0, martialArtsFrom: Number(c.martialArtsFrom) || 0, unarmored: ABIL.includes(c.unarmored) ? c.unarmored : '',
    expertise: textList(c.expertise, ['level', 'count']), attacks: textList(c.attacks, ['level', 'name', 'dice', 'ability', 'type', 'ranged']), features: textList(c.features, ['level', 'name', 'desc']),
    subclass: { name: str(c.subclass?.name, 80), summary: str(c.subclass?.summary, 500), training: (c.subclass?.training || []).filter(a => ARMOR_NAME[a] || a === 'martial'), features: textList(c.subclass?.features, ['level', 'name', 'desc']) },
    kit: { items: (c.kit?.items || []).map(i => ({ id: String(i.id), count: Number(i.count) || 1 })), gp: Number(c.kit?.gp) || 0 }, kind: 'class', approved: false }; };
  // Read a file: returns what it contains and anything that needs a decision. Nothing is changed here.
  function parseImport(text, hb) {
    let data; try { data = JSON.parse(text); } catch { return { error: 'This file is not readable homebrew (not JSON).' }; }
    if (data?.format !== FORMAT) return { error: 'This file is not a Quillbound homebrew export.' };
    const ok = x => x && typeof x === 'object' && typeof x.name === 'string';
    const items = [...(data.backgrounds || []).filter(ok).map(cleanBackground), ...(data.species || []).filter(ok).map(cleanSpecies), ...(data.classes || []).filter(ok).map(cleanClass)];
    const listOf = it => it.kind === 'species' ? hb?.species : it.kind === 'class' ? hb?.classes : hb?.backgrounds;
    const clashes = items.filter(b => (listOf(b) || []).some(x => x.id === b.id || x.name.toLowerCase() === b.name.toLowerCase())).map(b => b.id);
    return { items, clashes };
  }
  // Apply an import. decisions[id] = 'replace' | 'copy' | 'skip' for clashes; everything else is added. Imported homebrew starts unapproved.
  function applyImport(hb, parsed, decisions = {}) {
    const out = { ...hb, backgrounds: [...(hb.backgrounds || [])], species: [...(hb.species || [])], classes: [...(hb.classes || [])] }, done = { added: 0, replaced: 0, skipped: 0 };
    for (const b of parsed.items) {
      const list = b.kind === 'species' ? out.species : b.kind === 'class' ? out.classes : out.backgrounds;
      if (!parsed.clashes.includes(b.id)) { list.push(b); done.added++; continue; }
      const how = decisions[b.id] || 'skip';
      if (how === 'skip') { done.skipped++; continue; }
      if (how === 'copy') { list.push({ ...b, id: uid(b.kind === 'species' ? 'hb-sp' : b.kind === 'class' ? 'hb-cl' : 'hb-bg'), name: b.name + ' (imported)' }); done.added++; continue; }
      const i = list.findIndex(x => x.id === b.id || x.name.toLowerCase() === b.name.toLowerCase()); list[i] = { ...b, id: list[i].id }; done.replaced++;
    }
    return { hb: out, done };
  }

  root.QBHomebrew = { CASTER, CLASS_KIT, newClass, checkClass, classToSrd, compareClass, classPowerCheck, classFits, srdClassTable, fightTest, encountersFor, ABIL, KIT_MIN, KIT_MAX, BAND, BLOCKS, newBackground, kitValue, tools, checkBackground, fits, backgroundToSrd, newSpecies, speciesScore, traitWeight, checkSpecies, speciesFits, speciesToSrd, srdSpeciesScores, forCreator, exportJson, parseImport, applyImport };
})(globalThis);