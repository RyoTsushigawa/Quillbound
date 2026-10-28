// Breaking points under the HP rule set. Breakable = humanoids, beasts and monstrosities (the importer's rule);
// undead, constructs, elementals, oozes, aberrations, fey and fiends fight on. Upper bound: a broken enemy always
// leaves the fight (in play the DM may choose "fights on"). Usage: node prototypes/stakes-v2/breaking.cjs [runs]
const { fight } = require('./hp-stamina.cjs');
const { LIBRARY, PARTY } = require('./library.cjs');
const RUNS = +process.argv[2] || 2000;
const pct = x => `${Math.round(x * 100)}%`.padStart(5);
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const FIGHTS_ON = /skeleton|fungus|mortis|mouther|void spawn|sh'golgg|efreet|fire elemental|moon worm|hag|baltazar|shadow$/i;
const breakable = name => !FIGHTS_ON.test(name);
const RULESET = { grazeW: 5, grazeDef: 0, defDC: 12, winded: 'overexert', breakable };
// Monster Hunter style: the tougher the enemy compared with the party, the longer it holds out.
// CR ≤ ¼ of the party level → 30% HP, ≤ ½ → 25%, ≤ level → 20%, above the level → 15%.
const byThreat = (f, level) => { const r = f.cr / level; return r <= 0.25 ? 0.30 : r <= 0.5 ? 0.25 : r <= 1 ? 0.20 : 0.15; };
const VARIANTS = [['plain 5e', '5e', false, {}], ['no breaking', 'vsAC', 'act', RULESET], ['break at ¼ HP', 'vsAC', 'act', { ...RULESET, breakAt: 0.25 }],
  ['break at ½ HP', 'vsAC', 'act', { ...RULESET, breakAt: 0.5 }], ['15–30% by threat', 'vsAC', 'act', { ...RULESET, breakAt: byThreat }]];
module.exports = { byThreat };
if (require.main === module) {
const all = Object.entries(LIBRARY).flatMap(([l, fs]) => fs.map(f => [+l, f]));
console.log(`${RUNS} runs × ${all.length} library fights. A broken enemy leaves the fight (upper bound).`);
console.log('breaking'.padEnd(18) + 'rounds  someone drops  wiped  enemies that broke');
for (const [label, model, sta, opts] of VARIANTS) {
  let rounds = 0, any = 0, lost = 0, broke = 0, foes = 0;
  for (const [l, enc] of all) {
    const rng = rngFrom(808);
    for (let i = 0; i < RUNS; i++) {
      const party = PARTY(l).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, hd: h.level, sta: sta ? h.prof : 0 }));
      const r = fight(l, enc, model, rng, sta, 'd4', { ...opts, party }); rounds += r.rounds; any += r.down > 0; lost += r.lost; broke += r.broke; foes += enc.foes.length;
    }
  }
  const n = RUNS * all.length;
  console.log(label.padEnd(18) + (rounds / n).toFixed(1).padStart(6) + pct(any / n).padStart(15) + pct(lost / n).padStart(7) + pct(broke / foes).padStart(19));
}
}
