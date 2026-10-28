// Exact odds (no simulation) for one roll under the current rules (v1) and the prototype (v2).
// Usage: node prototypes/stakes-v2/odds.cjs
const M = require('./model.cjs');
const { HEROES, ENEMIES } = require('./data.cjs');
const pct = x => (x * 100).toFixed(0).padStart(3) + '%';
const num = (x, d = 2) => x.toFixed(d).padStart(5);
const faces = Array.from({ length: 20 }, (_, i) => i + 1);

// expected wounds the hero deals with one attack (all outcomes of the d20 included)
function heroAttack(h, e, model) {
  const b = M.attackBonus(h, model);
  let land = 0, wounds = 0;
  const t = M.enemyThresholds(e);
  for (const d of faces) {
    const g = M.grade(d, d + b);
    if (!['crit', 'success', 'mixed'].includes(g)) continue;
    land += 1 / 20;
    if (model === 'v1') { wounds += (g === 'crit' ? 2 : 1) / 20; continue; }
    for (const [dmg, p] of M.dist(h.weapon, g === 'crit')) wounds += M.woundsFor(dmg, t) * p / 20;
  }
  return { land, wounds, perHit: wounds / land };
}
// expected wounds the hero takes from one enemy move (no Hit Dice spent)
function enemyMove(h, e, model) {
  const b = M.defenseBonus(h, model);
  let avoid = 0, wounds = 0;
  const t = M.heroThresholds(h);
  for (const d of faces) {
    const g = M.grade(d, d + b);
    if (g === 'crit' || g === 'success') { avoid += 1 / 20; continue; }
    if (model === 'v1') { wounds += (g === 'disaster' ? 2 : 1) / 20; continue; }
    const shift = M.THREAT_STEP[e.tier] + (g === 'mixed' ? -1 : g === 'disaster' ? 1 : 0);
    for (const [dmg, p] of M.dist(e.damage, g === 'disaster')) wounds += M.step(M.woundsFor(dmg, t), shift) * p / 20;
  }
  return { avoid, wounds };
}

for (const level of [1, 5]) {
  console.log(`\n=== Level ${level} heroes ===`);
  console.log('hero      AC | attack lands v1 / v2 | defense avoids v1 / v2 | thresholds v2');
  for (const h of HEROES[level]) {
    const t = M.heroThresholds(h);
    console.log(`${h.name.padEnd(8)} ${String(h.ac).padStart(3)} |      ${pct(heroAttack(h, ENEMIES.cultist, 'v1').land)} / ${pct(heroAttack(h, ENEMIES.cultist, 'v2').land)}   |        ${pct(enemyMove(h, ENEMIES.cultist, 'v1').avoid)} / ${pct(enemyMove(h, ENEMIES.cultist, 'v2').avoid)}     | ${t.major} / ${t.severe}`);
  }
  const foes = level === 1 ? ['lookout', 'cultist', 'ackshie'] : ['cultist', 'guz', 'ackshie', 'jack'];
  console.log(`\nWounds DEALT per landed hit (v2; v1 is always 1, 2 on a natural 20)`);
  console.log('hero     weapon          ' + foes.map(f => (ENEMIES[f].name.split(' ').pop() + ' ' + ENEMIES[f].tier[0]).padStart(13)).join(''));
  for (const h of HEROES[level]) console.log(`${h.name.padEnd(8)} ${h.weapon.padEnd(15)} ` + foes.map(f => num(heroAttack(h, ENEMIES[f], 'v2').perHit).padStart(13)).join(''));
  console.log('enemy thresholds (v2)    ' + foes.map(f => { const t = M.enemyThresholds(ENEMIES[f]); return `${t.major}/${t.severe} of ${M.BOXES.v2[ENEMIES[f].tier]}`.padStart(13); }).join(''));
  console.log(`\nWounds TAKEN per enemy move, v1 → v2 (hero has ${M.HERO_BOXES} boxes in both)`);
  console.log('hero      AC ' + foes.map(f => (ENEMIES[f].name.split(' ').pop() + ' ' + ENEMIES[f].tier[0]).padStart(15)).join(''));
  for (const h of HEROES[level]) console.log(`${h.name.padEnd(8)} ${String(h.ac).padStart(3)} ` + foes.map(f => `${num(enemyMove(h, ENEMIES[f], 'v1').wounds)} → ${num(enemyMove(h, ENEMIES[f], 'v2').wounds)}`.padStart(15)).join(''));
}

// ---- target checks ----
const checks = [];
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
for (const level of [1, 5]) {
  const H = HEROES[level];
  // armor: the same hero in their armor vs unarmored (AC 10 + Dex), so only the armor changes
  for (const f of level === 1 ? ['ackshie'] : ['ackshie', 'jack']) {
    const armored = H.filter(h => h.ac - (10 + M.mod(h.abil.DEX)) >= 5);
    const cut = avg(armored.map(h => 1 - enemyMove(h, ENEMIES[f], 'v2').wounds / enemyMove({ ...h, ac: 10 + M.mod(h.abil.DEX) }, ENEMIES[f], 'v2').wounds));
    checks.push([`L${level} armor vs ${ENEMIES[f].name}: heavy armor (${armored.map(h => h.name).join(', ')}) takes ≥30% fewer wounds than the same hero unarmored`, cut >= 0.3, `${pct(cut)} fewer`]);
  }
  const perHit = H.map(h => heroAttack(h, ENEMIES[level === 1 ? 'ackshie' : 'jack'], 'v2').perHit);
  checks.push([`L${level} weapons: biggest hitter deals ≥30% more wounds per hit than smallest`, Math.max(...perHit) / Math.min(...perHit) - 1 >= 0.3, `+${pct(Math.max(...perHit) / Math.min(...perHit) - 1)}`]);
}
const fighter5 = HEROES[5][0];
const tiers = ['lookout', 'cultist', 'ackshie', 'jack'].map(f => enemyMove(fighter5, ENEMIES[f], 'v2').wounds);
checks.push(['tiers: wounds per move rise Minion < Standard ≤ Elite < Boss, Boss ≥ 2× Minion (vs L5 fighter)', tiers[0] < tiers[1] && tiers[1] <= tiers[2] && tiers[2] < tiers[3] && tiers[3] >= 2 * tiers[0], tiers.map(x => x.toFixed(2)).join(' < ')]);
const pal1 = HEROES[1][1], wiz1 = HEROES[1][4];
checks.push(['paladin (AC 18) now defends at least as well as the wizard (AC 11)', enemyMove(pal1, ENEMIES.ackshie, 'v2').wounds <= enemyMove(wiz1, ENEMIES.ackshie, 'v2').wounds, `${enemyMove(pal1, ENEMIES.ackshie, 'v2').wounds.toFixed(2)} vs ${enemyMove(wiz1, ENEMIES.ackshie, 'v2').wounds.toFixed(2)} wounds per Ackshie move`]);
console.log('\n=== Targets (exact odds) ===');
for (const [label, ok, detail] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (${detail})`);
module.exports = { heroAttack, enemyMove };
