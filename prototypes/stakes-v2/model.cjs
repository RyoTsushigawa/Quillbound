// Stakes damage prototype: the current rules ("v1") next to the proposed ones ("v2").
// Pure functions, no app code. Every d20 here is a fair die; nothing is weighted.
//
// v2 in one paragraph:
//   Roll one d20 as now (nat 20 / 15+ / 8–14 / 7 or less / nat 1). If the hit lands, roll the
//   normal 5e damage and compare it with the target's two thresholds: below Major = 1 wound,
//   Major or more = 2, Severe or more = 3. Enemy thresholds come from their 5e hit points,
//   hero thresholds from armor and level. The enemy's tier (its threat) decides how hard
//   failure bites. Hit Dice are stamina: spend one to take one wound less, or to make a Last Stand.

/* ---------- dice ---------- */
const parse = expr => { // "2d6+3", "1d8", "2d8+3+2d8+3" (sum of several attacks)
  const terms = [];
  for (const m of expr.replace(/\s/g, '').matchAll(/([+-]?)(\d*)d(\d+)|([+-]?\d+)/g)) {
    if (m[3]) terms.push({ n: +(m[2] || 1) * (m[1] === '-' ? -1 : 1), sides: +m[3] });
    else if (m[4]) terms.push({ flat: +m[4] });
  }
  return terms;
};
const rollExpr = (expr, rng, crit = false) => parse(expr).reduce((sum, t) => {
  if (t.flat !== undefined) return sum + t.flat;
  let s = 0; const n = Math.abs(t.n) * (crit ? 2 : 1);
  for (let i = 0; i < n; i++) s += 1 + Math.floor(rng() * t.sides);
  return sum + Math.sign(t.n) * s;
}, 0);
// exact distribution {value: probability} of a damage expression
function dist(expr, crit = false) {
  let d = new Map([[0, 1]]);
  for (const t of parse(expr)) {
    if (t.flat !== undefined) { d = new Map([...d].map(([v, p]) => [v + t.flat, p])); continue; }
    const n = Math.abs(t.n) * (crit ? 2 : 1);
    for (let i = 0; i < n; i++) {
      const next = new Map();
      for (const [v, p] of d) for (let f = 1; f <= t.sides; f++) next.set(v + f, (next.get(v + f) || 0) + p / t.sides);
      d = next;
    }
  }
  return d;
}
const mod = s => Math.floor((s - 10) / 2);
const grade = (die, total) => die === 20 ? 'crit' : die === 1 ? 'disaster' : total >= 15 ? 'success' : total >= 8 ? 'mixed' : 'setback';

/* ---------- v2 numbers ---------- */
// Wound boxes per tier. v1 used 1/2/3/4; v2 gives more boxes because one hit can now do 1–3 wounds.
const BOXES = { v1: { Minion: 1, Standard: 2, Elite: 3, Boss: 4 }, v2: { Minion: 1, Standard: 3, Elite: 4, Boss: 6 } };
const HERO_BOXES = 4;
// Enemy thresholds: a quarter and a half of their 5e hit points (minimum 3/6).
const enemyThresholds = e => { const major = Math.max(3, Math.round(e.hp / 4)); return { major, severe: major * 2 }; };
// Hero thresholds: armor and level. Armor counts one and a half times, so plate matters against big hitters too.
// AC 16 at level 1 → 14 / 28; AC 11 → 6 / 12. (First draft was AC − 5 + level; it failed the armor-vs-boss target.)
const heroThresholds = h => { const major = h.ac + Math.floor((h.ac - 10) / 2) + h.level - 6; return { major, severe: major * 2 }; };
const woundsFor = (dmg, t) => dmg >= t.severe ? 3 : dmg >= t.major ? 2 : 1;
// Threat: how much an enemy's tier shifts the wounds its moves cause (in steps).
const THREAT_STEP = { Minion: -1, Standard: 0, Elite: 0, Boss: 1 };
// When a hero's own action goes wrong (8–14 or worse), the target hits back with this many steps (null = no damage, only position/condition).
const COUNTER = {
  mixed: { Minion: null, Standard: null, Elite: -1, Boss: 0 },
  setback: { Minion: null, Standard: -1, Elite: 0, Boss: 1 },
  disaster: { Minion: 0, Standard: 0, Elite: 1, Boss: 1 }
};
const step = (w, s) => Math.max(0, Math.min(3, w + s));

/* ---------- heroes and bonuses ---------- */
// v1 "trained" = the class's two saving throws (what the app does today). v2: always proficient with your own attacks and defense.
function attackBonus(h, model) { return mod(h.abil[h.attackAbility]) + (model === 'v1' ? (h.saves.includes(h.attackAbility) ? h.prof : 0) : h.prof); }
function defenseBonus(h, model) {
  const ab = (h.abil.CON > h.abil.DEX) ? 'CON' : 'DEX';
  return mod(h.abil[ab]) + (model === 'v1' ? (h.saves.includes(ab) ? h.prof : 0) : h.prof);
}

module.exports = { parse, rollExpr, dist, mod, grade, BOXES, HERO_BOXES, enemyThresholds, heroThresholds, woundsFor, THREAT_STEP, COUNTER, step, attackBonus, defenseBonus };
