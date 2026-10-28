// Convert the downloaded SRD 5.1 monster list (5e-bits/5e-database) into the app's compact local file.
// Usage: node tools/srd-convert.cjs <downloaded 5e-SRD-Monsters.json>  (keep the download outside the project)
const fs = require('fs');
require(require('path').join(__dirname,'../src/app/attacks.js')); const A = globalThis.QBAttacks;
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = [], skipped = [];
// A versatile weapon lists a choice of damage (one-handed / two-handed): take the first option.
const dice = d => d.damage_dice || d.from?.options?.find(o => o.damage_dice)?.damage_dice;
for (const m of src) {
  const attacks = (m.actions || []).filter(a => Number.isFinite(a.attack_bonus) && (a.damage || []).some(dice))
    .map(a => [a.name, a.attack_bonus, a.damage.map(dice).filter(Boolean).map(x => x.replace(/\s/g, '')).join('+')]);
  const turn = A.turnOf((m.actions || []).map(a => ({ name: a.name, text: a.desc || '' })), attacks.map(([name, bonus, damage]) => ({ name, bonus, damage })));
  const ac = (m.armor_class || [])[0]?.value;
  if (!Number.isFinite(m.hit_points) || !Number.isFinite(ac)) { skipped.push(m.name); continue; }
  rows.push([m.name, m.type, m.hit_points, ac, m.challenge_rating, attacks, turn]);
}
const out = `/* SRD 5.1 monsters: name, type, hit points, armor class, challenge rating, attacks [name, bonus, damage], one turn of attacks.
   Generated from github.com/5e-bits/5e-database (src/2014/en/5e-SRD-Monsters.json) by a conversion script; do not edit by hand.
   ${'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.'} */
(function (root) {
  root.QBSRD = {
    attribution: 'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.',
    monsters: ${JSON.stringify(rows)}
  };
})(globalThis);
`;
fs.writeFileSync(require('path').join(__dirname,'../src/app/srd-monsters.js'), out);
console.log(rows.length, 'monsters written,', out.length, 'bytes; skipped:', skipped.join(', ') || 'none');
const show = n => console.log(JSON.stringify(rows.find(r => r[0] === n)));
['Goblin', 'Drow', 'Chimera', 'Owlbear', 'Young Red Dragon', 'Swarm of Rats', 'Mage'].forEach(show);
console.log('no attacks:', rows.filter(r => !r[5].length).map(r => r[0]).join(', '));
