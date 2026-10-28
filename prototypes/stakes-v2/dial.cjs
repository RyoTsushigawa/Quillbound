// Which DM habits land closest to plain 5e's danger? Strike-back frequency × how often broken enemies leave.
// Usage: node prototypes/stakes-v2/dial.cjs [runs]
const { fight } = require('./hp-stamina.cjs');
const { LIBRARY, PARTY } = require('./library.cjs');
const { byThreat } = require('./breaking.cjs');
const RUNS = +process.argv[2] || 1500;
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const FIGHTS_ON = /skeleton|fungus|mortis|mouther|void spawn|sh'golgg|efreet|fire elemental|moon worm|hag|baltazar|shadow$/i;
const BASE = { grazeW: 5, grazeDef: 0, defDC: 12, winded: 'overexert', breakable: n => !FIGHTS_ON.test(n), breakAt: byThreat };
const all = Object.entries(LIBRARY).flatMap(([l, fs]) => fs.map(f => [+l, f]));
const measure = (model, sta, opts) => { let any = 0, rounds = 0; for (const [l, enc] of all) { const rng = rngFrom(4040); for (let i = 0; i < RUNS; i++) { const party = PARTY(l).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, hd: h.level, sta: sta ? h.prof : 0 })); const r = fight(l, enc, model, rng, sta, 'd4', { ...opts, party }); any += r.down > 0; rounds += r.rounds; } } const n = RUNS * all.length; return `${Math.round(any / n * 100)}% / ${(rounds / n).toFixed(1)}r`; };
console.log(`${RUNS} runs × ${all.length} fights. Cells: someone drops / rounds. Plain 5e: ${measure('5e', false, {})}`);
const LEAVE = [[1, 'broken always leave'], [0.5, 'leave half the time'], [0, 'never leave (no breaking)']];
console.log('strike-back'.padEnd(14) + LEAVE.map(([, l]) => l.padStart(28)).join(''));
for (const [sb, label] of [[1 / 3, '1 in 3'], [2 / 3, '2 in 3'], [1, 'always']]) console.log(label.padEnd(14) + LEAVE.map(([p]) => measure('vsAC', 'act', { ...BASE, strikeBack: sb, breakLeave: p }).padStart(28)).join(''));
