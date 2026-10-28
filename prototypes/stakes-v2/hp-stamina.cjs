// HP + stamina, simulated on real fights from the library and compared with plain 5e and with Stakes as it is now.
// Usage: node prototypes/stakes-v2/hp-stamina.cjs [runs]
//
// Models (every d20 fair; same party, same encounters, same random initiative and tactics in all of them):
//   5e     plain 5e: attack roll vs AC, damage from HP.
//   now    Stakes today: fixed bands (15+ / 8–14 / 7−), wound boxes by CR tier, minion mobs, 1 wound per hit.
//   bands  HP + stamina, Stakes' fixed bands: a landed hit (8+) deals its 5e damage; a hero's defense roll
//          avoids on 15+, takes half on 8–14, full below, a critical on a natural 1.
//   vsAC   HP + stamina, bands measured from the 5e numbers: a hero hits at AC or more, grazes (half damage)
//          up to 5 below; a hero defends with d20 + AC − 10 against 11 + the enemy's attack bonus, with the
//          same 5-point graze band. Without the graze band this is exactly 5e's hit chance.
// In bands and vsAC, a hero's mixed or failed attack has a cost: one time in three the target strikes back (one attack).
// Stamina = proficiency bonus per fight; spend 1 to re-roll one of your own d20s and keep the better result
// (pushing). At 0 the hero is Winded and can't push. Stamina never removes damage directly.
// "sta:act" pushes only the hero's own actions; "sta:all" may also push defense rolls (which works like absorbing damage).
const M = require('./model.cjs');
const { LIBRARY, PARTY } = require('./library.cjs');
const RUNS = +process.argv[2] || 4000;

function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const d20 = rng => 1 + Math.floor(rng() * 20);
const tierFor = cr => cr <= 0.25 ? ['Minion', 1] : cr <= 1 ? ['Standard', 2] : cr <= 4 ? ['Elite', 3] : ['Boss', 4]; // same as src/importer/reader.js

const heroAtk = (h, model) => model === 'now' ? M.attackBonus(h, 'v1') + h.attackMagic : M.mod(h.abil[h.attackAbility]) + h.prof + h.attackMagic;
const heroDef = h => M.defenseBonus(h, 'v2');

