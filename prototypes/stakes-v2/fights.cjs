// Monte Carlo fights: the same party against the same encounters under plain 5e, current Stakes (v1)
// and the prototype (v2, with and without Hit Dice as stamina).
// Simple, identical tactics for every model: heroes focus the most-hurt enemy, enemies hit a random standing hero,
// everyone fights to the end (no breaking points, healing, spells with saves or positioning).
// Usage: node prototypes/stakes-v2/fights.cjs [runs]
const M = require('./model.cjs');
const { HEROES, ENEMIES, ENCOUNTERS } = require('./data.cjs');
const RUNS = +process.argv[2] || 20000;

// small seeded generator so results are repeatable; every die face stays equally likely
function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const d20 = rng => 1 + Math.floor(rng() * 20);

// opts (v2 only, for tuning): boxes = override box table, graze = a mixed hit deals at most 1 wound,
// threat = override THREAT_STEP, hdCap = most Hit Dice one hero may spend in one fight (number, or 'prof')
function fight(level, enc, model, rng, noStamina = false, opts = {}) {
  const stamina = model === 'v2' && !noStamina;
  const cap = h => opts.hdCap === 'prof' ? h.prof : opts.hdCap ?? Infinity;
  const heroes = HEROES[level].map(h => ({ ...h, hpNow: h.hp, wounds: 0, hd: Math.min(h.hitDice, cap(h)), lastStand: false, down: false, hdSpent: 0 }));
  const threat = opts.threat || M.THREAT_STEP;
  const foes = enc.foes.map(k => ({ ...ENEMIES[k], hpNow: ENEMIES[k].hp, wounds: 0, down: false }));
  const boxes = f => (model === 'v1' ? M.BOXES.v1 : opts.boxes || M.BOXES.v2)[f.tier];
  let round = 0;
  const alive = list => list.filter(x => !x.down);
  // a hero takes `w` wounds; in v2 with stamina they may spend Hit Dice
  const takeWounds = (h, w) => {
    if (w <= 0) return;
    if (stamina && h.hd > 0 && (w >= 2 || h.wounds + w >= M.HERO_BOXES)) { w -= 1; h.hd--; h.hdSpent++; }
    h.wounds = Math.min(M.HERO_BOXES, h.wounds + w);
    if (h.wounds >= M.HERO_BOXES) {
      if (stamina && h.hd > 0 && !h.lastStand) { h.lastStand = true; h.hd--; h.hdSpent++; h.wounds = M.HERO_BOXES - 1; return; }
      h.down = true;
    }
  };
  const counter = (h, f, steps) => { if (steps === null) return; takeWounds(h, M.step(M.woundsFor(M.rollExpr(f.damage, rng), M.heroThresholds(h)), steps)); };

  while (alive(heroes).length && alive(foes).length && round < 30) {
    round++;
    for (const h of alive(heroes)) {
      const targets = alive(foes); if (!targets.length) break;
      const f = targets.sort((a, b) => (model === '5e' ? a.hpNow - b.hpNow : (boxes(a) - a.wounds) - (boxes(b) - b.wounds)))[0];
      if (model === '5e') {
        for (const atk of h.attacks) {
          const d = d20(rng); const bonus = M.mod(h.abil[h.attackAbility]) + h.prof;
          if (d === 20 || (d !== 1 && d + bonus >= f.ac)) { f.hpNow -= M.rollExpr(atk, rng, d === 20); if (f.hpNow <= 0) { f.down = true; break; } }
        }
        continue;
      }
      const d = d20(rng), g = M.grade(d, d + M.attackBonus(h, model));
      const lands = g === 'crit' || g === 'success' || g === 'mixed';
      if (lands) {
        let w = model === 'v1' ? (g === 'crit' ? 2 : 1) : M.woundsFor(M.rollExpr(h.weapon, rng, g === 'crit'), M.enemyThresholds(f));
        if (opts.graze && g === 'mixed') w = Math.min(w, 1);
        f.wounds += w; if (f.wounds >= boxes(f)) f.down = true;
      }
      if (g === 'mixed' || g === 'setback' || g === 'disaster') {
        // v1: the DM picks one of three consequences; one of them is a wound (two on a natural 1)
        if (model === 'v1') { if (rng() < 1 / 3) takeWounds(h, g === 'disaster' ? 2 : 1); }
        else counter(h, f, M.COUNTER[g][f.tier]);
      }
    }
    for (const f of alive(foes)) {
      const targets = alive(heroes); if (!targets.length) break;
      const h = targets[Math.floor(rng() * targets.length)];
      if (model === '5e') {
        for (const atk of f.attacks) {
          const d = d20(rng);
          if (d === 20 || (d !== 1 && d + f.atk >= h.ac)) { h.hpNow -= M.rollExpr(atk, rng, d === 20); if (h.hpNow <= 0) { h.down = true; break; } }
        }
        continue;
      }
      const d = d20(rng), g = M.grade(d, d + M.defenseBonus(h, model));
      if (g === 'crit' || g === 'success') continue;
      if (model === 'v1') { takeWounds(h, g === 'disaster' ? 2 : 1); continue; }
      const shift = threat[f.tier] + (g === 'mixed' ? -1 : g === 'disaster' ? 1 : 0);
      takeWounds(h, M.step(M.woundsFor(M.rollExpr(f.damage, rng, g === 'disaster'), M.heroThresholds(h)), shift));
    }
  }
  return { rounds: round, won: alive(foes).length === 0, down: heroes.filter(h => h.down).length, anyDown: heroes.some(h => h.down), hdSpent: heroes.reduce((s, h) => s + h.hdSpent, 0), hdTotal: heroes.reduce((s, h) => s + h.hitDice, 0) };
}

function run(level, enc, model, label = model, opts = {}) {
  const rng = rngFrom(12345); let rounds = 0, won = 0, down = 0, anyDown = 0, hd = 0, hdTotal = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = fight(level, enc, model === 'v2-noHD' ? 'v2' : model, rng, model === 'v2-noHD', opts);
    rounds += r.rounds; won += r.won; down += r.down; anyDown += r.anyDown; hd += r.hdSpent; hdTotal += r.hdTotal;
  }
  return { label, rounds: rounds / RUNS, lost: 1 - won / RUNS, down: down / RUNS, anyDown: anyDown / RUNS, hd: hd / RUNS, hdTotal: hdTotal / RUNS };
}
module.exports = { fight, run };

if (require.main === module) {
  const pct = x => (x * 100).toFixed(0).padStart(4) + '%';
  console.log(`${RUNS} fights per row. Party of five; columns: rounds, party loses, heroes down per fight, fights where someone goes down, Hit Dice spent.`);
  for (const level of [1, 5]) for (const enc of ENCOUNTERS[level]) {
    console.log(`\nLevel ${level} · ${enc.name}`);
    for (const m of ['5e', 'v1', 'v2-noHD', 'v2']) {
      const r = run(level, enc, m, { '5e': 'plain 5e', v1: 'Stakes now', 'v2-noHD': 'v2, no HD', v2: 'v2 + HD' }[m]);
      console.log(`  ${r.label.padEnd(11)} rounds ${r.rounds.toFixed(1).padStart(4)}  loses ${pct(r.lost)}  down ${r.down.toFixed(2)}  someone down ${pct(r.anyDown)}${m === 'v2' ? `  Hit Dice ${r.hd.toFixed(1)} of ${r.hdTotal}` : ''}`);
    }
  }
}
