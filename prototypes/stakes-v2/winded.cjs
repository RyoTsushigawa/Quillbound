// What Winded means, tested over adventure days with the decided rules:
// HP vs AC, graze 5 below for heroes only (enemies hit or miss as in 5e), +1d4 push on your own actions,
// stamina = proficiency bonus, refilled only on a long rest.
// Days: each book's fights at one level in book order, HP carries over, downed heroes get up at 1 HP afterwards,
// one short rest halfway that heals with Hit Dice (up to 75% HP), as in stamina.cjs.
// Usage: node prototypes/stakes-v2/winded.cjs [runs]
const M = require('./model.cjs');
const { fight } = require('./hp-stamina.cjs');
const { LIBRARY, PARTY } = require('./library.cjs');
const RUNS = +process.argv[2] || 1500;
const pct = x => `${Math.round(x * 100)}%`.padStart(4);
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const RULES = { grazeW: 5, grazeDef: 0 };
const OPTIONS = [
  ['plain 5e', '5e', null],
  ['no stamina at all', 'vsAC', { stamina: false }],
  ['Winded = no pushes', 'vsAC', { winded: 'none' }],
  ['+ catch breath on short rest', 'vsAC', { winded: 'none', breath: true }],
  ['+ overexert with a Hit Die', 'vsAC', { winded: 'overexert' }],
  ['+ grazes stop working', 'vsAC', { winded: 'noGraze' }],
  ['+ exposed (strike-back 2 in 3)', 'vsAC', { winded: 'exposed' }]
];
const DAYS = [];
for (const [l, fs] of Object.entries(LIBRARY)) {
  const byBook = {}; for (const f of fs) (byBook[f.book] ||= []).push(f);
  for (const [book, list] of Object.entries(byBook)) if (list.length >= 2) DAYS.push({ level: +l, book, fights: list });
}
const shortRest = h => {
  const die = { Fighter: 10, Paladin: 10, Rogue: 8, Cleric: 8, Wizard: 6 }[h.cls], con = M.mod(h.abil.CON);
  while (h.hd > 0 && h.hpNow < 0.75 * h.hp) { h.hd--; h.hpNow = Math.min(h.hp, h.hpNow + die / 2 + 0.5 + con); }
};
function day(d, model, o, rng) {
  const useSta = model !== '5e' && o.stamina !== false;
  const party = PARTY(d.level).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, hd: h.level, sta: useSta ? h.prof : 0 }));
  const restAfter = Math.ceil(d.fights.length / 2) - 1; const t = { dropped: 0, wiped: 0, windedStart: 0, starts: 0, burned: 0, lateDrop: 0 };
  d.fights.forEach((f, i) => {
    party.forEach(h => { t.starts++; if (useSta && h.sta === 0) t.windedStart++; });
    const r = fight(d.level, f, model, rng, useSta ? 'act' : false, 'd4', { ...RULES, winded: o.winded, party });
    if (r.down > 0) { t.dropped = 1; if (i === d.fights.length - 1) t.lateDrop = 1; }
    if (r.lost) t.wiped = 1;
    party.forEach(h => { if (h.hpNow <= 0) h.hpNow = 1; });
    if (i === restAfter && i < d.fights.length - 1) { party.forEach(shortRest); if (o.breath) party.forEach(h => { h.sta = Math.min(h.prof, h.sta + 1); }); }
  });
  t.burned = party.reduce((s, h) => s + (h.hdBurned || 0), 0) / 5;
  return t;
}
console.log(`${RUNS} runs per day, ${DAYS.length} adventure days (${DAYS.map(d => `L${d.level} ${d.book.replace(/^The /, '')}`).join(', ')}).`);
console.log('Winded means'.padEnd(32) + 'someone drops  last fight drops  party wiped  start a fight Winded  Hit Dice burned/hero');
for (const [label, model, o] of OPTIONS) {
  const acc = { dropped: 0, wiped: 0, windedStart: 0, starts: 0, burned: 0, lateDrop: 0 };
  for (const d of DAYS) { const rng = rngFrom(31337); for (let i = 0; i < RUNS; i++) { const r = day(d, model, o || {}, rng); for (const k in acc) acc[k] += r[k]; } }
  const n = RUNS * DAYS.length;
  console.log(label.padEnd(32) + pct(acc.dropped / n).padStart(13) + pct(acc.lateDrop / n).padStart(17) + pct(acc.wiped / n).padStart(13) + (o && o.stamina !== false ? pct(acc.windedStart / acc.starts) : '   -').padStart(22) + (o?.winded === 'overexert' ? (acc.burned / n).toFixed(2) : '-').padStart(22));
}