// opts.pool(h) = stamina pool size (default: proficiency bonus).
// opts.party = heroes carried over from an earlier fight (HP and stamina as they are; see day.cjs).
function fight(level, enc, model, rng, stamina, push = 'better', opts = {}) {
  const pool = opts.pool || (h => h.prof);
  const party = opts.party ? opts.party.map(h => Object.assign(h, { staUsed: 0, down: h.hpNow <= 0, init: d20(rng) + M.mod(h.abil.DEX) }))
    : PARTY(level).map(h => ({ ...h, side: 'hero', hpNow: h.hp, wounds: 0, sta: stamina ? pool(h) : 0, staUsed: 0, down: false, init: d20(rng) + M.mod(h.abil.DEX) }));
  let foes = enc.foes.map((f, i) => ({ ...f, id: i, side: 'foe', hpNow: f.hp, wounds: 0, down: false, init: d20(rng) + 1 }));
  if (opts.mobs === 'pool') { // three or more of the same creature up to opts.mobCR (default 1/4, the app's Minion line) form a mob
    const count = {}; for (const f of foes) count[f.name] = (count[f.name] || 0) + 1;
    for (const f of foes) if (count[f.name] >= 3 && f.cr <= (opts.mobCR ?? 0.25)) f.mob = f.name;
  }
  if (model === 'now') { // the app's foe setup: tier boxes, three or more minions of a kind become one mob
    const out = [], byName = {};
    for (const f of foes) { const [tier, slots] = tierFor(f.cr); Object.assign(f, { tier, slots }); (byName[f.name + tier] ||= []).push(f); }
    for (const group of Object.values(byName)) {
      if (group[0].tier === 'Minion' && group.length >= 3) out.push({ ...group[0], name: group[0].name + ' mob', mob: true, slots: group.length });
      else out.push(...group);
    }
    foes = out;
  }
  const order = [...party, ...foes].sort((a, b) => b.init - a.init);
  const up = list => list.filter(x => !x.down);
  // dramatic moments (HP version), one per combatant per fight, same chance for heroes and enemies:
  //   opts.lastStand = chance to stay up at 1 HP instead of dropping; opts.powerThrough = chance that a combatant under
  //   half HP who lands a hit recovers 10% of max HP (opts.ptFull: recover to half HP instead)
  const drama = x => { if (opts.lastStand && !x.moment && rng() < opts.lastStand) { x.moment = 'last'; x.hpNow = 1; return true; } return false; };
  const powerThrough = x => { if (opts.powerThrough && !x.moment && x.hpNow < x.hp / 2 && rng() < opts.powerThrough) { x.moment = 'power'; x.hpNow = opts.ptFull ? Math.ceil(x.hp / 2) : Math.min(x.hp, x.hpNow + Math.ceil(x.hp / 10)); } };
  const hurt = (h, dmg) => { if (model === 'now') { h.wounds += dmg; if (h.wounds >= 4) h.down = true; } else { h.hpNow -= dmg; if (h.hpNow <= 0 && !drama(h)) h.down = true; } };
  // a hero's own d20 with an optional push: re-roll a bad band once if stamina is left
  // stamina 'act' = push only your own actions; true = also push defense rolls
  // push: 'better' = re-roll, keep the better; 'new' = re-roll, keep the new one (only worth it on a failure);
  // 'd4' = add 1d4 to the roll you have (a natural 1 or 20 stays what it is)
  const rank = { disaster: 0, setback: 1, mixed: 2, success: 3, crit: 4 };
  // opts.winded (what Winded means once stamina is 0; Winded heroes can never push with stamina):
  //   'none' nothing more · 'noGraze' their grazes deal nothing · 'overexert' they may still push by spending a Hit Die
  //   'exposed' a failed or grazing attack draws a strike-back two times in three instead of one
  const winded = h => stamina && h.sta === 0;
  const heroRoll = (h, bandOf, defense = false) => {
    let d = d20(rng), b = bandOf(d);
    const worth = b === 'setback' || b === 'disaster' || (b === 'mixed' && model === 'vsAC' && push !== 'new');
    const canPush = h.sta > 0 || (opts.winded === 'overexert' && winded(h) && h.hd > 0 && !defense);
    if (canPush && !(defense && stamina === 'act') && worth && !(push === 'd4' && (d === 1 || d === 20))) {
      if (h.sta > 0) h.sta--; else { h.hd--; h.hdBurned = (h.hdBurned || 0) + 1; }
      h.staUsed++;
      if (push === 'd4') { const b2 = bandOf(Math.min(19, d + 1 + Math.floor(rng() * 4))); if (rank[b2] > rank[b]) b = b2; }
      else { const b2 = bandOf(d20(rng)); if (push === 'new' || rank[b2] > rank[b]) b = b2; }
    }
    return b;
  };
  // graze: opts.grazeW = window below the target number (default 5), opts.grazeDef = window on defense rolls (default same),
  // opts.grazeEff = 'half' (half damage, default) or 'flat' (only the flat bonus, at least 1)
  const gw = opts.grazeW ?? 5, gwDef = opts.grazeDef ?? gw;
  // defense: avoid when d20 + AC − 10 reaches dc + attack bonus. 12 (= "beat 11 + bonus") is exactly 5e's hit chance;
  // the earlier studies used 11, which gives heroes one extra face (5 points) on every defense roll.
  const dc = opts.defDC ?? 11;
  const graze = expr => opts.grazeEff === 'flat' ? Math.max(1, M.parse(expr).reduce((s, t) => s + (t.flat || 0), 0)) : Math.floor(M.rollExpr(expr, rng) / 2);
  const strikeBack = (h, f, crit = false) => { if (rng() < (opts.winded === 'exposed' && winded(h) ? 2 / 3 : opts.strikeBack ?? 1 / 3)) hurt(h, model === 'now' ? (crit ? 2 : 1) : M.rollExpr(f.attacks[0], rng, crit)); };

  let round = 0;
  while (up(party).length && up(foes).length && round < 30) {
    round++;
    for (const a of order) {
      if (a.down || !up(party).length || !up(foes).length) continue;
      if (a.side === 'hero') {
        const targets = up(foes);
        const f = targets.sort((x, y) => model === 'now' ? (x.slots - x.wounds) - (y.slots - y.wounds) : x.hpNow - y.hpNow)[0];
        const bonus = heroAtk(a, model);
        if (model === '5e') {
          for (const atk of a.attacks) { if (f.down) break; const d = d20(rng); a.acts = (a.acts || 0) + 1; if (d === 20 || (d !== 1 && d + bonus >= f.ac)) { f.hpNow -= M.rollExpr(atk, rng, d === 20); if (f.hpNow <= 0) f.down = true; } else a.whiffs = (a.whiffs || 0) + 1; }
          continue;
        }
        if (model === 'now') { // one roll for the whole action, 1 wound (2 on a 20); mixed/failed costs a wound one time in three
          const b = heroRoll(a, d => M.grade(d, d + bonus));
          if (b === 'crit' || b === 'success' || b === 'mixed') { f.wounds += b === 'crit' ? 2 : 1; if (f.wounds >= f.slots) f.down = true; }
          if (b === 'mixed' || b === 'setback' || b === 'disaster') strikeBack(a, f, b === 'disaster');
          continue;
        }
        // HP models: every attack in the action gets its own roll
        for (const atk of a.attacks) {
          if (f.down) break;
          const bandOf = model === 'bands' ? d => M.grade(d, d + bonus)
            : d => d === 20 ? 'crit' : d === 1 ? 'disaster' : d + bonus >= f.ac ? 'success' : d + bonus >= f.ac - gw ? 'mixed' : 'setback';
          const b = heroRoll(a, bandOf);
          let dmg = 0;
          if (b === 'crit') dmg = M.rollExpr(atk, rng, true);
          else if (b === 'success') dmg = M.rollExpr(atk, rng);
          else if (b === 'mixed') dmg = model === 'bands' ? M.rollExpr(atk, rng) : opts.winded === 'noGraze' && winded(a) ? 0 : graze(atk);
          a.acts = (a.acts || 0) + 1; if (dmg <= 0) a.whiffs = (a.whiffs || 0) + 1;
          f.hpNow -= dmg; if (f.hpNow <= 0 && !drama(f)) f.down = true;
          if (dmg > 0) powerThrough(a);
          // breaking points: opts.breakAt = HP fraction at which a breakable enemy flees or surrenders (it leaves the fight;
          // opts.breakLeave = chance the DM lets it go rather than 'fights on', default 1, asked once per enemy);
          // a group of three or more of one creature breaks when half of it is down
          if (opts.breakAt != null) {
            const at = typeof opts.breakAt === 'function' ? opts.breakAt(f, level) : opts.breakAt;
            if (!f.down && !f.breakChecked && opts.breakable(f.name) && f.hpNow <= f.hp * at && (f.breakChecked = true) && rng() < (opts.breakLeave ?? 1)) { f.down = true; f.broke = true; }
            const kin = foes.filter(o => o.name === f.name);
            if (kin.length >= 3 && opts.breakable(f.name) && kin.filter(o => o.down).length >= kin.length / 2) kin.forEach(o => { if (!o.down) { o.down = true; o.broke = true; } });
          }
          // shared mob pool: damage beyond what drops one member carries on to the next member
          if (opts.mobs === 'pool' && f.mob && f.hpNow < 0) { let spill = -f.hpNow; f.hpNow = 0; for (const o of foes) { if (!spill) break; if (o.mob === f.mob && !o.down) { o.hpNow -= spill; spill = o.hpNow < 0 ? -o.hpNow : 0; if (o.hpNow <= 0) { o.down = true; o.hpNow = 0; } } } }
          if (b === 'mixed' || b === 'setback' || b === 'disaster') { strikeBack(a, f, b === 'disaster'); if (a.down) break; }
        }
      } else {
        const targets = up(party); const h = targets[Math.floor(rng() * targets.length)];
        if (model === '5e') {
          for (const atk of a.attacks) { if (h.down) break; const d = d20(rng); if (d === 20 || (d !== 1 && d + a.atk >= h.ac)) hurt(h, M.rollExpr(atk, rng, d === 20)); }
          continue;
        }
        if (model === 'now') { // one defense roll against the whole move: 8–14 and 7− cost a wound, a 1 costs two
          const b = heroRoll(h, d => M.grade(d, d + heroDef(h)), true);
          if (b === 'mixed' || b === 'setback') hurt(h, 1); else if (b === 'disaster') hurt(h, 2);
          continue;
        }
        for (const atk of a.attacks) {
          if (h.down) break;
          const bandOf = model === 'bands' ? d => M.grade(d, d + heroDef(h))
            : d => d === 20 ? 'crit' : d === 1 ? 'disaster' : d + h.ac - 10 >= dc + a.atk ? 'success' : d + h.ac - 10 >= dc + a.atk - gwDef ? 'mixed' : 'setback';
          const b = heroRoll(h, bandOf, true);
          if (b === 'mixed') hurt(h, graze(atk));
          else if (b === 'setback') hurt(h, M.rollExpr(atk, rng));
          else if (b === 'disaster') hurt(h, M.rollExpr(atk, rng, true));
          if (b !== 'success' && b !== 'crit') powerThrough(a);
        }
      }
    }
  }
  return { rounds: round, lost: up(party).length === 0, down: party.filter(h => h.down).length, sta: party.reduce((s, h) => s + h.staUsed, 0), winded: party.filter(h => stamina && h.sta === 0).length, broke: foes.filter(o => o.broke).length, moments: [...party, ...foes].filter(x => x.moment).length, whiff: party.reduce((s, h) => s + (h.whiffs || 0), 0) / Math.max(1, party.reduce((s, h) => s + (h.acts || 0), 0)), party };
}

