// The 2024 Player's Handbook feats that aren't in the free rules (SRD 5.2), added to the same list as the SRD feats.
// Names, kinds, prerequisites and ability increases follow the book; every description is a short summary in
// Quillbound's own words, not the book's text. Players check the book for the exact wording.
// effects (calculated on the sheet): hpPerLevel, hpFlat, training (TRAINING keys in hero-rules.js), saveFromPlus (Resilient).
(function (root) {
  const D = root.QBHERO; if (!D) return;
  const N = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };
  const or = ks => ks.length > 1 ? ks.slice(0, -1).map(k => N[k]).join(', ') + ' or ' + N[ks.at(-1)] : N[ks[0]];
  // feat(id, name, type, { plus: [abilities] | 'any', pre: { abilities, score, spellcasting, text }, repeatable, effects }, summary)
  const feat = (id, name, type, o, text) => {
    const pre = o.pre || {}, lvl = { origin: 1, 'fighting-style': 1, general: 4, 'epic-boon': 19 }[type];
    const preParts = [type === 'general' ? 'Level 4+' : type === 'epic-boon' ? 'Level 19+' : '', type === 'fighting-style' ? 'Fighting Style feature' : '',
      (pre.abilities || []).length ? or(pre.abilities) + ' ' + (pre.score || 13) + '+' : '', pre.spellcasting ? 'Spellcasting or Pact Magic feature' : '', pre.text || ''].filter(Boolean);
    const plus = o.plus === 'any' ? `**Ability Score Increase.** Increase one ability score of your choice by 1, to a maximum of ${type === 'epic-boon' ? 30 : 20}.\n`
      : o.plus ? `**Ability Score Increase.** Increase your ${or(o.plus)} score by 1, to a maximum of 20.\n` : '';
    return { id, name, type, minLevel: lvl, repeatable: !!o.repeatable, source: 'phb-2024', prereq: { abilities: pre.abilities || [], score: pre.score || 13, spellcasting: !!pre.spellcasting, feat: '', cls: '' },
      effects: o.effects || null, desc: (preParts.length ? `**Prerequisite:** ${preParts.join('; ')}.\n` : '') + plus + text + '\n(Summary; see the 2024 Player’s Handbook for the full rules.)' };
  };
  const SD = ['STR', 'DEX'], MENTAL = ['INT', 'WIS', 'CHA'];
  const FEATS = [
    // Origin feats
    feat('crafter', 'Crafter', 'origin', {}, 'Training with three Artisan’s Tools of your choice; nonmagical items cost you 20% less; after a long rest you can make one simple item (such as a ladder, torch or rope) that lasts until your next long rest.'),
    feat('healer', 'Healer', 'origin', {}, 'With a Healer’s Kit, spend an action to let a creature spend one of its Hit Dice; you roll it and it regains that much plus your Proficiency Bonus. When you roll dice to heal, you can reroll any 1s.'),
    feat('lucky', 'Lucky', 'origin', {}, 'You have Luck Points equal to your Proficiency Bonus, regained on a long rest. Spend one to give yourself Advantage on a d20 Test, or to give an attack roll against you Disadvantage.'),
    feat('musician', 'Musician', 'origin', {}, 'Training with three musical instruments. After a short or long rest, play a song to give Heroic Inspiration to a number of allies up to your Proficiency Bonus.'),
    feat('tavern-brawler', 'Tavern Brawler', 'origin', {}, 'Your Unarmed Strikes deal 1d4 + Strength, and you reroll 1s on their damage dice. You are proficient with improvised weapons. Once per turn, an Unarmed Strike hit can also push the target 5 feet.'),
    feat('tough', 'Tough', 'origin', { effects: { hpPerLevel: 2 } }, 'Your Hit Point maximum increases by 2 for every character level you have (calculated on the sheet).'),
    // Fighting Style feats
    feat('blind-fighting', 'Blind Fighting', 'fighting-style', {}, 'You have Blindsight with a range of 10 feet.'),
    feat('dueling', 'Dueling', 'fighting-style', {}, 'While you wield a melee weapon in one hand and no other weapon, you deal 2 extra damage with it.'),
    feat('interception', 'Interception', 'fighting-style', {}, 'With a Shield or a weapon in hand, use your Reaction when a creature you can see hits someone within 5 feet of you to reduce that damage by 1d10 + your Proficiency Bonus.'),
    feat('protection', 'Protection', 'fighting-style', {}, 'While holding a Shield, use your Reaction when a creature attacks an ally within 5 feet of you to give that attack Disadvantage.'),
    feat('thrown-weapon-fighting', 'Thrown Weapon Fighting', 'fighting-style', {}, 'You draw a Thrown weapon as part of the attack, and a ranged attack with a Thrown weapon deals 2 extra damage.'),
    feat('unarmed-fighting', 'Unarmed Fighting', 'fighting-style', {}, 'Your Unarmed Strikes deal 1d6 + Strength (1d8 with no weapon or Shield in hand), and a creature you grapple takes 1d4 damage at the start of each of your turns.'),
    // General feats (Level 4+)
    feat('actor', 'Actor', 'general', { plus: ['CHA'], pre: { abilities: ['CHA'] } }, 'Advantage on Deception and Performance checks to pass yourself off as someone else, and you can mimic voices and sounds you have heard.'),
    feat('athlete', 'Athlete', 'general', { plus: SD, pre: { abilities: SD } }, 'You gain a Climb Speed equal to your Speed, standing up costs only 5 feet of movement, and you need only 5 feet of movement before a running jump.'),
    feat('charger', 'Charger', 'general', { plus: SD, pre: { abilities: SD } }, 'Dashing gives you 10 extra feet of Speed. Once per turn, after moving at least 10 feet straight toward a target, a melee hit deals an extra 1d8 or pushes it 10 feet.'),
    feat('chef', 'Chef', 'general', { plus: ['CON', 'WIS'] }, 'Training with Cook’s Utensils. Your meals let allies regain extra hit points on a short rest, and after a long rest you make treats that grant Temporary Hit Points.'),
    feat('crossbow-expert', 'Crossbow Expert', 'general', { plus: ['DEX'], pre: { abilities: ['DEX'] } }, 'You ignore the Loading property of crossbows, being next to an enemy doesn’t give your ranged attacks Disadvantage, and the extra attack with a light crossbow adds your ability modifier.'),
    feat('crusher', 'Crusher', 'general', { plus: ['STR', 'CON'] }, 'Once per turn, a Bludgeoning hit can push the target 5 feet. A critical hit with Bludgeoning damage gives attacks against that target Advantage until your next turn.'),
    feat('defensive-duelist', 'Defensive Duelist', 'general', { plus: ['DEX'], pre: { abilities: ['DEX'] } }, 'While holding a Finesse weapon, use your Reaction when hit by a melee attack to add your Proficiency Bonus to your AC against it.'),
    feat('dual-wielder', 'Dual Wielder', 'general', { plus: SD, pre: { abilities: SD } }, 'Your Bonus Action attack with a second weapon works even if it isn’t Light, and you can draw or stow two weapons at once.'),
    feat('durable', 'Durable', 'general', { plus: ['CON'] }, 'Advantage on Death Saving Throws, and you can spend a Hit Die to heal as a Bonus Action.'),
    feat('elemental-adept', 'Elemental Adept', 'general', { plus: MENTAL, pre: { spellcasting: true }, repeatable: true }, 'Choose Acid, Cold, Fire, Lightning or Thunder: your spells ignore Resistance to it, and 1s on its damage dice count as 2s.'),
    feat('fey-touched', 'Fey-Touched', 'general', { plus: MENTAL }, 'You learn Misty Step and one level 1 Divination or Enchantment spell; each can be cast once per long rest without a slot.'),
    feat('great-weapon-master', 'Great Weapon Master', 'general', { plus: ['STR'], pre: { abilities: ['STR'] } }, 'A hit with a Heavy weapon as part of the Attack action deals extra damage equal to your Proficiency Bonus; after a critical hit or a kill in melee, you can attack again as a Bonus Action.'),
    feat('heavily-armored', 'Heavily Armored', 'general', { plus: ['STR', 'CON'], pre: { text: 'Medium Armor training' }, effects: { training: ['heavy-armor'] } }, 'You gain Heavy Armor training (calculated on the sheet).'),
    feat('heavy-armor-master', 'Heavy Armor Master', 'general', { plus: ['STR', 'CON'], pre: { text: 'Heavy Armor training' } }, 'While wearing Heavy armor, Bludgeoning, Piercing and Slashing damage you take from attacks is reduced by your Proficiency Bonus.'),
    feat('inspiring-leader', 'Inspiring Leader', 'general', { plus: ['WIS', 'CHA'], pre: { abilities: ['WIS', 'CHA'] } }, 'After a short or long rest, give up to six allies Temporary Hit Points equal to your level plus your Wisdom or Charisma modifier.'),
    feat('keen-mind', 'Keen Mind', 'general', { plus: ['INT'], pre: { abilities: ['INT'] } }, 'Proficiency (or Expertise, if already proficient) in Arcana, History, Investigation, Nature or Religion, and you can take the Study action as a Bonus Action.'),
    feat('lightly-armored', 'Lightly Armored', 'general', { plus: SD, effects: { training: ['light-armor', 'shields'] } }, 'You gain Light Armor and Shield training (calculated on the sheet).'),
    feat('mage-slayer', 'Mage Slayer', 'general', { plus: SD }, 'Creatures you damage have Disadvantage on Concentration saves, and once per rest you can turn a failed Intelligence, Wisdom or Charisma save into a success.'),
    feat('martial-weapon-training', 'Martial Weapon Training', 'general', { plus: SD, effects: { training: ['martial-weapons'] } }, 'You gain proficiency with Martial weapons (calculated on the sheet).'),
    feat('medium-armor-master', 'Medium Armor Master', 'general', { plus: SD, pre: { text: 'Medium Armor training' } }, 'In Medium armor you can add up to 3 (instead of 2) from Dexterity to your AC.'),
    feat('moderately-armored', 'Moderately Armored', 'general', { plus: SD, pre: { text: 'Light Armor training' }, effects: { training: ['medium-armor', 'shields'] } }, 'You gain Medium Armor and Shield training (calculated on the sheet).'),
    feat('mounted-combatant', 'Mounted Combatant', 'general', { plus: ['STR', 'DEX', 'WIS'] }, 'While mounted you have Advantage on attacks against smaller unmounted foes nearby, your mount takes less damage from Dexterity saves, and you can redirect attacks from your mount to yourself.'),
    feat('observant', 'Observant', 'general', { plus: ['INT', 'WIS'], pre: { abilities: ['INT', 'WIS'] } }, 'Proficiency (or Expertise) in Insight, Investigation or Perception, and you can take the Search action as a Bonus Action.'),
    feat('piercer', 'Piercer', 'general', { plus: SD, pre: { abilities: SD } }, 'Once per turn you can reroll one Piercing damage die, and a critical hit with Piercing damage rolls one extra damage die.'),
    feat('poisoner', 'Poisoner', 'general', { plus: ['DEX', 'INT'] }, 'Your damage ignores Poison Resistance, you gain Poisoner’s Kit training and can brew poison doses that deal 2d8 Poison damage and can poison the target.'),
    feat('polearm-master', 'Polearm Master', 'general', { plus: SD, pre: { abilities: SD } }, 'With a Quarterstaff, Spear or Heavy Reach weapon you can make a Bonus Action strike with the butt end (1d4), and you can attack a creature as it enters your reach.'),
    feat('resilient', 'Resilient', 'general', { plus: 'any', effects: { saveFromPlus: true } }, 'You gain saving throw proficiency in the ability you increase with this feat (calculated on the sheet).'),
    feat('ritual-caster', 'Ritual Caster', 'general', { plus: MENTAL, pre: { abilities: MENTAL } }, 'You always have a number of level 1 Ritual spells prepared equal to your Proficiency Bonus, and once per long rest you can cast a ritual at its normal casting time.'),
    feat('sentinel', 'Sentinel', 'general', { plus: SD, pre: { abilities: SD } }, 'Creatures next to you provoke your Reaction attack even when they Disengage or attack someone else, and your Opportunity Attack hits stop a creature’s movement.'),
    feat('shadow-touched', 'Shadow-Touched', 'general', { plus: MENTAL }, 'You learn Invisibility and one level 1 Illusion or Necromancy spell; each can be cast once per long rest without a slot.'),
    feat('sharpshooter', 'Sharpshooter', 'general', { plus: ['DEX'], pre: { abilities: ['DEX'] } }, 'Your ranged weapon attacks ignore Half and Three-Quarters Cover, aren’t hindered by nearby enemies and suffer no Disadvantage at long range.'),
    feat('shield-master', 'Shield Master', 'general', { plus: ['STR'], pre: { text: 'Shield training' } }, 'After a melee hit you can bash with your Shield to push the target or knock it Prone, and with a Shield you can take no damage on a successful Dexterity save that would halve it.'),
    feat('skill-expert', 'Skill Expert', 'general', { plus: 'any' }, 'Proficiency in one skill of your choice and Expertise in one skill you are proficient in (note them on the sheet with your DM).'),
    feat('skulker', 'Skulker', 'general', { plus: ['DEX'], pre: { abilities: ['DEX'] } }, 'You have Blindsight 10 feet, Advantage on Stealth when you Hide in combat, and missing an attack while hidden doesn’t give you away.'),
    feat('slasher', 'Slasher', 'general', { plus: SD, pre: { abilities: SD } }, 'Once per turn a Slashing hit reduces the target’s Speed by 10 feet, and a critical hit with Slashing damage gives the target Disadvantage on attacks until your next turn.'),
    feat('speedy', 'Speedy', 'general', { plus: ['DEX', 'CON'], pre: { abilities: ['DEX', 'CON'] } }, 'Your Speed increases by 10 feet, Dashing ignores Difficult Terrain, and Opportunity Attacks against you have Disadvantage.'),
    feat('spell-sniper', 'Spell Sniper', 'general', { plus: MENTAL, pre: { spellcasting: true } }, 'Your spell attacks ignore Half and Three-Quarters Cover and aren’t hindered by nearby enemies, and spells with a range of 10 feet or more reach 60 feet farther.'),
    feat('telekinetic', 'Telekinetic', 'general', { plus: MENTAL }, 'You can cast Mage Hand invisibly and farther, and as a Bonus Action you can shove a creature 5 feet with your mind (Strength save).'),
    feat('telepathic', 'Telepathic', 'general', { plus: MENTAL }, 'You can speak telepathically to creatures within 60 feet, and you can cast Detect Thoughts once per long rest without a slot.'),
    feat('war-caster', 'War Caster', 'general', { plus: MENTAL, pre: { spellcasting: true } }, 'Advantage on Concentration saves, you can cast a spell instead of an Opportunity Attack, and you can perform Somatic components with your hands full.'),
    feat('weapon-master', 'Weapon Master', 'general', { plus: SD }, 'You gain the Mastery property of one Simple or Martial weapon of your choice, and can change it after a long rest.'),
    // Epic Boons (Level 19+)
    feat('boon-of-energy-resistance', 'Boon of Energy Resistance', 'epic-boon', { plus: 'any' }, 'Resistance to two damage types of your choice (such as Fire and Necrotic), and when you take damage of one of them you can use your Reaction to send some of that energy at a creature nearby.'),
    feat('boon-of-fortitude', 'Boon of Fortitude', 'epic-boon', { plus: 'any', effects: { hpFlat: 40 } }, 'Your Hit Point maximum increases by 40 (calculated on the sheet), and once per turn when you regain hit points you regain extra equal to your Constitution modifier.'),
    feat('boon-of-recovery', 'Boon of Recovery', 'epic-boon', { plus: 'any' }, 'Once per long rest, when you would drop to 0 hit points you drop to 1 and regain hit points instead; you also have a pool of d10s to heal yourself with as a Bonus Action.'),
    feat('boon-of-skill', 'Boon of Skill', 'epic-boon', { plus: 'any' }, 'You gain proficiency in all skills, and Expertise in one skill of your choice.'),
    feat('boon-of-speed', 'Boon of Speed', 'epic-boon', { plus: 'any' }, 'Your Speed increases by 30 feet, and you can Disengage as a Bonus Action.')
  ];
  for (const f of FEATS) if (!D.feats.some(x => x.id === f.id)) D.feats.push(f);
})(globalThis);
