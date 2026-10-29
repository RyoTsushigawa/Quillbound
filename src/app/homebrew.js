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
    // subclasses carry functions (a third-caster's slots), so a hero's plain copy is converted again
    return { backgrounds: pick('backgrounds', backgroundToSrd), species: pick('species', speciesToSrd), classes: pick('classes', classToSrd), feats: pick('feats', featToSrd), subclasses: pick('subclasses', subclassToSrd).map(subclassToSrd) };
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
    caster: 'none', spellAbility: '', spellList: '', cantrips: 0, cantripsAt: '4,10', tools: [], extraAttack: false, fightingStyle: 0, mastery: 0, sneakFrom: 0, martialArtsFrom: 0, unarmored: '', expertise: [],
    attacks: [], features: [], subclass: { name: '', summary: '', training: [], tools: [], features: [] }, kit: { items: [], gp: 50 }, approved: false, updated: Date.now() }; }
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
  // The levels where a class gains a cantrip: "4,10" like the Cleric or Wizard, "10,14" like the 2025 Artificer.
  const cantripUps = hc => String(hc.cantripsAt || '4,10').split(',').map(Number).filter(n => n >= 2 && n <= 20);
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
      if (tmpl) { const t = tmpl.levels[i].spell; out.spell = { cantrips: Number(hc.cantrips) ? Number(hc.cantrips) + cantripUps(hc).filter(l => level >= l).length : 0, prepared: t.prepared, slots: t.slots.slice() }; }
      return out; });
    for (const lv of [4, 8, 12, 16]) features[`${id}-ability-score-improvement`] = { name: 'Ability Score Improvement', cls: id, level: lv, desc: 'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.' };
    const profs = [...(hc.armor || []).map(a => ARMOR_NAME[a]), ...(hc.weapons || []).map(w => w === 'martial' ? 'Martial Weapons' : 'Simple Weapons'), ...(hc.tools || [])];
    const items = (hc.kit?.items || []).filter(it => H().equipment[it.id]).map(it => ({ id: it.id, name: H().equipment[it.id].name, count: Number(it.count) || 1 }));
    return { id, name: hc.name.trim() || 'Unnamed class', hitDie: Number(hc.hitDie) || 8, primary: hc.primary || [], primaryDesc: (hc.primary || []).join(' and '), saves: hc.saves || [], profs,
      profsAt: [...(hc.subclass?.training || []).map(a => ({ level: 3, prof: ARMOR_NAME[a] || (a === 'martial' ? 'Martial Weapons' : a) })), ...(hc.subclass?.tools || []).map(t => ({ level: 3, prof: t }))],
      skillChoice: { choose: Number(hc.skills?.choose) || 2, from: hc.skills?.from || [] }, spellAbility: hc.caster === 'none' ? '' : hc.spellAbility, spellList: hc.spellList || '',
      equipment: { desc: '', choices: [{ items, gp: Number(hc.kit?.gp) || 0, other: [] }, { items: [], gp: Math.round(kitValue(hc.kit)), other: [] }] },
      subclass: { id: id + '-sub', name: hc.subclass?.name || '', summary: hc.subclass?.summary || '', desc: hc.subclass?.summary || '', features: (hc.subclass?.features || []).map(f => ({ level: Number(f.level), name: f.name, desc: f.desc || '' })) },
      attacksFrom: (hc.attacks || []).map(a => ({ level: Number(a.level) || 1, name: a.name, dice: a.dice, ability: a.ability, type: a.type || '', ranged: !!a.ranged, addMod: a.addMod !== false })),
      levels, features, desc: hc.desc || '', homebrew: true };
  }

  /* ---- subclasses for the existing classes: features at the class's subclass levels, measured against its subclasses ---- */
  // Calculated parts (the sheet and combat use them): training at level 3, Extra Attack, +1 HP per level (like Draconic
  // Resilience), and a third-caster's own spellcasting (like the Eldritch Knight). Everything else is written features.
  const SUB_TRAINING = { medium: 'Medium Armor', heavy: 'Heavy Armor', shields: 'Shields', martial: 'Martial Weapons' };
  const THIRD_SLOTS = l => l >= 19 ? [4, 3, 3, 1] : l >= 16 ? [4, 3, 3] : l >= 13 ? [4, 3, 2] : l >= 10 ? [4, 3] : l >= 7 ? [4, 2] : l >= 4 ? [3] : l >= 3 ? [2] : [];
  const THIRD_PREPARED = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
  function newSubclass(cls = '') { return { id: uid('hb-sc'), kind: 'subclass', cls, name: '', summary: '', features: [], training: [], tools: [], extraAttackAt: 0, hpPerLevel: false, caster: false, spellAbility: 'INT', spellList: 'wizard', approved: false, updated: Date.now() }; }
  const baseClass = id => (root.QBHERO?.classes || []).find(c => c.id === id && !c.homebrew);
  // The levels a class gains subclass features at, from its SRD subclass (Fighter 3/7/10/15/18, Cleric 3/6/17 …).
  const subLevels = id => [...new Set((baseClass(id)?.subclass?.features || []).map(f => f.level))].sort((a, b) => a - b);
  function subclassToSrd(sc) {
    const third = sc.caster && !baseClass(sc.cls)?.spellAbility ? { ability: ABIL.includes(sc.spellAbility) ? sc.spellAbility : 'INT', list: sc.spellList || 'wizard', from: 3, cantrips: l => 2 + (l >= 10 ? 1 : 0), prepared: l => THIRD_PREPARED[l - 1], slots: THIRD_SLOTS } : null;
    return { ...sc, id: sc.id, name: String(sc.name || '').trim() || 'Unnamed subclass', summary: sc.summary || '', desc: sc.summary || '', source: 'homebrew', homebrew: true,
      features: (sc.features || []).map(f => ({ level: Number(f.level) || 3, name: f.name, desc: f.desc || '' })).sort((a, b) => a.level - b.level),
      profsAt: [...(sc.training || []).filter(k => SUB_TRAINING[k]).map(k => ({ level: 3, prof: SUB_TRAINING[k] })), ...(sc.tools || []).map(t => ({ level: 3, prof: t }))],
      extraAttackAt: Number(sc.extraAttackAt) || 0, hpPerLevel: !!sc.hpPerLevel, spell: third };
  }
  function checkSubclass(sc, others = []) {
    const r = [], add = (ok, label, detail = '') => r.push({ ok, label, detail: ok ? '' : detail }), c = baseClass(sc.cls), name = String(sc.name || '').trim().toLowerCase();
    add(!!c, 'A class', 'Choose the class this subclass belongs to.');
    add(!!name, 'A name', 'Give the subclass a name.');
    add(!c || !(c.subclasses || [c.subclass]).some(s => s.name.toLowerCase() === name) && !others.some(o => o.id !== sc.id && o.cls === sc.cls && String(o.name).trim().toLowerCase() === name), 'A name of its own', 'This class already has a subclass with this name.');
    add(!!String(sc.summary || '').trim(), 'A one-line summary', 'Say in one line what it is about; the creator shows it.');
    if (c) { const lv = subLevels(c.id), at = new Set((sc.features || []).map(f => Number(f.level))), miss = lv.filter(l => !at.has(l)), off = [...at].filter(l => !lv.includes(l));
      add(!miss.length, `Features at levels ${lv.join(', ')}`, `The ${c.name}'s subclasses gain features at ${lv.join(', ')}; missing: ${miss.join(', ')}.`);
      add(!off.length, 'No features at other levels', `${c.name} subclasses get nothing at level ${off.join(', ')}; move those features to a subclass level.`); }
    add((sc.features || []).every(f => String(f.name || '').trim()), 'Every feature named', 'A feature is missing its name.');
    if (sc.caster) add(!!c && !c.spellAbility, 'Spellcasting only for a class without it', 'This class casts spells already; a third-caster subclass is for Barbarians, Fighters, Monks and Rogues.');
    return r;
  }
  // Measured like the class comparison: the class's Quick build hero with each of its subclasses at levels 3/5/11/17.
  const SUB_LEVELS = [3, 5, 11, 17];
  function measureSub(clsId, subId, level) {
    const R = root.QBHeroRules, s = R.derive({ ...R.quickBuild(clsId, 'Test', level), subclass: subId }), a = mainAttack(s);
    return { hp: s.hp.max, ac: s.ac, dpa: a ? Math.round(avgDice(a.damage) * a.count * hitShare(a.bonus, 15) * 10) / 10 : 0, slots: (s.spellcasting?.slots || []).reduce((n, x) => n + x, 0), attack: a ? `${a.name} ${a.bonus >= 0 ? '+' : ''}${a.bonus}, ${a.damage}${a.count > 1 ? ' ×' + a.count : ''}` : '' };
  }
  function compareSubclass(sc) {
    const R = root.QBHeroRules, keep = R.getHomebrew(), c = baseClass(sc.cls); if (!c) return [];
    const subs = (c.subclasses || [c.subclass]).filter(s => !s.homebrew);
    R.setHomebrew({ ...(keep || {}), subclasses: [...((keep && keep.subclasses) || []).filter(x => x.id !== sc.id), subclassToSrd(sc)] });
    let mine, theirs; try { mine = SUB_LEVELS.map(lv => measureSub(c.id, sc.id, lv)); theirs = subs.map(s => SUB_LEVELS.map(lv => measureSub(c.id, s.id, lv))); } finally { R.setHomebrew(keep); }
    const counts = subs.map(s => s.features.length), feats = (sc.features || []).length;
    return SUB_LEVELS.map((level, i) => { const col = k => theirs.map(t => t[i][k]), max = k => Math.max(...col(k)), min = k => Math.min(...col(k)), m = mine[i];
      const flags = [m.hp > max('hp') * 1.1 && `HP ${m.hp} (${c.name} subclasses up to ${max('hp')})`, m.ac > max('ac') && `AC ${m.ac} (up to ${max('ac')})`, m.dpa > max('dpa') * 1.1 && `damage ${m.dpa} per action (up to ${max('dpa')})`,
        m.slots > max('slots') && `${m.slots} spell slots (up to ${max('slots')})`].filter(Boolean);
      if (i === 0 && feats > Math.max(...counts)) flags.push(`${feats} features (${c.name} subclasses have ${Math.min(...counts)}–${Math.max(...counts)})`);
      return { level, mine: m, min: { hp: min('hp'), ac: min('ac'), dpa: min('dpa') }, max: { hp: max('hp'), ac: max('ac'), dpa: max('dpa') }, flags }; });
  }
  function subclassPowerCheck(sc) { let rows; try { rows = compareSubclass(sc); } catch (e) { rows = []; }
    const c = baseClass(sc.cls), over = rows.filter(r => r.flags.length);
    return { ok: !!c && !over.length, label: `Within the range of the ${c ? c.name : 'class'}'s subclasses`, detail: over.length ? `Stronger than every one: ${over.map(r => `level ${r.level}: ${r.flags.join(', ')}`).join('; ')}.` : c ? '' : 'Choose a class first.', rows }; }
  const subclassFits = (sc, others = []) => checkSubclass(sc, others).every(x => x.ok) && subclassPowerCheck(sc).ok;

  // Measured like every SRD class: its Quick build hero at levels 1/5/11/17 (HP, AC, best attack, expected damage per
  // action against AC 15 with Stakes grazes). Weapons and cantrips only: spell slots and limited features aren't counted.
  const LEVELS = [1, 5, 11, 17];
  // The hero's strongest attack line against AC 15, Sneak Attack lines included (a Rogue lands it most turns).
  const lineDpa = a => avgDice(a.damage) * a.count * hitShare(a.bonus, 15);
  const mainAttack = s => s.attacks.reduce((best, x) => !best || lineDpa(x) > lineDpa(best) ? x : best, null);
  const avgDice = e => String(e).split('+').reduce((n, t) => { const d = t.match(/^(\d+)d(\d+)$/); return n + (d ? d[1] * (+d[2] + 1) / 2 : Number(t) || 0); }, 0);
  const hitShare = (b, ac) => { let n = 0; for (let d = 2; d <= 20; d++) n += d === 20 || d + b >= ac ? 1 : d + b >= ac - 5 ? 0.5 : 0; return n / 20; };
  function measure(clsId, level) {
    const R = root.QBHeroRules, s = R.derive(R.quickBuild(clsId, 'Test', level)), a = mainAttack(s);
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
  /* ---- feats: a name, a kind, an optional +1 and the text; the DM approves what it does ---- */
  // The kind sets the level, as in the 2024 rules: every general feat is Level 4+, every Epic Boon Level 19+.
  const FEAT_TYPES = { origin: { label: 'Origin feat (from a background or the Human)', minLevel: 1 }, general: { label: 'General feat (level 4 and up)', minLevel: 4 },
    'fighting-style': { label: 'Fighting Style feat', minLevel: 1 }, 'epic-boon': { label: 'Epic Boon (level 19)', minLevel: 19 } };
  const ABIL_NAME = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };
  function newFeat() { return { id: uid('hb-ft'), kind: 'feat', name: '', desc: '', type: 'general', minLevel: 4, abilities: [], blocks: [], repeatable: false, prereq: newPrereq(), approved: false, updated: Date.now() }; }
  // Prerequisites the creator enforces (an ability score, spellcasting, another feat, a class) plus free text it only shows.
  function newPrereq() { return { abilities: [], score: 13, spellcasting: false, feat: '', cls: '', text: '' }; }
  // How many feats a feat needs in a row (itself included): the guide keeps chains to three at most.
  function chainLength(f, others) { let n = 1, cur = f; const seen = new Set([f.id]);
    while (cur?.prereq?.feat && n < 10) { const next = [...others, ...H().feats].find(x => x.id === cur.prereq.feat); if (!next || seen.has(next.id)) break; seen.add(next.id); n++; cur = next; } return n; }
  /* ---- feat power: what a feat gives, as weighted building blocks (like species traits) ---- */
  // A +1 to an ability counts 1 (an Ability Score Improvement's +2 counts 2). The weights are calibrated so the 2024 feats
  // of each kind form a range (FEAT_REFERENCE below); a homebrew feat has to land inside the range of its kind.
  const FEAT_BLOCKS = {
    skill: { label: 'A skill proficiency (each)', weight: 0.5, count: true }, expertise: { label: 'Expertise in a skill', weight: 1 }, tool: { label: 'A tool proficiency (each)', weight: 0.25, count: true },
    savingThrow: { label: 'Proficiency in a saving throw', weight: 1.5 }, lightArmor: { label: 'Light armor and shield training', weight: 1 }, mediumArmor: { label: 'Medium armor training', weight: 1 },
    heavyArmor: { label: 'Heavy armor training', weight: 1.5 }, martialWeapons: { label: 'Martial weapon training', weight: 1 }, hpPerLevel: { label: '+2 hit points per level', weight: 2 },
    speed: { label: 'More speed, or a climb/swim speed', weight: 0.5 }, sense: { label: 'A sense (darkvision, blindsight)', weight: 0.5 }, resistance: { label: 'Resistance or damage reduction', weight: 0.5 },
    advantage: { label: 'Advantage on one kind of roll', weight: 0.5 }, initiative: { label: 'A big Initiative bonus', weight: 1.5 }, cantrip: { label: 'A cantrip', weight: 0.5 },
    spell1: { label: 'A level 1 spell, once per long rest', weight: 0.5 }, spell2: { label: 'A level 2 spell, once per long rest', weight: 1 }, rituals: { label: 'Ritual spells', weight: 1 },
    reaction: { label: 'A new Reaction', weight: 1 }, bonusAction: { label: 'A new Bonus Action option', weight: 0.5 }, bonusAttack: { label: 'An extra attack as a Bonus Action', weight: 1 },
    extraDamage: { label: 'Extra damage now and then', weight: 0.5 }, damageBonus: { label: 'A big damage bonus (like +Proficiency)', weight: 1.5 }, attackBonus: { label: '+2 to hit or +1 AC', weight: 1 },
    reroll: { label: 'A reroll or a d4 boost', weight: 0.5 }, luck: { label: 'Several uses of Advantage per day (like Lucky)', weight: 2 }, ignore: { label: 'Ignore a drawback (cover, loading, resistance…)', weight: 0.5 },
    healing: { label: 'Healing or temporary hit points', weight: 1 }, utility: { label: 'A small trick or utility', weight: 0.5 }, big: { label: 'A capstone benefit (Epic Boon)', weight: 2 },
    custom: { label: 'Something else (you rate it)', weight: null }, drawback: { label: 'A drawback (you rate it)', weight: null }
  };
  const fb = (k, n = 1) => ({ block: k, n });
  // The 2024 feats broken into blocks: the calibration. (Ability Score Improvement is the baseline for general feats: 2.)
  const FEAT_REFERENCE = {
    alert: [fb('initiative'), fb('utility')], 'magic-initiate': [fb('cantrip', 2), fb('spell1')], 'savage-attacker': [fb('reroll'), fb('extraDamage')], skilled: [fb('skill', 3)],
    crafter: [fb('tool', 3), fb('utility'), fb('utility')], healer: [fb('healing'), fb('reroll')], lucky: [fb('luck')], musician: [fb('tool', 3), fb('healing')], 'tavern-brawler': [fb('extraDamage'), fb('reroll'), fb('utility')], tough: [fb('hpPerLevel')],
    archery: [fb('attackBonus')], defense: [fb('attackBonus')], 'great-weapon-fighting': [fb('reroll'), fb('extraDamage')], 'two-weapon-fighting': [fb('extraDamage'), fb('extraDamage')], 'blind-fighting': [fb('sense')], dueling: [fb('extraDamage'), fb('extraDamage')],
    interception: [fb('reaction')], protection: [fb('reaction')], 'thrown-weapon-fighting': [fb('extraDamage'), fb('utility')], 'unarmed-fighting': [fb('extraDamage'), fb('extraDamage')],
    grappler: [fb('bonusAttack'), fb('advantage'), fb('utility')], actor: [fb('advantage'), fb('utility')], athlete: [fb('speed'), fb('utility')], charger: [fb('speed'), fb('extraDamage')], chef: [fb('tool'), fb('healing'), fb('utility')],
    'crossbow-expert': [fb('ignore'), fb('ignore'), fb('extraDamage')], crusher: [fb('utility'), fb('advantage')], 'defensive-duelist': [fb('reaction')], 'dual-wielder': [fb('bonusAttack')], durable: [fb('advantage'), fb('healing')],
    'elemental-adept': [fb('ignore'), fb('extraDamage')], 'fey-touched': [fb('spell2'), fb('spell1')], 'great-weapon-master': [fb('damageBonus'), fb('bonusAttack')], 'heavily-armored': [fb('heavyArmor')], 'heavy-armor-master': [fb('resistance'), fb('resistance')],
    'inspiring-leader': [fb('healing')], 'keen-mind': [fb('expertise'), fb('bonusAction')], 'lightly-armored': [fb('lightArmor')], 'mage-slayer': [fb('utility'), fb('reroll')], 'martial-weapon-training': [fb('martialWeapons')],
    'medium-armor-master': [fb('attackBonus')], 'moderately-armored': [fb('mediumArmor')], 'mounted-combatant': [fb('advantage'), fb('reaction')], observant: [fb('expertise'), fb('bonusAction')], piercer: [fb('reroll'), fb('extraDamage')],
    poisoner: [fb('ignore'), fb('tool'), fb('extraDamage')], 'polearm-master': [fb('bonusAttack'), fb('reaction')], resilient: [fb('savingThrow')], 'ritual-caster': [fb('rituals'), fb('utility')], sentinel: [fb('reaction'), fb('utility')],
    'shadow-touched': [fb('spell2'), fb('spell1')], sharpshooter: [fb('ignore'), fb('ignore'), fb('ignore')], 'shield-master': [fb('bonusAction'), fb('resistance')], 'skill-expert': [fb('skill'), fb('expertise')], skulker: [fb('sense'), fb('advantage'), fb('utility')],
    slasher: [fb('utility'), fb('advantage')], speedy: [fb('speed'), fb('utility'), fb('utility')], 'spell-sniper': [fb('ignore'), fb('ignore'), fb('utility')], telekinetic: [fb('cantrip'), fb('bonusAction')], telepathic: [fb('utility'), fb('spell2')],
    'war-caster': [fb('advantage'), fb('reaction'), fb('utility')], 'weapon-master': [fb('utility')],
    'boon-of-combat-prowess': [fb('big')], 'boon-of-dimensional-travel': [fb('big')], 'boon-of-fate': [fb('big')], 'boon-of-irresistible-offense': [fb('big')], 'boon-of-spell-recall': [fb('big')], 'boon-of-the-night-spirit': [fb('big')],
    'boon-of-truesight': [fb('big')], 'boon-of-energy-resistance': [fb('big')], 'boon-of-fortitude': [fb('big')], 'boon-of-recovery': [fb('big')], 'boon-of-skill': [fb('big')], 'boon-of-speed': [fb('big')]
  };
  // A feat's score: its blocks plus its +1 (general feats and boons). Custom blocks and drawbacks carry the DM's own weight.
  function featScore(f) {
    if (f.id === 'ability-score-improvement') return 2;
    const plus = (f.abilities || []).length || /Ability Score Increase/.test(f.desc || '') ? 1 : 0;
    return plus + (f.blocks || []).reduce((s, x) => { const B = FEAT_BLOCKS[x.block]; if (!B) return s; const w = B.weight ?? (Number(x.weight) || 0) * (x.block === 'drawback' ? -1 : 1); return s + w * (B.count ? Math.max(1, Number(x.n) || 1) : 1); }, 0);
  }
  // The range per kind, from the 2024 feats themselves (needs the merged feat list; the SRD and Player's Handbook feats).
  function featBand(type) {
    const ref = H().feats.filter(x => x.type === type && (FEAT_REFERENCE[x.id] || x.id === 'ability-score-improvement')).map(x => featScore({ ...x, blocks: FEAT_REFERENCE[x.id] }));
    if (!ref.length) return null; let min = Math.min(...ref), max = Math.max(...ref); if (max - min < 1) { const mid = (min + max) / 2; min = mid - 0.5; max = mid + 0.5; } // a narrow range (Epic Boons) gets half a point each way
    return { min, max, n: ref.length };
  }
  function checkFeat(f, others = []) {
    const r = [], add = (ok, label, detail) => r.push({ ok: !!ok, label, detail: ok ? '' : detail }), T = FEAT_TYPES[f.type];
    add(String(f.name || '').trim(), 'A name', 'Give the feat a name.');
    add(!H().feats.some(x => x.id !== f.id && x.name.toLowerCase() === String(f.name || '').trim().toLowerCase()), 'A name of its own', 'Another feat already has this name.');
    add(T, 'A kind of feat', 'Choose origin, general, Fighting Style or Epic Boon.');
    const needsPlus = f.type === 'general' || f.type === 'epic-boon', n = (f.abilities || []).length;
    add(needsPlus ? n >= 1 : n === 0, needsPlus ? 'A +1 to an ability' : 'No ability increase', needsPlus ? 'In the 2024 rules every general feat and Epic Boon also raises an ability by 1: choose which abilities it may raise.' : 'Origin and Fighting Style feats don’t raise abilities in the 2024 rules.');
    add(String(f.desc || '').trim().length >= 20, 'What it does', 'Describe what the feat does in your own words (at least a sentence).');
    const p = f.prereq || {};
    if ((p.abilities || []).length) add(Number(p.score) >= 13 && Number(p.score) <= 17, 'An ability prerequisite of 13–17', 'Use 13 (a +1 modifier); go up to 17 only for a stricter feat.');
    if (p.feat) add(p.feat !== f.id && [...others, ...H().feats].some(x => x.id === p.feat), 'The required feat exists', 'The feat it requires was deleted; choose another.');
    if (p.feat) add(chainLength(f, others) <= 3, 'A feat chain of three at most', 'Feats that need feats that need feats: keep a chain to three.');
    const band = featBand(f.type), score = featScore(f), strict = p.feat || p.cls ? 0.5 : 0;
    if (band) add(score >= band.min && score <= band.max + strict, `Power in the range of the 2024 ${T?.label.split(' (')[0].toLowerCase() || 'feat'}s`, score < band.min ? `It scores ${score}; the ${band.n} 2024 ones score ${band.min}–${band.max}. Add what the feat gives under “What it gives” (or it gives too little).` : `It scores ${score}; the 2024 ones score at most ${band.max}${strict ? ' (+0.5 for its stricter prerequisite)' : ''}. Take something away or add a drawback.`);
    return r;
  }
  const featFits = (f, others) => checkFeat(f, others).every(x => x.ok);
  // Advice from the D&D Wiki feat design guides: never blocks approval, shown while the DM writes.
  function featAdvice(f) { const a = [], p = f.prereq || {}, d = String(f.desc || '');
    a.push('Name test: does "I am a ' + (String(f.name || '').trim() || '…') + '" sound right? Feats are named for what the hero is (Grappler, not Improved Grappling).');
    if ((p.abilities || []).some(k => (f.abilities || []).includes(k))) a.push('It raises and requires the same ability: the prerequisite is probably not needed.');
    if (/\+\s*[1-9]\b/.test(d) && !/\b(when|while|if|once|after|before)\b/i.test(d)) a.push('A flat bonus? Conditional benefits (when…, while…, once per…) are more interesting and easier to balance.');
    if (p.feat || p.cls || p.text) a.push('A stricter feat: it should still be worth about a +2 ability increase, no more.');
    if ((f.abilities || []).length === 1 && f.type === 'general') a.push('Only one ability for its +1: offering two (Intelligence or Wisdom) lets more heroes use it.');
    a.push('Does it give a new option rather than a static number, and will it come up often, but not every turn?');
    return a; }
  // The shape the rules read: an SRD feat. A +1 is written the way SRD feats write it, so the creator offers the same pick.
  function featToSrd(f) {
    const ab = (f.abilities || []).filter(k => ABIL.includes(k)), names = ab.map(k => ABIL_NAME[k]), max = f.type === 'epic-boon' ? 30 : 20;
    const plus = !ab.length ? '' : `**Ability Score Increase.** ${ab.length === 6 ? 'Increase one ability score of your choice' : 'Increase your ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' or ' + names.at(-1) : names[0]) + ' score'} by 1, to a maximum of ${max}.
`;
    const p = f.prereq || {}, parts = [(p.abilities || []).length ? p.abilities.map(k => ABIL_NAME[k]).join(' or ') + ' ' + (Number(p.score) || 13) + '+' : '', p.spellcasting ? 'the Spellcasting or Pact Magic feature' : '',
      p.feat ? 'the ' + ([...H().feats].find(x => x.id === p.feat)?.name || p.feat) + ' feat' : '', p.cls ? 'levels in ' + (H().classes.find(c => c.id === p.cls)?.name || p.cls) : '', p.text || ''].filter(Boolean);
    const pre = parts.length ? `**Prerequisite:** ${parts.join('; ')}.\n` : '';
    return { id: f.id, name: String(f.name || '').trim() || 'Unnamed feat', type: FEAT_TYPES[f.type] ? f.type : 'general', minLevel: (FEAT_TYPES[f.type] || FEAT_TYPES.general).minLevel, repeatable: !!f.repeatable,
      prereq: { abilities: (p.abilities || []).filter(k => ABIL.includes(k)), score: Number(p.score) || 13, spellcasting: !!p.spellcasting, feat: p.feat || '', cls: p.cls || '' }, desc: pre + plus + (f.desc || ''), homebrew: true };
  }

  const FORMAT = 'quillbound-homebrew';
  // opts.from = 'player': a player's submission to the DM (marked so the DM sees where it came from).
  // opts.approved: the DM shares the homebrew they approved; a player's import keeps those approvals.
  function exportJson(hb, ids, opts = {}) {
    const pick = list => (list || []).filter(x => (!ids || ids.includes(x.id)) && (!opts.approved || x.approved)).map(x => ({ ...x, approved: !!opts.approved, fromPlayer: undefined }));
    return JSON.stringify({ format: FORMAT, version: 3, exported: new Date().toISOString(), ...(opts.from === 'player' ? { from: 'player' } : {}), ...(opts.approved ? { approvedByDm: true } : {}),
      backgrounds: pick(hb?.backgrounds), species: pick(hb?.species), classes: pick(hb?.classes), feats: pick(hb?.feats), subclasses: pick(hb?.subclasses) }, null, 2);
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
    spellAbility: ABIL.includes(c.spellAbility) ? c.spellAbility : '', spellList: str(c.spellList, 30), cantrips: Number(c.cantrips) || 0, cantripsAt: ['4,10', '10,14'].includes(c.cantripsAt) ? c.cantripsAt : '4,10', tools: (c.tools || []).map(x => str(x, 60)).filter(Boolean), extraAttack: !!c.extraAttack, fightingStyle: Number(c.fightingStyle) || 0,
    mastery: Number(c.mastery) || 0, sneakFrom: Number(c.sneakFrom) || 0, martialArtsFrom: Number(c.martialArtsFrom) || 0, unarmored: ABIL.includes(c.unarmored) ? c.unarmored : '',
    expertise: textList(c.expertise, ['level', 'count']), attacks: textList(c.attacks, ['level', 'name', 'dice', 'ability', 'type', 'ranged']), features: textList(c.features, ['level', 'name', 'desc']),
    subclass: { name: str(c.subclass?.name, 80), summary: str(c.subclass?.summary, 500), training: (c.subclass?.training || []).filter(a => ARMOR_NAME[a] || a === 'martial'), tools: (c.subclass?.tools || []).map(x => str(x, 60)).filter(Boolean), features: textList(c.subclass?.features, ['level', 'name', 'desc']) },
    kit: { items: (c.kit?.items || []).map(i => ({ id: String(i.id), count: Number(i.count) || 1 })), gp: Number(c.kit?.gp) || 0 }, kind: 'class', approved: false }; };
  const cleanFeat = f => ({ ...newFeat(), id: str(f.id, 60) || uid('hb-ft'), name: str(f.name, 80), desc: str(f.desc, 3000), type: FEAT_TYPES[f.type] ? f.type : 'general', minLevel: (FEAT_TYPES[f.type] || FEAT_TYPES.general).minLevel,
    abilities: (f.abilities || []).filter(k => ABIL.includes(k)), repeatable: !!f.repeatable, kind: 'feat', approved: false,
    blocks: (Array.isArray(f.blocks) ? f.blocks : []).filter(x => FEAT_BLOCKS[x?.block]).map(x => ({ block: x.block, n: Math.max(1, Math.min(9, Number(x.n) || 1)), ...(FEAT_BLOCKS[x.block].weight === null ? { weight: Math.max(0.5, Math.min(3, Number(x.weight) || 0.5)) } : {}) })),
    prereq: { abilities: (f.prereq?.abilities || []).filter(k => ABIL.includes(k)), score: Number(f.prereq?.score) || 13, spellcasting: !!f.prereq?.spellcasting, feat: str(f.prereq?.feat, 60), cls: str(f.prereq?.cls, 60), text: str(f.prereq?.text, 300) } });
  const cleanSubclass = s => ({ ...newSubclass(), id: str(s.id, 60) || uid('hb-sc'), cls: str(s.cls, 40), name: str(s.name, 80), summary: str(s.summary, 500), features: textList(s.features, ['level', 'name', 'desc']),
    training: (s.training || []).filter(k => SUB_TRAINING[k]), tools: (s.tools || []).map(x => str(x, 60)).filter(Boolean), extraAttackAt: [5, 6].includes(Number(s.extraAttackAt)) ? Number(s.extraAttackAt) : 0, hpPerLevel: !!s.hpPerLevel,
    caster: !!s.caster, spellAbility: ['INT', 'WIS', 'CHA'].includes(s.spellAbility) ? s.spellAbility : 'INT', spellList: str(s.spellList, 30) || 'wizard', kind: 'subclass', approved: false });
  // Read a file: returns what it contains and anything that needs a decision. Nothing is changed here.
  function parseImport(text, hb) {
    let data; try { data = JSON.parse(text); } catch { return { error: 'This file is not readable homebrew (not JSON).' }; }
    if (data?.format !== FORMAT) return { error: 'This file is not a Quillbound homebrew export.' };
    const ok = x => x && typeof x === 'object' && typeof x.name === 'string';
    // a DM's shared file keeps its approvals; a player's submission is marked as one; anything else starts unapproved
    const mark = clean => x => ({ ...clean(x), updated: Number(x.updated) || 0, approved: !!data.approvedByDm && x.approved === true, ...(data.from === 'player' ? { fromPlayer: true } : {}) });
    const items = [...(data.backgrounds || []).filter(ok).map(mark(cleanBackground)), ...(data.species || []).filter(ok).map(mark(cleanSpecies)), ...(data.classes || []).filter(ok).map(mark(cleanClass)), ...(data.feats || []).filter(ok).map(mark(cleanFeat)), ...(data.subclasses || []).filter(ok).map(mark(cleanSubclass))];
    const listOf = it => it.kind === 'subclass' ? hb?.subclasses : it.kind === 'species' ? hb?.species : it.kind === 'class' ? hb?.classes : it.kind === 'feat' ? hb?.feats : hb?.backgrounds;
    const clashes = items.filter(b => (listOf(b) || []).some(x => x.id === b.id || x.name.toLowerCase() === b.name.toLowerCase())).map(b => b.id);
    return { items, clashes, approvedByDm: !!data.approvedByDm, fromPlayer: data.from === 'player' };
  }
  // The table's approved homebrew (homebrew/table.json on the site, written by the DM's "Publish to the table…"): added
  // to every browser automatically, approved. A newer published version replaces a copy that came from the table; homebrew
  // of a browser's own (same id, made there) is never replaced, and a name it already uses is skipped. Deleting works both
  // ways: what the DM takes off the table leaves every browser that got it from the table, and what a player deletes
  // (hb.tableDismissed) isn't added again. Heroes keep their own copies, so they still work. Returns how many changed.
  function mergeTable(hb, text) {
    let data; try { data = JSON.parse(text); } catch { return 0; }
    if (data?.format !== FORMAT || !data.approvedByDm) return 0;
    const parsed = parseImport(text, hb); if (parsed.error) return 0;
    let n = 0; const onTable = new Set(parsed.items.filter(x => x.approved).map(x => x.id)), dismissed = new Set(hb.tableDismissed || []);
    for (const kind of ['backgrounds', 'species', 'classes', 'feats', 'subclasses']) { const before = (hb[kind] || []).length; hb[kind] = (hb[kind] || []).filter(x => !x.fromTable || onTable.has(x.id)); n += before - hb[kind].length; }
    for (const it of parsed.items) { if (!it.approved || dismissed.has(it.id)) continue;
      const kind = it.kind === 'subclass' ? 'subclasses' : it.kind === 'species' ? 'species' : it.kind === 'class' ? 'classes' : it.kind === 'feat' ? 'feats' : 'backgrounds';
      hb[kind] ??= []; const list = hb[kind], i = list.findIndex(x => x.id === it.id), copy = { ...it, fromTable: true, updated: Number(it.updated) || 0 };
      if (i >= 0) { if (list[i].fromTable && (Number(list[i].updated) || 0) < copy.updated) { list[i] = copy; n++; } continue; }
      if (list.some(x => String(x.name).trim().toLowerCase() === it.name.trim().toLowerCase())) continue;
      list.push(copy); n++; }
    return n;
  }
  // Apply an import. decisions[id] = 'replace' | 'copy' | 'skip' for clashes; everything else is added. Imported homebrew starts unapproved.
  function applyImport(hb, parsed, decisions = {}) {
    const out = { ...hb, backgrounds: [...(hb.backgrounds || [])], species: [...(hb.species || [])], classes: [...(hb.classes || [])], feats: [...(hb.feats || [])], subclasses: [...(hb.subclasses || [])] }, done = { added: 0, replaced: 0, skipped: 0 };
    for (const b of parsed.items) {
      const list = b.kind === 'subclass' ? out.subclasses : b.kind === 'species' ? out.species : b.kind === 'class' ? out.classes : b.kind === 'feat' ? out.feats : out.backgrounds;
      if (!parsed.clashes.includes(b.id)) { list.push(b); done.added++; continue; }
      const how = decisions[b.id] || 'skip';
      if (how === 'skip') { done.skipped++; continue; }
      if (how === 'copy') { list.push({ ...b, id: uid(b.kind === 'subclass' ? 'hb-sc' : b.kind === 'species' ? 'hb-sp' : b.kind === 'class' ? 'hb-cl' : b.kind === 'feat' ? 'hb-ft' : 'hb-bg'), name: b.name + ' (imported)' }); done.added++; continue; }
      const i = list.findIndex(x => x.id === b.id || x.name.toLowerCase() === b.name.toLowerCase()); list[i] = { ...b, id: list[i].id }; done.replaced++;
    }
    return { hb: out, done };
  }

  root.QBHomebrew = { SUB_TRAINING, SUB_LEVELS, newSubclass, subLevels, subclassToSrd, checkSubclass, compareSubclass, subclassPowerCheck, subclassFits, FEAT_BLOCKS, FEAT_REFERENCE, featScore, featBand, mergeTable, FEAT_TYPES, newFeat, newPrereq, checkFeat, featFits, featAdvice, featToSrd, CASTER, CLASS_KIT, newClass, checkClass, classToSrd, compareClass, classPowerCheck, classFits, srdClassTable, fightTest, encountersFor, ABIL, KIT_MIN, KIT_MAX, BAND, BLOCKS, newBackground, kitValue, tools, checkBackground, fits, backgroundToSrd, newSpecies, speciesScore, traitWeight, checkSpecies, speciesFits, speciesToSrd, srdSpeciesScores, forCreator, exportJson, parseImport, applyImport };
})(globalThis);