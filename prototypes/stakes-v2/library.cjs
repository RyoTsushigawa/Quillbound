// Real fights from the user's adventure library (found with extract.mjs, then read and picked by hand).
// Each book states its party: "four or five players of Nth-level characters". The simulator uses five.
// Monsters with a stat block in the book use the book's numbers; standard monsters use SRD 5.1 numbers.
// `attacks` = one turn of attacks (multiattack spelled out); `atk` = attack bonus. Save-based damage
// (breath, poison riders, spirit guardians) is folded in as an attack roll, which is an approximation.
const m = (name, cr, hp, ac, atk, attacks, src) => ({ name, cr, hp, ac, atk, attacks, src });
const SRD = {
  goblin: m('Goblin', 0.25, 7, 15, 4, ['1d6+2'], 'SRD'),
  drow: m('Drow', 0.25, 13, 15, 4, ['1d6+2'], 'SRD'),
  skeleton: m('Skeleton', 0.25, 13, 13, 4, ['1d6+2'], 'SRD'),
  violetFungus: m('Violet Fungus', 0.25, 18, 5, 2, ['1d8', '1d8'], 'SRD'),
  worg: m('Worg', 0.5, 26, 13, 5, ['2d6+3'], 'SRD'),
  scout: m('Scout', 0.5, 16, 13, 4, ['1d8+2', '1d8+2'], 'SRD'),
  lizardfolk: m('Lizardfolk', 0.5, 22, 15, 4, ['1d6+2', '1d6+2'], 'SRD'),
  ape: m('Snow Ape (ape)', 0.5, 19, 12, 5, ['1d6+3'], 'SRD, throwing rocks'),
  shadow: m('Shadow', 0.5, 16, 12, 4, ['2d6+2'], 'SRD'),
  mouther: m('Gibbering Mouther', 2, 67, 9, 2, ['5d6'], 'SRD'),
  chimera: m('Chimera', 6, 114, 14, 7, ['2d6+4', '1d12+4', '2d6+4'], 'SRD'),
  giantCroc: m('Giant Crocodile', 5, 85, 14, 8, ['3d10+5', '2d8+5'], 'SRD'),
  efreet: m('Efreet', 11, 200, 17, 10, ['2d6+6+2d6', '2d6+6+2d6'], 'SRD')
};
const BOOK = {
  shadowRat: m('Shadow Rat', 0.25, 13, 12, 4, ['1d4+2'], 'Ghostlight p.19'),
  mortisNode: m('Mortis Node', 2, 76, 12, 5, ['2d8+3', '1d8+3'], 'Valley of the Gilded Tower p.13'),
  baird: m('Father Baird', 2, 38, 13, 5, ['3d8'], 'Crypts of Azarumme p.13 (spirit guardians as his damage)'),
  commando: m('Gulaira, Drow Commando', 6, 91, 15, 7, ['1d4+4+5d6', '1d6+4'], 'Shadows of Lastwatch Keep p.12'),
  tunneler: m('Ankheg Tunneler', 1, 39, 14, 5, ['2d6+1d6'], 'Watchers in the Dark (book lists +2; likely a typo for +5)'),
  drone: m('Ankheg Warren Drone', 0.25, 27, 13, 4, ['1d4+2+1d4'], 'Watchers in the Dark'),
  snowMutant: m('Snow Mutant', 7, 152, 15, 8, ['2d10+5', '2d10+5', '2d10+5'], 'The Snow Stalkers p.15'),
  ptero: m('Pterodactyl', 3, 90, 13, 6, ['2d8+3'], 'Fangs of Oatali'),
  gladiator: m('Lizardfolk Gladiator', 5, 112, 16, 7, ['2d6+4', '2d6+4', '2d4+4'], 'Fangs of Oatali p.16'),
  sorceress: m('Viperian Sorceress', 8, 97, 12, 6, ['2d8+3', '2d8+3'], 'Fangs of Oatali p.17'),
  champion: m('Arena Champion', 8, 150, 16, 8, ['3d8+5', '3d8+5', '3d8+5'], 'Beneath the Black Rose p.14'),
  werewolf: m('Progenitor Werewolf', 7, 97, 12, 7, ['2d6+4', '2d8+4', '2d8+4'], 'The Curse of Wardenwood p.17'),
  wolfchild: m('Wolfchild', 0.5, 27, 11, 4, ['1d6+2', '1d8+2'], 'The Curse of Wardenwood p.16'),
  hag: m('Weald Hag', 10, 142, 14, 9, ['2d8+5', '2d8+5'], 'The Curse of Wardenwood (two claws assumed)'),
  monk: m('Ras-Godai Monk', 4, 45, 13, 5, ['2d6+3', '2d6+3'], 'Monastery of the Shadow Sorcerers p.17'),
  acolyte: m('Ras-Godai Acolyte', 0.5, 22, 13, 4, ['2d6+2', '2d6+2'], 'Monastery of the Shadow Sorcerers p.17'),
  demonBlade: m('Ras-Godai Demon Blade', 8, 90, 15, 7, ['2d8+4', '2d8+4'], 'Monastery of the Shadow Sorcerers p.18'),
  voidSpawn: m('Void Spawn', 4, 85, 14, 5, ['2d8+3', '2d8+3'], 'The Horror Within p.15'),
  shgolgg: m("Sh'golgg", 11, 147, 16, 8, ['2d8+4', '5d6'], 'The Horror Within p.16'),
  lunarSpider: m('Lunar Spider', 8, 110, 16, 7, ['2d10+4+5d8', '2d10+4+5d8'], 'Gate of the Lens Wizards p.22'),
  moonWorm: m('Moon Worm', 18, 231, 18, 15, ['4d12+9', '4d10+9', '4d10+9'], 'Gate of the Lens Wizards p.23'),
  elderFire: m('Elder Fire Elemental', 9, 183, 16, 7, ['3d6+3+2d10', '3d6+3+2d10'], 'Fires of Iskh p.21'),
  baltazar: m('Pasha Baltazar', 15, 262, 18, 13, ['2d6+8', '2d6+8', '2d6+8'], 'Fires of Iskh p.23')
};
const M = { ...SRD, ...BOOK };
const fight = (book, page, what, foes) => ({ book, page, what, foes: foes.flatMap(([n, k]) => Array(n).fill(M[k])) });
const LIBRARY = {
  1: [fight('Ghostlight', 6, '3 shadow rats', [[3, 'shadowRat']]), fight('Ghostlight', 8, '4 shadow rats', [[4, 'shadowRat']]), fight('Ghostlight', 10, '2 worgs', [[2, 'worg']])],
  2: [fight('Valley of the Gilded Tower', 6, '4 violet fungi (2 per round, capped)', [[4, 'violetFungus']]), fight('Valley of the Gilded Tower', 13, 'Mortis Node', [[1, 'mortisNode']])],
  3: [fight('Crypts of Azarumme', 9, 'Father Baird + 3 skeletons', [[1, 'baird'], [3, 'skeleton']]), fight('Treaty of the Tiger King', 5, '4 scouts', [[4, 'scout']])],
  4: [fight('Shadows of Lastwatch Keep', 6, '6 drow + 6 goblins', [[6, 'drow'], [6, 'goblin']]), fight('Shadows of Lastwatch Keep', 8, 'Gulaira (drow commando)', [[1, 'commando']]),
    fight('Shadows of Lastwatch Keep', 9, 'chimera + 2 drow', [[1, 'chimera'], [2, 'drow']]), fight('Watchers in the Dark', 6, '3 ankheg tunnelers', [[3, 'tunneler']]), fight('Watchers in the Dark', 7, '6 warren drones', [[6, 'drone']])],
  5: [fight('The Snow Stalkers', 6, '8 snow apes', [[8, 'ape']]), fight('The Snow Stalkers', 15, 'Snow Mutant', [[1, 'snowMutant']])],
  6: [fight('Fangs of Oatali', 8, '3 pterodactyls', [[3, 'ptero']]), fight('Fangs of Oatali', 7, 'gladiator chief + 6 lizardfolk', [[1, 'gladiator'], [6, 'lizardfolk']]),
    fight('Fangs of Oatali', 12, 'Viperian Sorceress + 3 shadows', [[1, 'sorceress'], [3, 'shadow']]), fight('Beneath the Black Rose', 14, 'Arena Champion', [[1, 'champion']])],
  7: [fight('The Curse of Wardenwood', 10, 'Progenitor Werewolf + 12 wolfchildren', [[1, 'werewolf'], [12, 'wolfchild']]), fight('The Curse of Wardenwood', 15, 'Weald Hag', [[1, 'hag']])],
  8: [fight('Monastery of the Shadow Sorcerers', 6, '3 Ras-Godai monks', [[3, 'monk']]), fight('Monastery of the Shadow Sorcerers', 9, 'Demon Blade + 6 acolytes', [[1, 'demonBlade'], [6, 'acolyte']]),
    fight('The Horror Within', 8, '3 void spawn', [[3, 'voidSpawn']]), fight('The Horror Within', 11, "Sh'golgg + 2 gibbering mouthers", [[1, 'shgolgg'], [2, 'mouther']])],
  15: [fight('Gate of the Lens Wizards', 11, '4 lunar spiders', [[4, 'lunarSpider']]), fight('Gate of the Lens Wizards', 23, 'Moon Worm', [[1, 'moonWorm']])],
  20: [fight('Fires of Iskh', 6, '2 elder fire elementals', [[2, 'elderFire']]), fight('Fires of Iskh', 7, '3 efreet', [[3, 'efreet']]), fight('Fires of Iskh', 10, 'Pasha Baltazar + 2 efreet', [[1, 'baltazar'], [2, 'efreet']])]
};

