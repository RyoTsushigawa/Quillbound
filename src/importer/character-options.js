// Source text is reference material, never executable rules or instructions.
const key = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const classes = /^(Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard)$/i;
export function readCharacterOptions(doc, source = '') {
  const options = [];
  let base = '', option = null, feature = null;
  for (const page of doc.pages) for (const line of page.lines) {
    const t = line.text.trim();
    if (/order #|^\d+\s*\||copyright|all rights reserved/i.test(t)) continue;
    if (line.bold && line.size >= 18 && classes.test(t)) { base = t; option = null; feature = null; continue; }
    if (option && line.bold && line.size >= 18) { base = ''; option = null; feature = null; continue; }
    if (base && line.bold && line.size >= 18 && t.length < 90) {
      option = { id: 'option-' + key(base + t), name: t, baseClass: base, type: 'subclass', source, page: page.n, description: '', features: [], include: true, automation: 'reference', review: 'Original third-party rules. Review timing, resources and 2024 compatibility with your DM.' };
      options.push(option); feature = null; continue;
    }
    if (!option) continue;
    if (line.bold && line.size >= 13 && line.size < 18 && t.length < 90) {
      feature = { name: t, text: '', page: page.n, level: null, automation: 'manual' };
      option.features.push(feature); continue;
    }
    if (feature) feature.text += (feature.text ? ' ' : '') + t;
    else option.description += (option.description ? ' ' : '') + t;
  }
  for (const o of options) for (const f of o.features) {
    const m = f.text.match(/(?:at |starting at |also at )?(\d{1,2})(?:st|nd|rd|th)?\s+level/i);
    f.level = m ? Number(m[1]) : null;
  }
  return options;
}
export function mergeCharacterOptions(target, incoming) {
  for (const o of incoming.filter(o => o.include !== false)) {
    const old = target.find(x => x.id === o.id);
    if (old) { old.sources = [...new Set([...(old.sources || [old.source]), o.source])]; continue; }
    target.push({ ...o, sources: [o.source] });
  }
  return target;
}
