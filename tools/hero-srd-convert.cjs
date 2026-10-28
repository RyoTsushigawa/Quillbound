// Convert the SRD 5.2 (2024) character data from github.com/5e-bits/5e-database (src/2024/en) into the app's two
// local files: src/app/srd-heroes.js (species, backgrounds, feats, skills, classes, levels, features, equipment) and
// src/app/srd-spells.js (spells, loaded when the Spells step opens).
// Usage: node tools/hero-srd-convert.cjs <folder with the downloaded 5e-SRD-*.json files>  (keep the download outside the project)
const fs = require('fs'), path = require('path');
const dir = process.argv[2]; if (!dir) throw Error('Give the folder with the downloaded files.');
const load = n => JSON.parse(fs.readFileSync(path.join(dir, '5e-SRD-' + n + '.json'), 'utf8'));
const ABIL = x => String(x?.name || x?.index || '').toUpperCase().slice(0, 3);
const clean = s => String(s || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n\s+/g, '\n').trim();
const skillOf = ix => String(ix || '').replace(/^skill-/, '');
const ATTRIBUTION = 'This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';

const traitsSrc = load('Traits'), traitDesc = Object.fromEntries(traitsSrc.map(t => [t.index, clean(t.description)]));
const trait = t => ({ id: t.index, name: t.name, desc: traitDesc[t.index] || '' });
const subSrc = load('Subspecies');
const species = load('Species').map(s => ({ id: s.index, name: s.name, size: s.size, speed: s.speed, traits: (s.traits || []).map(trait),
  sub: (s.subspecies || []).map(r => { const x = subSrc.find(y => y.index === r.index) || r; return { id: r.index, name: r.name, damage: x.damage_type?.name || '', traits: (x.traits || []).map(trait) }; }) }));

// Equipment options: "(A) … or (B) 50 GP" → [{ items: [{id, count}], gp, desc }]
function optionSets(list) {
  return (list || []).map(o => {
    const opts = o.from?.options || [];
    const flat = opt => { const out = { items: [], gp: 0, other: [] };
      const add = x => { if (x.option_type === 'counted_reference') out.items.push({ id: x.of.index, name: x.of.name, count: x.count || 1 });
        else if (x.option_type === 'reference') out.items.push({ id: x.item.index, name: x.item.name, count: 1 });
        else if (x.option_type === 'money') out.gp += x.unit === 'gp' ? x.count : x.unit === 'sp' ? x.count / 10 : x.count / 100;
        else if (x.option_type === 'multiple') (x.items || []).forEach(add);
        else out.other.push(x.desc || x.choice?.desc || 'a choice (see the description)'); };
      add(opt); return out; };
    return { desc: clean(o.desc), choices: opts.map(flat) };
  });
}
const backgrounds = load('Backgrounds').map(b => ({ id: b.index, name: b.name, abilities: (b.ability_scores || []).map(ABIL), feat: b.feat ? { id: b.feat.index, name: b.feat.name, note: b.feat.note || '' } : null,
  skills: (b.proficiencies || []).filter(p => /^skill-/.test(p.index)).map(p => skillOf(p.index)), tools: (b.proficiencies || []).filter(p => /^tool-/.test(p.index)).map(p => p.name.replace(/^Tool:\s*/, '')),
  toolChoice: (b.proficiency_choices || []).map(c => ({ choose: c.choose, desc: clean(c.desc), from: (c.from?.options || []).map(o => o.item?.name?.replace(/^Tool:\s*/, '')).filter(Boolean) }))[0] || null,
  equipment: optionSets(b.equipment_options)[0] || null }));
const feats = load('Feats').map(f => ({ id: f.index, name: f.name, type: f.type, desc: clean(f.description), minLevel: f.prerequisites?.minimum_level || 0, repeatable: !!f.repeatable }));
const skills = load('Skills').map(s => ({ id: s.index, name: s.name, ability: ABIL(s.ability_score), desc: clean(s.description) }));
const mastery = load('Weapon-Mastery-Properties').map(m => ({ id: m.index, name: m.name, desc: clean(m.description) }));

