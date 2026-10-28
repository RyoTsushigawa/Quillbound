// Mobs under the HP rule set: each member with its own HP (5e) vs one shared pool (damage spills to the next member).
// Only fights with three or more of the same creature. Usage: node prototypes/stakes-v2/mobs.cjs [runs]
const { fight } = require('./hp-stamina.cjs');
const { LIBRARY, PARTY } = require('./library.cjs');
const RUNS = +process.argv[2] || 2000;
const pct = x => `${Math.round(x * 100)}%`.padStart(5);
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RULESET = { grazeW: 5, grazeDef: 0, defDC: 12, winded: 'overexert' };
const VARIANTS = [['plain 5e', '5e', false, {}], ['own HP each', 'vsAC', 'act', RULESET], ['pool, CR ≤ 1/4', 'vsAC', 'act', { ...RULESET, mobs: 'pool' }], ['pool, CR ≤ 1', 'vsAC', 'act', { ...RULESET, mobs: 'pool', mobCR: 1 }]];
const groupy = Object.entries(LIBRARY).flatMap(([l, fs]) => fs.map(f => [+l, f])).filter(([, f]) => { const c = {}; f.foes.forEach(x => c[x.name] = (c[x.name] || 0) + 1); return Object.values(c).some(n => n >= 3); });
console.log(`${RUNS} runs per cell. Cells: rounds / someone drops.`);
console.log('fight'.padEnd(52) + VARIANTS.map(v => v[0].padStart(18)).join(''));
for (const [l, enc] of groupy) {
  const cells = VARIANTS.map(([, model, sta, opts]) => {
    const rng = rngFrom(55); let rounds = 0, any = 0;
    for (let i = 0; i < RUNS; i++) { const party = PARTY(l).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, hd: h.level, sta: sta ? h.prof : 0 })); const r = fight(l, enc, model, rng, sta, 'd4', { ...opts, party }); rounds += r.rounds; any += r.down > 0; }
    return `${(rounds / RUNS).toFixed(1)} ${pct(any / RUNS)}`.padStart(18);
  });
  console.log(`L${String(l).padEnd(3)}${(enc.book.replace(/^The /, '').slice(0, 20) + ': ' + enc.what).slice(0, 47).padEnd(48)}` + cells.join(''));
}