function run(level, enc, model, stamina = false, push = 'better', opts = {}) {
  const rng = rngFrom(4242); const t = { rounds: 0, lost: 0, down: 0, any: 0, sta: 0, winded: 0 };
  for (let i = 0; i < RUNS; i++) { const r = fight(level, enc, model, rng, stamina, push, opts); t.rounds += r.rounds; t.lost += r.lost; t.down += r.down; t.any += r.down > 0; t.sta += r.sta; t.winded += r.winded; }
  for (const k in t) t[k] /= RUNS;
  return t;
}
module.exports = { fight, run };

if (require.main === module) {
  const MODELS = [['5e', '5e', false], ['now', 'Stakes now', false], ['vsAC', 'HP vs AC', false], ['vsAC', 'push re-roll', 'act'], ['vsAC', 'push keep new', 'act', 'new'], ['vsAC', 'push +1d4', 'act', 'd4']];
  const pct = x => `${Math.round(x * 100)}%`.padStart(4);
  console.log(`${RUNS} fights per cell, party of five. Each cell: rounds / someone drops / party wiped.`);
  console.log('level  fight'.padEnd(58) + MODELS.map(([, l]) => l.padStart(18)).join(''));
  const sums = Object.fromEntries(MODELS.map(([, l]) => [l, { rounds: 0, any: 0, lost: 0, gap: 0 }])); let n = 0;
  for (const [level, fights] of Object.entries(LIBRARY)) for (const enc of fights) {
    const rs = MODELS.map(([m, , s, p]) => run(+level, enc, m, s, p)); n++;
    rs.forEach((r, i) => { const s = sums[MODELS[i][1]]; s.rounds += r.rounds; s.any += r.any; s.lost += r.lost; s.gap += Math.abs(r.any - rs[0].any); });
    console.log(`L${String(level).padEnd(3)} ${(enc.book.replace(/^The /, '').slice(0, 22) + ': ' + enc.what).slice(0, 52).padEnd(52)}` + rs.map(r => `${r.rounds.toFixed(1).padStart(5)} ${pct(r.any)} ${pct(r.lost)}`.padStart(18)).join(''));
  }
  console.log('\naverage over all fights'.padEnd(59) + MODELS.map(([, l]) => { const s = sums[l]; return `${(s.rounds / n).toFixed(1).padStart(5)} ${pct(s.any / n)} ${pct(s.lost / n)}`.padStart(18); }).join(''));
  console.log('avg gap to 5e in "someone drops"'.padEnd(58) + MODELS.map(([, l]) => pct(sums[l].gap / n).padStart(18)).join(''));
}
