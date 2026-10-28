// The complete decided rule set (RULESET.md), checked once against plain 5e on the library fights and days.
// Usage: node prototypes/stakes-v2/final.cjs [runs]
const M = require('./model.cjs');
const { fight } = require('./hp-stamina.cjs');
const { LIBRARY, PARTY } = require('./library.cjs');
const RUNS = +process.argv[2] || 2000;
const pct = x => `${Math.round(x * 100)}%`.padStart(5);
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const { byThreat } = require('./breaking.cjs');
const FIGHTS_ON = /skeleton|fungus|mortis|mouther|void spawn|sh'golgg|efreet|fire elemental|moon worm|hag|baltazar|shadow$/i;
// everything decided: defense as exact 5e, heroes-only graze, +1d4 push, overexert, always strike back,
// breaking points by threat with the DM letting broken enemies go half the time
const RULESET = { grazeW: 5, grazeDef: 0, defDC: 12, winded: 'overexert', strikeBack: 1, breakable: n => !FIGHTS_ON.test(n), breakAt: byThreat, breakLeave: 0.5 };
const MODELS = [['plain 5e', '5e', false, {}], ['complete rule set', 'vsAC', 'act', RULESET], ['  … broken enemies always leave', 'vsAC', 'act', { ...RULESET, breakLeave: 1 }], ['  … no breaking points', 'vsAC', 'act', { ...RULESET, breakLeave: 0 }]];
const shortRest = h => {
  const die = { Fighter: 10, Paladin: 10, Rogue: 8, Cleric: 8, Wizard: 6 }[h.cls], con = M.mod(h.abil.CON);
  while (h.hd > 0 && h.hpNow < 0.75 * h.hp) { h.hd--; h.hpNow = Math.min(h.hp, h.hpNow + die / 2 + 0.5 + con); }
};
const fights = Object.entries(LIBRARY).flatMap(([l, fs]) => fs.map(f => [+l, f]));
const days = [];
for (const [l, fs] of Object.entries(LIBRARY)) { const b = {}; for (const f of fs) (b[f.book] ||= []).push(f); for (const list of Object.values(b)) if (list.length >= 2) days.push([+l, list]); }

console.log(`${RUNS} runs. Single fights: ${fights.length} (each with fresh heroes and full stamina). Days: ${days.length} (HP, Hit Dice and stamina carry over; one short rest).`);
console.log(''.padEnd(36) + 'rounds  someone drops  wiped  nothing happens |  day: someone drops  wiped  start Winded');
for (const [label, model, sta, opts] of MODELS) {
  const t = { rounds: 0, any: 0, lost: 0, whiff: 0 };
  for (const [l, enc] of fights) {
    const rng = rngFrom(2026);
    for (let i = 0; i < RUNS; i++) { const party = PARTY(l).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, hd: h.level, sta: sta ? h.prof : 0 })); const r = fight(l, enc, model, rng, sta, 'd4', { ...opts, party }); t.rounds += r.rounds; t.any += r.down > 0; t.lost += r.lost; t.whiff += r.whiff; }
  }
  const n = RUNS * fights.length; const dd = { drop: 0, wipe: 0, winded: 0, starts: 0 };
  for (const [l, list] of days) {
    const rng = rngFrom(4711);
    for (let i = 0; i < RUNS; i++) {
      const party = PARTY(l).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, hd: h.level, sta: sta ? h.prof : 0 })); let drop = 0, wipe = 0;
      const rest = Math.ceil(list.length / 2) - 1;
      list.forEach((enc, j) => {
        party.forEach(h => { dd.starts++; if (sta && h.sta === 0) dd.winded++; });
        const r = fight(l, enc, model, rng, sta, 'd4', { ...opts, party }); if (r.down) drop = 1; if (r.lost) wipe = 1;
        party.forEach(h => { if (h.hpNow <= 0) h.hpNow = 1; });
        if (j === rest && j < list.length - 1) party.forEach(shortRest);
      });
      dd.drop += drop; dd.wipe += wipe;
    }
  }
  const m = RUNS * days.length;
  console.log(label.padEnd(36) + (t.rounds / n).toFixed(1).padStart(6) + pct(t.any / n).padStart(15) + pct(t.lost / n).padStart(7) + pct(t.whiff / n).padStart(17) + ' |' + pct(dd.drop / m).padStart(20) + pct(dd.wipe / m).padStart(7) + (sta ? pct(dd.winded / dd.starts) : '    -').padStart(14));
}