// Heroes at any level: the five classes from data.cjs grown by the usual 5e milestones.
// Weapons and cantrips only (no spell slots, smites or Action Surge) in every model, so the comparison stays fair.
const PROF = l => 2 + Math.floor((l - 1) / 4);
const tier = l => l >= 17 ? 3 : l >= 11 ? 2 : l >= 5 ? 1 : 0; // cantrip dice steps, armor upgrades
const magic = l => l >= 20 ? 3 : l >= 15 ? 2 : l >= 8 ? 1 : 0;
function heroAt(cls, l) {
  const main = Math.min(20, 17 + (l >= 4 ? 2 : 0) + (l >= 8 ? 1 : 0)), mm = Math.floor((main - 10) / 2), mg = magic(l), t = tier(l);
  const C = {
    Fighter: { abil: { STR: main, CON: 15, DEX: 13 }, saves: ['STR', 'CON'], die: 10, con: 2, ac: [16, 18, 19, 20][t] + (l >= 15 ? 1 : 0), ab: 'STR', atk: () => Array(l >= 20 ? 4 : l >= 11 ? 3 : l >= 5 ? 2 : 1).fill(`2d6+${mm + mg}`) },
    Paladin: { abil: { STR: main, CON: 13, DEX: 10 }, saves: ['WIS', 'CHA'], die: 10, con: 1, ac: [18, 19, 20, 21][t], ab: 'STR', atk: () => Array(l >= 5 ? 2 : 1).fill(`1d8+${mm + mg}${l >= 11 ? '+1d8' : ''}`) },
    Rogue: { abil: { DEX: main, CON: 15 }, saves: ['DEX', 'INT'], die: 8, con: 2, ac: [14, 16, 17, 18][t], ab: 'DEX', atk: () => [`1d8+${mm + mg}+${Math.ceil(l / 2)}d6`] },
    Cleric: { abil: { WIS: main, CON: 15, DEX: 10 }, saves: ['WIS', 'CHA'], die: 8, con: 2, ac: [16, 18, 19, 20][t], ab: 'WIS', atk: () => [`${t + 1}d8`, ...(l >= 3 ? [`${1 + Math.floor((Math.min(9, Math.ceil(l / 2)) - 2) / 2)}d8+${mm}`] : [])] }, // Sacred Flame + spiritual weapon
    Wizard: { abil: { INT: main, CON: 15, DEX: 13 }, saves: ['INT', 'WIS'], die: 6, con: 2, ac: [11, 14, 14, 15][t], ab: 'INT', atk: () => [`${t + 1}d10`] }
  }[cls];
  const abil = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10, ...C.abil };
  const attacks = C.atk();
  return { name: cls, cls, level: l, prof: PROF(l), abil, saves: C.saves, ac: C.ac, hp: C.die + C.con + (l - 1) * (C.die / 2 + 1 + C.con), attackAbility: C.ab,
    attackMagic: ['Fighter', 'Paladin', 'Rogue'].includes(cls) ? mg : 0, attacks, weapon: attacks.join('+'), hitDice: l };
}
const PARTY = l => ['Fighter', 'Paladin', 'Rogue', 'Cleric', 'Wizard'].map(c => heroAt(c, l));
module.exports = { LIBRARY, PARTY, heroAt, MONSTERS: M };
