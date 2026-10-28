// Dramatic moments under the HP rule set (with breaking points by threat). Same chance for heroes and enemies,
// one moment per combatant per fight. Usage: node prototypes/stakes-v2/drama.cjs [runs] [strike]
// With 'strike' it compares how often a graze or miss lets the target strike back instead.
const { fight } = require('./hp-stamina.cjs');
const { LIBRARY, PARTY } = require('./library.cjs');
const { byThreat } = require('./breaking.cjs');
const RUNS = +process.argv[2] || 2000;
const pct = x => `${Math.round(x * 100)}%`.padStart(5);
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const FIGHTS_ON = /skeleton|fungus|mortis|mouther|void spawn|sh'golgg|efreet|fire elemental|moon worm|hag|baltazar|shadow$/i;
const BASE = { grazeW: 5, grazeDef: 0, defDC: 12, winded: 'overexert', breakable: n => !FIGHTS_ON.test(n), breakAt: byThreat };
const VARIANTS = process.argv[3] === 'strike' ? [['plain 5e', '5e', false, {}], ['never strikes back', 'vsAC', 'act', { ...BASE, strikeBack: 0 }], ['1 in 3 (DM menu)', 'vsAC', 'act', BASE], ['2 in 3', 'vsAC', 'act', { ...BASE, strikeBack: 2 / 3 }], ['always', 'vsAC', 'act', { ...BASE, strikeBack: 1 }]] : [['plain 5e', '5e', false, {}], ['rule set, no moments', 'vsAC', 'act', BASE],
  ['Last Stand 10%', 'vsAC', 'act', { ...BASE, lastStand: 0.10 }], ['Last Stand 25%', 'vsAC', 'act', { ...BASE, lastStand: 0.25 }],
  ['both 10% (+10% HP)', 'vsAC', 'act', { ...BASE, lastStand: 0.10, powerThrough: 0.10 }], ['both 25% (+10% HP)', 'vsAC', 'act', { ...BASE, lastStand: 0.25, powerThrough: 0.25 }],
  ['both 25% (to ½ HP)', 'vsAC', 'act', { ...BASE, lastStand: 0.25, powerThrough: 0.25, ptFull: true }]];
const all = Object.entries(LIBRARY).flatMap(([l, fs]) => fs.map(f => [+l, f]));
console.log(`${RUNS} runs × ${all.length} library fights. Broken enemies leave (upper bound).`);
console.log('moments'.padEnd(24) + 'rounds  someone drops  wiped  fights with a moment');
for (const [label, model, sta, opts] of VARIANTS) {
  let rounds = 0, any = 0, lost = 0, moment = 0;
  for (const [l, enc] of all) {
    const rng = rngFrom(1212);
    for (let i = 0; i < RUNS; i++) {
      const party = PARTY(l).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, hd: h.level, sta: sta ? h.prof : 0 }));
      const r = fight(l, enc, model, rng, sta, 'd4', { ...opts, party }); rounds += r.rounds; any += r.down > 0; lost += r.lost; moment += r.moments > 0;
    }
  }
  const n = RUNS * all.length;
  console.log(label.padEnd(24) + (rounds / n).toFixed(1).padStart(6) + pct(any / n).padStart(15) + pct(lost / n).padStart(7) + pct(moment / n).padStart(22));
}
