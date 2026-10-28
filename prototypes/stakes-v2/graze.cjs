// The graze window, with the decided rules: HP vs AC bands, +1d4 push on your own actions, stamina = proficiency bonus.
// Usage: node prototypes/stakes-v2/graze.cjs [runs]
// Each variant runs all 29 library fights. "Nothing happens" = share of hero attack rolls that deal no damage.
const { fight } = require('./hp-stamina.cjs');
const { LIBRARY } = require('./library.cjs');
const RUNS = +process.argv[2] || 1500;
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const VARIANTS = [
  ['plain 5e', '5e', {}],
  ['no graze (5e hit chances)', 'vsAC', { grazeW: 0 }],
  ['3 below, half damage', 'vsAC', { grazeW: 3 }],
  ['5 below, half damage', 'vsAC', { grazeW: 5 }],
  ['7 below, half damage', 'vsAC', { grazeW: 7 }],
  ['10 below, half damage', 'vsAC', { grazeW: 10 }],
  ['5 below, flat bonus only', 'vsAC', { grazeW: 5, grazeEff: 'flat' }],
  ['5 below, heroes only', 'vsAC', { grazeW: 5, grazeDef: 0 }],
  ['5 below, enemies only', 'vsAC', { grazeW: 0, grazeDef: 5 }]
];
const all = Object.entries(LIBRARY).flatMap(([l, fs]) => fs.map(f => [+l, f]));
const pct = x => `${Math.round(x * 100)}%`.padStart(5);
let base = null;
console.log(`${RUNS} runs × ${all.length} library fights per row.`);
console.log('graze'.padEnd(28) + 'rounds  someone drops  party wiped  gap to 5e  nothing happens');
for (const [label, model, opts] of VARIANTS) {
  const per = all.map(([l, enc]) => {
    const rng = rngFrom(99); const t = { rounds: 0, any: 0, lost: 0, whiff: 0 };
    for (let i = 0; i < RUNS; i++) { const r = fight(l, enc, model, rng, model === '5e' ? false : 'act', 'd4', opts); t.rounds += r.rounds; t.any += r.down > 0; t.lost += r.lost; t.whiff += r.whiff; }
    for (const k in t) t[k] /= RUNS; return t;
  });
  base ||= per;
  const avg = k => per.reduce((s, r) => s + r[k], 0) / per.length;
  const gap = per.reduce((s, r, i) => s + Math.abs(r.any - base[i].any), 0) / per.length;
  console.log(label.padEnd(28) + avg('rounds').toFixed(1).padStart(6) + pct(avg('any')).padStart(15) + pct(avg('lost')).padStart(13) + (model === '5e' ? '     —' : pct(gap)).padStart(11) + pct(avg('whiff')).padStart(17));
}