const featSrc = load('Features'), levelSrc = load('Levels'), subclassSrc = load('Subclasses');
const features = Object.fromEntries(featSrc.map(f => [f.index, { name: f.name, cls: f.class?.index || '', level: Number(String(f.level?.index || '').split('-').pop()) || 0, desc: clean(f.description) }]));
const classes = load('Classes').map(c => {
  const levels = levelSrc.filter(l => l.class?.index === c.index && !l.subclass).sort((a, b) => a.level - b.level).map(l => {
    const sc = l.spellcasting; const out = { level: l.level, prof: l.prof_bonus, features: (l.features || []).map(f => f.index) };
    if (sc) out.spell = { cantrips: sc.cantrips_known || 0, prepared: sc.prepared_spells || 0, slots: Array.from({ length: 9 }, (_, i) => sc['spell_slots_level_' + (i + 1)] || 0) };
    if (l.class_specific && Object.keys(l.class_specific).length) out.specific = l.class_specific;
    return out;
  });
  const sub = (c.subclasses || []).map(r => subclassSrc.find(s => s.index === r.index)).filter(Boolean)[0];
  const choice = (c.proficiency_choices || []).find(p => (p.from?.options || []).some(o => /^skill-/.test(o.item?.index || '')));
  return { id: c.index, name: c.name, hitDie: c.hit_die, primary: (c.primary_ability?.ability_score_options?.from?.options || []).map(o => ABIL(o.item)).concat((c.primary_ability?.ability_scores || []).map(ABIL)), // "STR or DEX" (options) or "STR and CHA" (list)
    primaryDesc: c.primary_ability?.desc || '', saves: (c.saving_throws || []).map(ABIL), profs: (c.proficiencies || []).filter(p => !/^saving-throw-/.test(p.index)).map(p => p.name),
    skillChoice: choice ? { choose: choice.choose, from: choice.from.options.map(o => skillOf(o.item.index)) } : null,
    equipment: optionSets(c.starting_equipment_options)[0] || null, spellAbility: c.spellcasting ? ABIL(c.spellcasting.spellcasting_ability) : '',
    subclass: sub ? { id: sub.index, name: sub.name, summary: clean(sub.summary), desc: clean(sub.description), features: (sub.features || []).map(f => ({ level: f.level, name: f.name, desc: clean(f.description) })) } : null,
    levels };
});
const equipment = {};
// Known errors in the source data, corrected against the SRD 5.2 Adventuring Gear table.
const CORRECTIONS = { parchment: { cost: '1 sp' } }; // the data says 3 gp a sheet; the SRD says 1 SP (the Acolyte's kit only adds up to 50 GP with 1 SP)
for (const e of load('Equipment')) {
  const cats = e.equipment_categories.map(c => c.index), base = { name: e.name, cost: e.cost ? e.cost.quantity + ' ' + e.cost.unit : '', weight: e.weight || 0, ...(e.quantity > 1 ? { bundle: e.quantity } : {}), ...(CORRECTIONS[e.index] || {}) }; // bundle: the price buys this many (20 arrows)
  if (cats.includes('weapons')) equipment[e.index] = { ...base, kind: 'weapon', group: cats.includes('martial-weapons') ? 'martial' : 'simple', ranged: cats.includes('ranged-weapons'), dice: e.damage?.damage_dice || '', type: e.damage?.damage_type?.name || '',
    props: (e.properties || []).map(p => p.index), range: e.range?.long ? `${e.range.normal}/${e.range.long}` : '', versatile: e.two_handed_damage?.damage_dice || '', mastery: e.mastery?.index || '' };
  else if (cats.includes('shields')) equipment[e.index] = { ...base, kind: 'shield', ac: e.armor_class?.base || 2 };
  else if (cats.includes('armor')) equipment[e.index] = { ...base, kind: 'armor', group: cats.includes('heavy-armor') ? 'heavy' : cats.includes('medium-armor') ? 'medium' : 'light', ac: e.armor_class.base, dex: !!e.armor_class.dex_bonus, maxDex: e.armor_class.max_bonus ?? null, str: e.str_minimum || 0, stealth: !!e.stealth_disadvantage };
  else equipment[e.index] = { ...base, kind: cats.includes('equipment-packs') ? 'pack' : cats.some(c => /foci|holy-symbols/.test(c)) ? 'focus' : cats.some(c => /tools|gaming-sets|instruments/.test(c)) ? 'tool' : 'gear', contents: (e.contents || []).map(x => ({ id: x.item.index, count: x.quantity })) };
}
const spells = load('Spells').map(s => ({ id: s.index, name: s.name, level: s.level, school: s.school?.name || '', classes: (s.classes || []).map(c => c.index), time: s.casting_time, range: s.range,
  comp: (s.components || []).join(', ') + (s.material ? ` (${s.material})` : ''), duration: s.duration, conc: !!s.concentration, ritual: !!s.ritual, attack: s.attack_type || '',
  save: s.dc?.dc_type ? ABIL(s.dc.dc_type) : '', damage: s.damage?.damage_at_slot_level || s.damage?.damage_at_character_level || null, damageType: s.damage?.damage_type?.name || '', desc: clean(s.description), higher: clean(s.higher_level) }));

const header = (what, src) => `/* SRD 5.2 ${what}. Generated by tools/hero-srd-convert.cjs from github.com/5e-bits/5e-database (${src}); do not edit by hand.\n   ${ATTRIBUTION} */\n`;
const outDir = path.join(__dirname, '../src/app');
const heroes = { attribution: ATTRIBUTION, species, backgrounds, feats, skills, mastery, classes, features, equipment };
fs.writeFileSync(path.join(outDir, 'srd-heroes.js'), header('character options', 'src/2024/en') + `(function (root) { root.QBHERO = ${JSON.stringify(heroes)}; })(globalThis);\n`);
fs.writeFileSync(path.join(outDir, 'srd-spells.js'), header('spells', 'src/2024/en/5e-SRD-Spells.json') + `(function (root) { root.QBSPELLS = ${JSON.stringify(spells)}; })(globalThis);\n`);
const size = f => Math.round(fs.statSync(path.join(outDir, f)).size / 1024) + ' KB';
console.log(`srd-heroes.js ${size('srd-heroes.js')}: ${species.length} species, ${backgrounds.length} backgrounds, ${feats.length} feats, ${skills.length} skills, ${classes.length} classes (${classes.map(c => c.levels.length).join('/')} levels), ${Object.keys(features).length} features, ${Object.keys(equipment).length} items`);
console.log(`srd-spells.js ${size('srd-spells.js')}: ${spells.length} spells`);
