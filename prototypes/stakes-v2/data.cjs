// Test cast. Heroes use the app's recommended level-1 scores; level 5 adds proficiency +3, a +2 to the main
// ability (level-4 improvement), Extra Attack / cantrip scaling and typical level-5 armor.
// Enemies are real stat blocks from the user's library.
// `attacks` lists separate 5e attack rolls (used by the plain-5e comparison); Stakes adds them into one damage roll.
const hero = (name, level, abil, ac, hp, attackAbility, attacks, saves) => ({ name, cls: name, level, prof: level >= 5 ? 3 : 2, abil, ac, hp, attackAbility, attacks, weapon: attacks.join('+'), saves, hitDice: level });
const HEROES = {
  1: [
    hero('Fighter', 1, { STR: 17, CON: 15, DEX: 13, WIS: 12, CHA: 10, INT: 8 }, 16, 12, 'STR', ['2d6+3'], ['STR', 'CON']),          // chain mail, greatsword
    hero('Paladin', 1, { STR: 17, CHA: 15, CON: 13, WIS: 12, DEX: 10, INT: 8 }, 18, 11, 'STR', ['1d8+3'], ['WIS', 'CHA']),          // chain mail + shield, longsword
    hero('Rogue', 1, { DEX: 17, CON: 15, CHA: 13, WIS: 12, INT: 10, STR: 8 }, 14, 10, 'DEX', ['1d8+3+1d6'], ['DEX', 'INT']),        // leather, rapier + Sneak Attack
    hero('Cleric', 1, { WIS: 17, CON: 15, STR: 13, CHA: 12, DEX: 10, INT: 8 }, 16, 10, 'WIS', ['1d8'], ['WIS', 'CHA']),             // scale + shield, Sacred Flame
    hero('Wizard', 1, { INT: 17, CON: 15, DEX: 13, WIS: 12, CHA: 10, STR: 8 }, 11, 8, 'INT', ['1d10'], ['INT', 'WIS'])               // no armor, Fire Bolt
  ],
  5: [
    hero('Fighter', 5, { STR: 19, CON: 15, DEX: 13, WIS: 12, CHA: 10, INT: 8 }, 18, 44, 'STR', ['2d6+4', '2d6+4'], ['STR', 'CON']), // plate, Extra Attack
    hero('Paladin', 5, { STR: 19, CHA: 15, CON: 13, WIS: 12, DEX: 10, INT: 8 }, 19, 39, 'STR', ['1d8+4', '1d8+4'], ['WIS', 'CHA']), // splint + shield
    hero('Rogue', 5, { DEX: 19, CON: 15, CHA: 13, WIS: 12, INT: 10, STR: 8 }, 16, 38, 'DEX', ['1d8+4+3d6'], ['DEX', 'INT']),        // studded leather
    hero('Cleric', 5, { WIS: 19, CON: 15, STR: 13, CHA: 12, DEX: 10, INT: 8 }, 18, 38, 'WIS', ['2d8'], ['WIS', 'CHA']),             // half plate + shield
    hero('Wizard', 5, { INT: 19, CON: 15, DEX: 13, WIS: 12, CHA: 10, STR: 8 }, 14, 32, 'INT', ['2d10'], ['INT', 'WIS'])             // Mage Armor
  ]
};
const enemy = (name, tier, cr, hp, ac, atk, attacks, src) => ({ name, tier, cr, hp, ac, atk, attacks, damage: attacks.join('+'), src });
const ENEMIES = {
  lookout: enemy('Smuggler Lookout', 'Minion', 0.25, 11, 12, 3, ['1d6+1'], 'sample adventure'),
  cultist: enemy('Lantern Cultist', 'Standard', 0.5, 9, 12, 3, ['1d4+2'], 'sample adventure'),
  guz: enemy('Guz', 'Elite', 2, 67, 14, 5, ['2d6+3'], 'The Wild Sheep Chase p.2'),
  ackshie: enemy('Ackshie', 'Elite', 2, 52, 16, 5, ['2d6+2', '1d6+2', '1d6+2'], "Happy Jack's Funhouse p.41 (multiattack)"),
  jack: enemy('Happy Jack', 'Boss', 7, 91, 15, 7, ['2d8+3', '2d8+3'], "Happy Jack's Funhouse p.48 (two claws)")
};
// Encounters for the fight simulator, for a party of five. Labels give the 5e difficulty (2014 DMG XP budget).
const ENCOUNTERS = {
  1: [
    { name: 'Easy: 3 lookouts', foes: ['lookout', 'lookout', 'lookout'] },
    { name: 'Medium: 2 cultists + 3 lookouts', foes: ['cultist', 'cultist', 'lookout', 'lookout', 'lookout'] },
    { name: 'Deadly: Ackshie', foes: ['ackshie'] }
  ],
  5: [
    { name: 'Easy: Guz', foes: ['guz'] },
    { name: 'Hard: Guz + Ackshie', foes: ['guz', 'ackshie'] },
    { name: 'Deadly: Happy Jack + 4 cultists', foes: ['jack', 'cultist', 'cultist', 'cultist', 'cultist'] }
  ]
};
module.exports = { HEROES, ENEMIES, ENCOUNTERS };
