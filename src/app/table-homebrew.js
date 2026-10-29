// Homebrew that ships with the app for this table (The Night Shift): added once to every browser that opens Quillbound,
// already approved, so players can build their heroes straight away. The DM can still edit, unapprove or delete it.
// Vampire is a species (all three heroes are vampires); Artificer is a class (Toxic's).
(function (root) {
  root.QB_TABLE_HOMEBREW = {
    id: 'night-shift-2', // raise this, and an item's version, to update copies browsers already have
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
      // Based on the 2025 Artificer (Eberron: Forge of the Artificer) with the Armorer subclass. Descriptions are short summaries; the book has the full rules.
      id: 'hb-cl-night-shift-artificer', kind: 'class', version: 2, name: 'Artificer', desc: 'Inventors who channel magic through tools and machines.',
      hitDie: 8, primary: ['INT'], saves: ['CON', 'INT'],
      skills: { choose: 2, from: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleight-of-hand'] },
      armor: ['light', 'medium', 'shields'], weapons: ['simple'], tools: ["Thieves' Tools", "Tinker's Tools", 'One type of Artisan’s Tools'],
      caster: 'half', spellAbility: 'INT', spellList: 'wizard', cantrips: 2, cantripsAt: '10,14', extraAttack: true,
      fightingStyle: 0, mastery: 0, sneakFrom: 0, martialArtsFrom: 0, unarmored: '', expertise: [],
      attacks: [{ level: 3, name: 'Lightning Launcher', dice: '1d6', ability: 'INT', type: 'Lightning', ranged: true }],
      features: [
        { level: 1, name: 'Spellcasting', desc: 'Half-caster slots and prepared spells, using Intelligence. Quillbound offers the Wizard list here, because the Artificer list isn’t in the free rules: agree your spells with the DM.' },
        { level: 1, name: 'Tinker’s Magic', desc: 'With Tinker’s Tools, make a small, simple item from scraps.' },
        { level: 2, name: 'Replicate Magic Item', desc: 'Learn plans for magic items and make them. Plans known / items at once: 4/2 at level 2, 5/3 at 6, 6/4 at 10, 7/5 at 14, 8/6 at 18.' },
        { level: 6, name: 'Magic Item Tinker', desc: 'Draw extra uses out of the magic items you replicate.' },
        { level: 7, name: 'Flash of Genius', desc: 'As a Reaction, add your Intelligence modifier to a check or save you or a creature nearby makes; uses per long rest.' },
        { level: 10, name: 'Magic Item Adept', desc: 'Attune to more magic items.' },
        { level: 11, name: 'Spell-Storing Item', desc: 'Store a spell in an item so it can be used again.' },
        { level: 14, name: 'Advanced Artifice', desc: 'Your item crafting and attunement improve further.' },
        { level: 18, name: 'Magic Item Master', desc: 'Attune to even more magic items.' },
        { level: 20, name: 'Soul of Artifice', desc: 'Your bond with your magic items protects you.' }
      ],
      subclass: { name: 'Armorer', summary: 'Wear arcane armor that becomes your weapon.', training: ['heavy'], tools: ["Smith's Tools"], features: [
        { level: 3, name: 'Tools of the Trade', desc: 'Heavy armor training and Smith’s Tools (or another Artisan’s Tools if you have them); you craft armor in half the time.' },
        { level: 3, name: 'Armorer Spells', desc: 'Always prepared: Magic Missile, Thunderwave (3); Mirror Image, Shatter (5); Hypnotic Pattern, Lightning Bolt (9); Fire Shield, Greater Invisibility (13); Passwall, Wall of Force (17).' },
        { level: 3, name: 'Arcane Armor', desc: 'With Smith’s Tools in hand, turn the armor you wear into Arcane Armor.' },
        { level: 3, name: 'Armor Model: Infiltrator', desc: 'Lightning Launcher: a ranged weapon (90/300 ft) for 1d6 Lightning, using Intelligence; once on each of your turns a hit deals 1d6 extra. Speed +5 ft; Advantage on Stealth checks. (Dreadnaught and Guardian are the other models; switch after a rest.)' },
        { level: 9, name: 'Improved Armorer', desc: 'Your Arcane Armor and its weapon get stronger.' },
        { level: 15, name: 'Perfected Armor', desc: 'Your armor model reaches its full power.' }
      ] },
      kit: { items: [{ id: 'studded-leather-armor', count: 1 }, { id: 'dagger', count: 1 }, { id: 'thieves-tools', count: 1 }, { id: 'tinkers-tools', count: 1 }, { id: 'dungeoneer-pack', count: 1 }], gp: 16 },
      approved: true, updated: 0
    }]
  };
})(globalThis);
