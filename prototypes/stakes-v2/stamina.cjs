// Stamina size and refill, with the chosen rules: HP vs AC bands, +1d4 push on your own actions only.
// Usage: node prototypes/stakes-v2/stamina.cjs [runs]
//
// Part 1: single fights (all 29 library fights), stamina full at the start: which pool size?
// Part 2: adventure days. Each book's fights at one level run in book order; HP carries over; a downed hero
//         gets back up at 1 HP after the fight; one short rest halfway (heroes spend Hit Dice to heal, as in 5e,
//         up to 75% HP). Stamina refills per fight, per short rest, or only per long rest (once per day).
const M = require('./model.cjs');
const { fight, run } = require('./hp-stamina.cjs');
const { LIBRARY, PARTY } = require('./library.cjs');
const RUNS = +process.argv[2] || 2000;
const pct = x => `${Math.round(x * 100)}%`.padStart(4);
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- part 1: pool size in one fight ---------- */
const SIZES = [['none', null], ['1', () => 1], ['2', () => 2], ['3', () => 3], ['prof (2–6)', h => h.prof], ['half level', h => Math.ceil(h.level / 2)], ['level (= Hit Dice)', h => h.level]];
const all = Object.entries(LIBRARY).flatMap(([l, fs]) => fs.map(f => [+l, f]));
const base5e = all.map(([l, f]) => run(l, f, '5e').any);
console.log(`Part 1: one fight, ${RUNS} runs × ${all.length} library fights. Stamina full at the start.`);
console.log('pool size'.padEnd(20) + 'someone drops   gap to 5e   pushes used/hero   heroes Winded at end   L1 / L4 / L8 / L15 drops');
console.log('plain 5e'.padEnd(20) + pct(base5e.reduce((a, b) => a + b) / all.length).padStart(13));
for (const [label, pool] of SIZES) {
  const rs = all.map(([l, f]) => run(l, f, 'vsAC', pool ? 'act' : false, 'd4', pool ? { pool } : {}));
  const avg = k => rs.reduce((s, r) => s + r[k], 0) / rs.length;
  const byLevel = lv => { const i = all.map((x, j) => x[0] === lv ? j : -1).filter(j => j >= 0); return pct(i.reduce((s, j) => s + rs[j].any, 0) / i.length); };
  const gap = rs.reduce((s, r, i) => s + Math.abs(r.any - base5e[i]), 0) / rs.length;
  console.log(label.padEnd(20) + pct(avg('any')).padStart(13) + pct(gap).padStart(12) + (avg('sta') / 5).toFixed(1).padStart(19) + pct(avg('winded') / 5).padStart(23) + '   ' + [1, 4, 8, 15].map(byLevel).join(' /'));
}

/* ---------- part 2: adventure days ---------- */
const DAYS = [];
for (const [l, fs] of Object.entries(LIBRARY)) {
  const byBook = {}; for (const f of fs) (byBook[f.book] ||= []).push(f);
  for (const [book, list] of Object.entries(byBook)) if (list.length >= 2) DAYS.push({ level: +l, book, fights: list });
}
const shortRest = h => { // 5e: spend Hit Dice to heal (die average + CON), here up to 75% of max HP
  const die = { Fighter: 10, Paladin: 10, Rogue: 8, Cleric: 8, Wizard: 6 }[h.cls], con = M.mod(h.abil.CON);
  while (h.hd > 0 && h.hpNow < 0.75 * h.hp) { h.hd--; h.hpNow = Math.min(h.hp, h.hpNow + die / 2 + 0.5 + con); }
};
const REFILL = [
  ['5e (no stamina)', '5e', null],
  ['HP vs AC, no stamina', 'vsAC', null],
  ['prof per fight', 'vsAC', { pool: h => h.prof, refill: 'fight' }],
  ['prof per short rest', 'vsAC', { pool: h => h.prof, refill: 'short' }],
  ['prof per long rest', 'vsAC', { pool: h => h.prof, refill: 'long' }],
  ['2×prof per long rest', 'vsAC', { pool: h => 2 * h.prof, refill: 'long' }],
  ['level per long rest', 'vsAC', { pool: h => h.level, refill: 'long' }]
];
function day(d, model, cfg, rng) {
  const party = PARTY(d.level).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, hd: h.level, sta: cfg ? cfg.pool(h) : 0 }));
  const restAfter = Math.ceil(d.fights.length / 2) - 1; let dropped = false, wiped = false, startWinded = 0, starts = 0, pushes = 0;
  d.fights.forEach((f, i) => {
    if (cfg?.refill === 'fight') party.forEach(h => { h.sta = cfg.pool(h); });
    party.forEach(h => { starts++; if (cfg && h.sta === 0) startWinded++; });
    const r = fight(d.level, f, model, rng, cfg ? 'act' : false, 'd4', { party });
    if (r.down > 0) dropped = true; if (r.lost) wiped = true; pushes += r.sta;
    party.forEach(h => { if (h.hpNow <= 0) h.hpNow = 1; });
    if (i === restAfter && i < d.fights.length - 1) { party.forEach(shortRest); if (cfg?.refill === 'short') party.forEach(h => { h.sta = cfg.pool(h); }); }
  });
  return { dropped, wiped, winded: startWinded / starts, pushes: pushes / 5 };
}
console.log(`\nPart 2: adventure days, ${RUNS} runs each. Cells: someone drops during the day / party wiped / heroes starting a fight Winded / pushes per hero per day.`);
console.log('refill'.padEnd(24) + DAYS.map(d => `L${d.level} ${d.book.replace(/^The /, '').slice(0, 13)} (${d.fights.length})`.padStart(24)).join('') + '      average');
for (const [label, model, cfg] of REFILL) {
  const cells = DAYS.map(d => {
    const rng = rngFrom(777); const t = { dropped: 0, wiped: 0, winded: 0, pushes: 0 };
    for (let i = 0; i < RUNS; i++) { const r = day(d, model, cfg, rng); for (const k in t) t[k] += +r[k]; }
    for (const k in t) t[k] /= RUNS; return t;
  });
  const avg = k => cells.reduce((s, c) => s + c[k], 0) / cells.length;
  const cell = c => `${pct(c.dropped)}${pct(c.wiped)}${cfg ? pct(c.winded) : '   -'}${cfg ? c.pushes.toFixed(1).padStart(5) : '    -'}`;
  console.log(label.padEnd(24) + cells.map(c => cell(c).padStart(24)).join('') + cell({ dropped: avg('dropped'), wiped: avg('wiped'), winded: avg('winded'), pushes: avg('pushes') }).padStart(24));
}
