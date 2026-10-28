// Homebrew that ships with the app for this table (The Night Shift): added once to every browser that opens Quillbound,
// already approved, so players can build their heroes straight away. The DM can still edit, unapprove or delete it.
// Vampire is a species (all three heroes are vampires); Artificer is a class (Toxic's).
(function (root) {
  root.QB_TABLE_HOMEBREW = {
    id: 'night-shift-1',
    species: [{
      id: 'hb-sp-night-shift-vampire', kind: 'species', name: 'Vampire', desc: 'Undead nightwalkers of The Night Shift: unseen by cameras, at home on walls and ceilings, hurt by the sun.',
      size: 'Medium', speed: 30, type: 'Undead', approved: true, updated: 0,
      traits: [
        { block: 'darkvision', range: '120' },
        { block: 'climb' },
        { block: 'minor', name: 'Camera Gap', desc: 'Not visible on ordinary cameras or in mirrors.' },
        { block: 'custom', weight: '2', name: 'Mist Step', desc: 'Teleport 9 m (30 ft) through a small visible gap; 3 times per long rest.' },
        { block: 'flight', name: 'Bat Form', desc: 'Once per short rest, for 10 minutes: fly 9 m (30 ft); you can’t attack or cast spells.' },
        { block: 'custom', weight: '1', name: 'Vampiric Charm', desc: 'Once per short rest: a creature makes a Wisdom save (DC 14) or is trusting toward you for 10 minutes.' },
        { block: 'natural', name: 'Claws', dice: '1d6', type: 'Slashing', finesse: true },
        { block: 'natural', name: 'Bite', dice: '1d6', type: 'Piercing', finesse: false },
        { block: 'drawback', weight: '2', name: 'Sunlight', desc: '2d6 radiant damage each round in direct sunlight.' },
        { block: 'drawback', weight: '1', name: 'Running Water', desc: 'Crossing running water willingly takes a Wisdom save (DC 13). Garlic is unpleasant.' }
      ]
    }],
    classes: [{
      id: 'hb-cl-night-shift-artificer', kind: 'class', name: 'Artificer', desc: 'Inventors who channel magic through tools and machines.',
      hitDie: 8, primary: ['INT'], saves: ['CON', 'INT'],
      skills: { choose: 2, from: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleight-of-hand'] },
      armor: ['light', 'medium', 'shields'], weapons: ['simple'],
      caster: 'half', spellAbility: 'INT', spellList: 'wizard', cantrips: 2, extraAttack: true,
      fightingStyle: 0, mastery: 0, sneakFrom: 0, martialArtsFrom: 0, unarmored: '', expertise: [{ level: 1, count: 1 }],
      attacks: [{ level: 3, name: 'Lightning Launcher', dice: '1d6', ability: 'INT', type: 'Lightning' }],
      features: [
        { level: 1, name: 'Tinker’s Magic', desc: 'Make small useful objects from scraps.' },
        { level: 2, name: 'Infusions', desc: 'Infuse items with magic. Track infusions by hand; Quillbound doesn’t automate them.' }
      ],
      subclass: { name: 'Armorer', summary: 'Wear arcane armor that becomes your weapon.', training: ['heavy'], features: [
        { level: 3, name: 'Arcane Armor', desc: 'Your armor becomes a conduit for your magic.' },
        { level: 3, name: 'Armor Model: Infiltrator', desc: 'Lightning Launcher: a ranged attack for 1d6 lightning; once per turn it deals an extra 1d6.' }
      ] },
      kit: { items: [{ id: 'studded-leather-armor', count: 1 }, { id: 'dagger', count: 2 }, { id: 'tinkers-tools', count: 1 }, { id: 'dungeoneers-pack', count: 1 }], gp: 15 },
      approved: true, updated: 0
    }]
  };
})(globalThis);
