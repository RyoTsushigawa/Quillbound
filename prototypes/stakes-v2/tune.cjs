// Pacing sweep: which v2 levers bring fight length and danger closer to plain 5e?
// Usage: node prototypes/stakes-v2/tune.cjs [runs]
const { run } = require('./fights.cjs');
const { ENCOUNTERS } = require('./data.cjs');
const BIG = { Minion: 1, Standard: 3, Elite: 6, Boss: 10 };
const FAIR_THREAT = { Minion: 0, Standard: 0, Elite: 0, Boss: 1 };
const VARIANTS = [
  ['A  v2 as drafted', {}],
  ['B  graze + boxes 1/3/6/10', { graze: true, boxes: BIG }],
  ['C  B + minions threat 0', { graze: true, boxes: BIG, threat: FAIR_THREAT }],
  ['D  C + Hit Dice cap = prof', { graze: true, boxes: BIG, threat: FAIR_THREAT, hdCap: 'prof' }]
];
const pct = x => (x * 100).toFixed(0).padStart(4) + '%';
const line = r => `rounds ${r.rounds.toFixed(1).padStart(4)}  loses ${pct(r.lost)}  someone down ${pct(r.anyDown)}`;
for (const level of [1, 5]) for (const enc of ENCOUNTERS[level]) {
  console.log(`\nLevel ${level} · ${enc.name}`);
  console.log(`  ${'plain 5e'.padEnd(28)} ${line(run(level, enc, '5e'))}`);
  for (const [label, opts] of VARIANTS) {
    const noHD = run(level, enc, 'v2-noHD', label, opts), hd = run(level, enc, 'v2', label, opts);
    console.log(`  ${label.padEnd(28)} ${line(noHD)}  | with Hit Dice: someone down ${pct(hd.anyDown)}, HD spent ${hd.hd.toFixed(1)}`);
  }
}
