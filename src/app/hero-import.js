/* Hero importer: reads a character from another place and turns it into a Quillbound creator hero.
   Sources: PDF sheets (form fields, or text such as the Night Shift sheets, English or German), D&D Beyond character
   JSON, Foundry VTT (dnd5e) actor JSON. Each source becomes one plain description of the hero (`found`), and toBuild()
   maps that onto the creator's rules: scores land exactly on the sheet's, hit points through per-level rolls, gear as
   granted items. Whatever doesn't map is listed for the player and DM to check. Screens: src/ui/hero-import.js. */
(function (root) {
  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const ABIL_ALIAS = { STR: 'STR', ST: 'STR', STÄ: 'STR', DEX: 'DEX', GE: 'DEX', GES: 'DEX', CON: 'CON', KO: 'CON', KON: 'CON', INT: 'INT', IN: 'INT', WIS: 'WIS', WE: 'WIS', WEI: 'WIS', CHA: 'CHA', CH: 'CHA' };
  const ABIL_WORD = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
  const CLASS_DE = { barbar: 'barbarian', barbarin: 'barbarian', barde: 'bard', bardin: 'bard', kleriker: 'cleric', klerikerin: 'cleric', druide: 'druid', druidin: 'druid',
    kämpfer: 'fighter', kämpferin: 'fighter', krieger: 'fighter', kriegerin: 'fighter', mönch: 'monk', mönchin: 'monk', paladin: 'paladin', paladinin: 'paladin', waldläufer: 'ranger', waldläuferin: 'ranger',
    schurke: 'rogue', schurkin: 'rogue', zauberer: 'sorcerer', zauberin: 'sorcerer', hexenmeister: 'warlock', hexenmeisterin: 'warlock', magier: 'wizard', magierin: 'wizard' };
  const SPECIES_DE = { mensch: 'human', elf: 'elf', elfe: 'elf', elfin: 'elf', zwerg: 'dwarf', zwergin: 'dwarf', halbling: 'halfling', gnom: 'gnome', gnomin: 'gnome', drachenblütiger: 'dragonborn',
    drachenblütige: 'dragonborn', drachengeborener: 'dragonborn', tiefling: 'tiefling', ork: 'orc', orkin: 'orc', goliath: 'goliath' };
  const SKILL_DE = { akrobatik: 'acrobatics', 'mit tieren umgehen': 'animal-handling', 'arkane kunde': 'arcana', athletik: 'athletics', täuschen: 'deception', geschichte: 'history',
    menschenkenntnis: 'insight', einschüchtern: 'intimidation', nachforschungen: 'investigation', heilkunde: 'medicine', naturkunde: 'nature', wahrnehmung: 'perception',
    auftreten: 'performance', überreden: 'persuasion', religion: 'religion', fingerfertigkeit: 'sleight-of-hand', heimlichkeit: 'stealth', überleben: 'survival' };
  const GEAR_DE = { langbogen: 'longbow', kurzbogen: 'shortbow', dolch: 'dagger', rapier: 'rapier', langschwert: 'longsword', kurzschwert: 'shortsword', streitaxt: 'battleaxe', zweihänder: 'greatsword',
    zweihandschwert: 'greatsword', großaxt: 'greataxe', kampfstab: 'quarterstaff', speer: 'spear', streitkolben: 'mace', 'leichte armbrust': 'light crossbow', 'schwere armbrust': 'heavy crossbow',
    handarmbrust: 'hand crossbow', pfeile: 'arrows', bolzen: 'bolts', schild: 'shield', lederrüstung: 'leather armor', 'beschlagene lederrüstung': 'studded leather armor', kettenhemd: 'chain shirt',
    kettenpanzer: 'chain mail', schuppenpanzer: 'scale mail', brustplatte: 'breastplate', halbplatte: 'half plate armor', plattenpanzer: 'plate armor', diebeswerkzeug: "thieves' tools", tüftlerwerkzeug: "tinker's tools" };
  const ATTACK_DE = { krallen: 'claws', klauen: 'claws', biss: 'bite', vampirbiss: 'bite', faust: 'unarmed strike', 'waffenloser schlag': 'unarmed strike' };
  const SUBCLASS_DE = { dieb: 'thief', meisterdieb: 'thief', 'pfad des berserkers': 'path of the berserker', champion: 'champion', 'kolleg des wissens': 'college of lore' };
  const norm = s => String(s || '').toLowerCase().normalize('NFC').replace(/[’']/g, '').replace(/[^a-zäöüß0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const key = s => norm(s).replace(/ /g, '');
  const num = s => { const m = String(s ?? '').replace(/[−–]/g, '-').match(/[+-]?\d+/); return m ? +m[0] : null; };
  const mod = s => Math.floor((s - 10) / 2), profFor = l => 2 + Math.floor((Math.max(1, l) - 1) / 4);
  const blank = () => ({ name: '', species: '', cls: '', subclass: '', level: 1, background: '', abilities: {}, skills: {}, hp: null, ac: null, speed: null, gear: [], feats: [], spells: [], attacks: [], notes: [], source: '' });

  /* ---- PDF text ---- */
  // pdf.js text items → lines, top to bottom; pieces of one line are joined with " | " so columns stay apart.
  function linesFromTextContent(items) {
    const rows = new Map();
    for (const it of items) { if (!String(it.str || '').trim()) continue; const y = Math.round(it.transform[5]); (rows.get(y) || rows.set(y, []).get(y)).push({ x: it.transform[4], s: it.str }); }
    return [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, xs]) => xs.sort((a, b) => a.x - b.x).map(t => t.s.trim()).join(' | '));
  }
  const cells = line => line.split(' | ').map(s => s.trim()).filter(Boolean);
  // A line naming a class with a level ("Bardin 5 (College of Lore)", "Rogue 5 (Thief)"); data: the merged rules data.
  function classIn(text, data) {
    for (const part of String(text).split(/·|,|\/|\|/)) {
      const m = part.match(/([A-Za-zÄÖÜäöüß' -]+?)\s+(\d{1,2})(?:\s*\(([^)]+)\))?\s*$/); if (!m) continue;
      const id = classId(m[1], data); if (id) return { cls: id, level: +m[2], subclass: m[3] || '' };
    }
    return null;
  }
  function classId(name, data) { const k = key(name); return data.classes.find(c => key(c.name) === k || c.id === k)?.id || CLASS_DE[norm(name)] || null; }
  // Species by name: SRD and homebrew, German names, and near spellings ("Vampir" → Vampire).
  function speciesId(name, data) {
    const k = key(name); if (!k) return null;
    const exact = data.species.find(s => key(s.name) === k || s.id === k); if (exact) return exact.id;
    if (SPECIES_DE[norm(name)]) return SPECIES_DE[norm(name)];
    return data.species.find(s => { const n = key(s.name); return (n.startsWith(k) || k.startsWith(n)) && Math.abs(n.length - k.length) <= 2 && Math.min(n.length, k.length) >= 4; })?.id || null;
  }
  function skillId(name, data) { const n = norm(name); return data.skills.find(s => norm(s.name) === n || s.id === n.replace(/ /g, '-'))?.id || SKILL_DE[n] || null; }
  function fromText(lines, data) {
    const f = blank(); f.source = 'PDF (text)';
    const all = lines.join('\n');
    // the title line: "Species · Class N (Subclass) · Background"; the name is the line just above it
    const ti = lines.findIndex(l => classIn(l, data)); if (ti >= 0) {
      Object.assign(f, classIn(lines[ti], data));
      const parts = lines[ti].split('·').map(s => s.trim()), ci = parts.findIndex(p => classIn(p, data));
      for (const p of parts) { if (p === parts[ci]) continue; const sp = speciesId(p.replace(/,.*$/, ''), data); if (sp && !f.species) f.species = sp; else if (!f.background && parts.indexOf(p) > ci) f.background = p; }
      if (!f.species) { const sp = parts.map(p => speciesId(p.replace(/,.*$/, ''), data)).find(Boolean); if (sp) f.species = sp; }
      const above = lines.slice(Math.max(0, ti - 2), ti).reverse().find(l => cells(l).length === 1 && l.length <= 60 && !/night shift/i.test(l));
      if (above) { const n = above.replace(/\s*\|.*$/, '').trim(); f.name = n === n.toUpperCase() ? n.toLowerCase().replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase()) : n; }
    }
    // abilities: a line of six ability labels, then the modifier and score lines below it
    const ai = lines.findIndex(l => { const c = cells(l); return c.length >= 6 && c.slice(0, 6).every(x => ABIL_ALIAS[x.toUpperCase()]); });
    if (ai >= 0) { const labels = cells(lines[ai]).slice(0, 6).map(x => ABIL_ALIAS[x.toUpperCase()]);
      for (const l of lines.slice(ai + 1, ai + 4)) { const c = cells(l); if (c.length >= 6 && c.slice(0, 6).every(x => /^\d{1,2}$/.test(x))) { labels.forEach((k, i) => f.abilities[k] = +c[i]); break; } } }
    // AC, HP and speed: a line of labels and the values under them
    for (let i = 0; i < lines.length - 1; i++) { const lab = cells(lines[i]), val = cells(lines[i + 1]); if (lab.length < 2 || lab.length !== val.length) continue;
      lab.forEach((x, j) => { if (/^(rüstungsklasse|armor class|ac|rk)$/i.test(x)) f.ac = num(val[j]); if (/^(trefferpunkte|hit points|hp|tp|max hp)$/i.test(x)) f.hp = num(val[j]); if (/^(tempo|speed|bewegungsrate)$/i.test(x)) f.speed = /m\b/.test(val[j]) ? Math.round(num(val[j]) / 0.3) : num(val[j]); }); }
    // skills: "● Stealth | +9" (filled mark = trained), "○ Arcana | +4"
    for (const l of lines) { const m = l.match(/^([●■☒✓✔◉○□☐◯])\s*(.+?)\s*\|\s*([+−–-]?\d+)/); if (!m) continue; const id = skillId(m[2], data); if (id) f.skills[id] = { prof: !/[○□☐◯]/.test(m[1]), bonus: num(m[3]) }; }
    // attacks (for comparison): "Name +7 1W6+4 …" / "Name +7 1d6+4"
    for (const l of lines) { const m = l.match(/^([A-ZÄÖÜa-zäöüß][\wäöüß' -]{1,40}?)\s+([+−-]\d+)\s+(\d+[wWdD]\d+(?:\s*[+−-]\s*\d+)?)/); if (m) f.attacks.push({ name: m[1].trim(), bonus: num(m[2]), damage: m[3].replace(/[wW]/, 'd').replace(/\s/g, '').replace('−', '-') }); }
    // spells: names after "Zauber:", "Spells:", "Cantrips:", "Prepared:" (and the bullet lines that continue them)
    const spellLines = []; lines.forEach((l, i) => { if (/^\W*(zauber|spells|cantrips|zaubertricks|prepared|vorbereitet)\b\s*:/i.test(l)) { spellLines.push(l); for (const n of lines.slice(i + 1, i + 4)) { if (/^•/.test(n) && !/:\s/.test(n.slice(0, 30))) spellLines.push(n); else break; } } });
    f.spellText = spellLines.join(' ');
    // equipment line(s) for granted gear
    const gi = lines.findIndex(l => /^(ausrüstung|equipment)\b/i.test(l)); if (gi >= 0) f.gearText = lines.slice(gi + 1, gi + 5).filter(l => !/^[●■☒✓✔◉○□☐◯]/.test(l) && !/^[A-ZÄÖÜ &/]{6,}$/.test(l)).slice(0, 2).join(', ');
    f.notes.push(...lines.filter(l => /^•/.test(l)).map(l => l.replace(/^•\s*/, '')).slice(0, 20));
    if (!f.name) f.name = (all.match(/^[^\n]{2,40}$/m) || [''])[0];
    return f;
  }
  // Fillable PDFs (the official sheet, D&D Beyond's PDF export): fields by name, compared loosely ("Race " = "race").
  function fromFields(fields, data) {
    const f = blank(); f.source = 'PDF (form)';
    const val = {}; for (const [n, arr] of Object.entries(fields || {})) { const v = (Array.isArray(arr) ? arr : [arr]).map(x => x?.value).find(x => x !== undefined && x !== '' && x !== 'Off'); if (v !== undefined) val[key(n)] = String(v); }
    const get = (...names) => { for (const n of names) if (val[key(n)] !== undefined) return val[key(n)]; return ''; };
    f.name = get('CharacterName', 'Character Name', 'Name');
    const cl = get('ClassLevel', 'Class Level', 'CLASS  LEVEL', 'Class'); const c = classIn(cl.replace(/\s*\/.*$/, ''), data) || classIn(cl, data); if (c) Object.assign(f, c);
    f.species = speciesId(get('Race', 'Species', 'RACE', 'Race '), data) || ''; f.background = get('Background', 'BACKGROUND');
    for (const k of ABIL) { const v = num(get(k, k + 'score', { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' }[k])); if (v && v <= 30) f.abilities[k] = v; }
    f.ac = num(get('AC', 'ArmorClass', 'Armor Class')); f.hp = num(get('HPMax', 'MaxHP', 'HP Max', 'Hit Point Maximum')); f.speed = num(get('Speed'));
    for (const s of data.skills) { const raw = get(s.name, s.name.replace(/ /g, ''), s.name.split(' ')[0], s.id === 'sleight-of-hand' ? 'SleightofHand' : '', s.id === 'animal-handling' ? 'Animal' : ''); const b = num(raw); if (b !== null) f.skills[s.id] = { bonus: b }; }
    for (let i = 1; i <= 6; i++) { const n = get(i === 1 ? 'Wpn Name' : `Wpn Name ${i}`, `Wpn${i} Name`); if (n) f.attacks.push({ name: n, bonus: num(get(`Wpn${i} AtkBonus`, `Wpn${i} AtkBonus `, `Wpn${i}AtkBonus`)), damage: (get(`Wpn${i} Damage`, `Wpn${i} Damage `).match(/\d+d\d+(?:\s*[+-]\s*\d+)?/) || [''])[0].replace(/\s/g, '') }); }
    f.gearText = get('Equipment', 'Inventory'); f.spellText = Object.entries(val).filter(([k]) => /spell/.test(k)).map(([, v]) => v).join(', ');
    return f;
  }

  /* ---- JSON: D&D Beyond and Foundry VTT ---- */
  function fromDdb(json, data) {
    const d = json?.data || json; const f = blank(); f.source = 'D&D Beyond';
    f.name = d.name || ''; f.species = speciesId(d.race?.baseRaceName || d.race?.baseName || d.race?.fullName || d.species?.name, data) || '';
    const main = (d.classes || []).slice().sort((a, b) => (b.isStartingClass ? 1 : 0) - (a.isStartingClass ? 1 : 0))[0];
    if (main) { f.cls = classId(main.definition?.name, data) || ''; f.level = (d.classes || []).reduce((n, c) => n + (c.level || 0), 0) || main.level || 1; f.subclass = main.subclassDefinition?.name || ''; if ((d.classes || []).length > 1) f.notes.push('Multiclass on D&D Beyond: Quillbound uses the starting class only.'); }
    f.background = d.background?.definition?.name || '';
    const mods = Object.values(d.modifiers || {}).flat();
    const ids = { 1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA' };
    for (const s of d.stats || []) { const k = ids[s.id]; if (!k) continue; const over = (d.overrideStats || []).find(x => x.id === s.id)?.value; const bonus = (d.bonusStats || []).find(x => x.id === s.id)?.value || 0;
      f.abilities[k] = over || (s.value + bonus + mods.filter(m => m.type === 'bonus' && m.subType === Object.keys(ABIL_WORD)[s.id - 1] + '-score').reduce((n, m) => n + (m.value || 0), 0)); }
    for (const m of mods) { if (m.type === 'proficiency' || m.type === 'expertise') { const id = skillId(String(m.subType || '').replace(/-/g, ' '), data); if (id) f.skills[id] = { prof: true, expert: m.type === 'expertise' || f.skills[id]?.expert }; } }
    const con = mod(f.abilities.CON || 10);
    f.hp = d.overrideHitPoints || ((d.baseHitPoints || 0) + con * f.level + (d.bonusHitPoints || 0)) || null;
    for (const it of d.inventory || []) { const n = it.definition?.name; if (n) f.gear.push({ name: n, count: it.quantity || 1, equipped: !!it.equipped }); }
    f.feats = (d.feats || []).map(x => x.definition?.name).filter(Boolean);
    f.spells = [...(d.classSpells || []).flatMap(c => c.spells || []), ...Object.values(d.spells || {}).flat()].map(s => s?.definition?.name).filter(Boolean);
    return f;
  }
  const FOUNDRY_SKILL = { acr: 'acrobatics', ani: 'animal-handling', arc: 'arcana', ath: 'athletics', dec: 'deception', his: 'history', ins: 'insight', itm: 'intimidation', inv: 'investigation',
    med: 'medicine', nat: 'nature', prc: 'perception', prf: 'performance', per: 'persuasion', rel: 'religion', slt: 'sleight-of-hand', ste: 'stealth', sur: 'survival' };
  function fromFoundry(json, data) {
    const a = json, s = a.system || a.data || {}, items = a.items || [], f = blank(); f.source = 'Foundry VTT';
    f.name = a.name || ''; for (const k of ABIL) { const v = s.abilities?.[k.toLowerCase()]?.value; if (v) f.abilities[k] = v; }
    const classes = items.filter(i => i.type === 'class'); const main = classes.slice().sort((x, y) => ((y.system || y.data)?.levels || 0) - ((x.system || x.data)?.levels || 0))[0];
    if (main) { f.cls = classId(main.name, data) || ''; f.level = classes.reduce((n, c) => n + ((c.system || c.data)?.levels || 0), 0) || 1; if (classes.length > 1) f.notes.push('Multiclass in Foundry: Quillbound uses the main class only.'); }
    f.subclass = items.find(i => i.type === 'subclass')?.name || (main?.system || main?.data)?.subclass || '';
    f.species = speciesId(items.find(i => i.type === 'race' || i.type === 'species')?.name || s.details?.race, data) || '';
    f.background = items.find(i => i.type === 'background')?.name || s.details?.background || '';
    for (const [k, v] of Object.entries(s.skills || {})) { const id = FOUNDRY_SKILL[k]; if (id && v?.value >= 1) f.skills[id] = { prof: true, expert: v.value >= 2 }; }
    f.hp = s.attributes?.hp?.max || null; f.ac = s.attributes?.ac?.flat || s.attributes?.ac?.value || null; f.speed = s.attributes?.movement?.walk || null;
    for (const i of items) { const sy = i.system || i.data || {};
      if (['weapon', 'equipment', 'consumable', 'tool', 'loot', 'container'].includes(i.type)) f.gear.push({ name: i.name, count: sy.quantity || 1, equipped: !!sy.equipped });
      if (i.type === 'feat' && /feat/i.test(sy.type?.value || '')) f.feats.push(i.name);
      if (i.type === 'spell') f.spells.push(i.name); }
    return f;
  }
  // What kind of JSON is this? (Quillbound hero files are handled by src/app/campaigns.js.)
  function fromJson(text, data) {
    let j; try { j = JSON.parse(text); } catch { return { error: 'This file isn’t readable JSON.' }; }
    if (j?.format === 'quillbound-hero') return { quillbound: true };
    if ((j?.data || j)?.stats && ((j?.data || j)?.classes || (j?.data || j)?.race)) return { found: fromDdb(j, data) };
    if (j?.type === 'character' && (j.system || j.data) && Array.isArray(j.items)) return { found: fromFoundry(j, data) };
    return { error: 'This JSON isn’t a D&D Beyond character, a Foundry VTT actor or a Quillbound hero.' };
  }

  /* ---- mapping onto the creator ---- */
  // R: QBHeroRules; spells: the SRD spell list (optional). Returns { build, check: [notes], compare: [{what, sheet, ours}] }.
  const sheet0 = (b, R) => R.derive(b).spellcasting;
  function toBuild(f, R, spells) {
    const data = R.data(), check = [...f.notes.filter(n => /Multiclass/.test(n))];
    if (!f.cls) return { error: 'The class wasn’t found on this sheet, so the hero can’t be built. Choose it in the creator instead.' };
    const level = Math.max(1, Math.min(20, f.level || 1));
    const species = f.species || 'human'; if (!f.species) check.push('No species found: Human was chosen; change it in the creator.');
    const b = R.quickBuild(f.cls, f.name || 'Hero', level, { species }); b.name = (f.name || 'Hero').slice(0, 80);
    // background by name; otherwise one that raises the hero's best abilities
    const bgName = key(f.background), bg = data.backgrounds.find(x => key(x.name) === bgName) || null;
    const best = Object.entries(f.abilities).sort((x, y) => y[1] - x[1]).map(([k]) => k);
    const trainedOnSheet = id => { const v = f.skills[id]; if (!v) return false; if (v.prof || v.expert) return true; const ab = data.skills.find(s => s.id === id)?.ability; return v.bonus != null && f.abilities[ab] && v.bonus - mod(f.abilities[ab]) >= profFor(level); };
    const fit = x => 3 * (x.skills || []).filter(trainedOnSheet).length + x.abilities.filter(k => best.slice(0, 3).includes(k)).length;
    const pickBg = bg || data.backgrounds.slice().sort((x, y) => fit(y) - fit(x))[0];
    if (!bg) check.push(f.background ? `Background “${f.background}” isn’t in Quillbound: ${pickBg.name} was chosen.` : `No background found: ${pickBg.name} was chosen.`);
    b.background = pickBg.id;
    // abilities: set the base so that background increases and improvements land exactly on the sheet's scores
    if (ABIL.every(k => f.abilities[k])) {
      const F = f.abilities, rank = pickBg.abilities.slice().sort((x, y) => F[y] - F[x]);
      b.boost = { [rank[0]]: 2, [rank[1]]: 1 };
      const plus = Object.fromEntries(ABIL.map(k => [k, b.boost[k] || 0]));
      b.asi = {};
      for (const lv of R.asiLevels(b)) { const k = ABIL.slice().sort((x, y) => (F[y] - plus[y]) - (F[x] - plus[x]))[0]; if (F[k] - plus[k] - 2 >= 8) { b.asi[lv] = { feat: 'ability-score-improvement', plus: { [k]: 2 } }; plus[k] += 2; } else b.asi[lv] = { feat: 'ability-score-improvement', plus: {} }; }
      b.abilities = { method: 'set', base: Object.fromEntries(ABIL.map(k => [k, Math.max(3, Math.min(20, F[k] - plus[k]))])) };
      for (const lv of Object.keys(b.asi)) if (!Object.keys(b.asi[lv].plus).length) check.push(`Level ${lv}: the sheet shows no extra ability increase here; choose a feat or improvement in the creator.`);
    } else check.push('Ability scores weren’t all found: Quick build’s scores were used.');
    // skills: background skills come with it; the class's choices are the sheet's trained skills from the class list
    const c = data.classes.find(x => x.id === f.cls), sheetProf = profFor(level), skillAb = id => data.skills.find(s => s.id === id)?.ability;
    // a bonus tells training: ability modifier + proficiency (+ proficiency again for expertise)
    for (const [id, v] of Object.entries(f.skills)) { if (v.bonus === undefined || v.bonus === null || !f.abilities[skillAb(id)]) continue; const extra = v.bonus - mod(f.abilities[skillAb(id)]);
      if (extra >= 2 * sheetProf) Object.assign(v, { prof: true, expert: true }); else if (extra >= sheetProf) v.prof = true; else if (v.prof === undefined) v.prof = false; }
    const profSkills = Object.entries(f.skills).filter(([, v]) => v.prof).map(([k]) => k), expertSkills = Object.entries(f.skills).filter(([, v]) => v.expert).map(([k]) => k);
    if (profSkills.length) {
      const fromBg = pickBg.skills || [], choose = c.skillChoice?.choose || 2, pool = (c.skillChoice?.from || []).length ? c.skillChoice.from : data.skills.map(s => s.id);
      b.skills = profSkills.filter(k => !fromBg.includes(k) && pool.includes(k)).slice(0, choose);
      const left = profSkills.filter(k => !fromBg.includes(k) && !b.skills.includes(k));
      if (b.cls === 'bard' && level >= 3) b.featPicks = { ...(b.featPicks || {}), lore: left.splice(0, 3) };
      if (b.speciesSkill !== undefined && left.length && data.species.find(s => s.id === b.species)?.traits.some(t => t.id === 'skillful')) b.speciesSkill = left.shift();
      if (left.length) b.featPicks = { ...(b.featPicks || {}), skilled: left.splice(0, 3) };
      b.expertise = expertSkills.slice(0, R.expertiseCount(b) || 0);
    }
    // gear: matched by name, granted (the starting kits are taken as gold so nothing is counted twice)
    const gearNames = [...f.gear.map(g => g.name), ...String(f.gearText || '').split(/[,;]/)].map(s => s.trim()).filter(Boolean), found = [], missed = [];
    for (const raw of gearNames) { const n = GEAR_DE[norm(raw)] || raw, k = key(n).replace(/s$/, ''); const id = Object.keys(data.equipment).find(e => { const en = key(data.equipment[e].name); return en === k || en === k + 's' || en.replace(/armor$/, '') === k; }); if (id) found.push(id); else missed.push(raw); }
    if (found.length) { b.gear = { cls: 1, bg: 1, extra: [...new Set(found)].map(id => ({ id, count: 1, how: 'grant' })) }; delete b.equip; }
    if (missed.length) check.push(`Gear not in Quillbound’s list (add it as notes or ask the DM): ${missed.slice(0, 12).join(', ')}${missed.length > 12 ? ' …' : ''}.`);
    // weapons the sheet attacks with but the class isn't trained in: the DM granted the training (as Camilla's longbow)
    for (const a of f.attacks) { const n = norm(GEAR_DE[norm(a.name)] || a.name), id = Object.keys(data.equipment).find(e => data.equipment[e].kind === 'weapon' && norm(data.equipment[e].name) === n);
      if (id && !R.proficientWith(b, id)) { b.training = [...new Set([...(b.training || []), id])]; if (!(b.gear?.extra || []).some(x => x.id === id)) b.gear = { cls: 1, bg: 1, ...(b.gear || {}), extra: [...(b.gear?.extra || []), { id, count: 1, how: 'grant' }] };
        check.push(`${data.equipment[id].name}: the sheet attacks with it, but the class isn’t trained in it; recorded as training granted by the DM.`); } }
    R.fillDefaults(b);
    // spells by name (SRD only)
    if (spells && !(f.spells.length || f.spellText) && sheet0(b, R)) check.push('The sheet lists no spells: Quick build’s picks are used; choose them in the creator.');
    if (spells && (f.spells.length || f.spellText)) {
      const names = f.spells.length ? f.spells.map(norm) : null, text = norm(f.spellText || ''), picked = spells.filter(s => names ? names.includes(norm(s.name)) : new RegExp(`(^| )${norm(s.name)}( |$)`).test(text));
      if (picked.length) b.spells = { cantrips: picked.filter(s => !s.level).map(s => s.id), prepared: picked.filter(s => s.level).map(s => s.id) };
      if (!picked.length) check.push('No spells from the free rules were found on the sheet: Quick build’s picks are used; choose them in the creator.');
      const want = names || []; const miss = want.filter(n => !spells.some(s => norm(s.name) === n)); if (miss.length) check.push(`Spells not in the free rules: ${miss.join(', ')}.`);
    }
    // hit points: per-level rolls chosen so the total matches the sheet
    let sheet = R.derive(b);
    if (f.hp && level > 1 && f.hp !== sheet.hp.max) {
      const die = c.hitDie || 8, avg = die / 2 + 1; let diff = f.hp - sheet.hp.max; const rolls = {};
      for (let lv = 2; lv <= level; lv++) { const share = Math.round(diff / (level - lv + 1)), r = Math.max(1, Math.min(die, avg + share)); rolls[lv] = r; diff -= r - avg; }
      b.hp = { method: 'roll', rolls }; sheet = R.derive(b);
    }
    // armor: when the sheet gives AC but the gear names no armor, grant the armor (and shield) that gives exactly that AC
    if (f.ac && sheet.ac !== f.ac && !(b.gear?.extra || []).some(x => ['armor', 'shield'].includes(data.equipment[x.id]?.kind))) {
      const order = { light: 0, medium: 1, heavy: 2 }, armors = Object.keys(data.equipment).filter(id => data.equipment[id].kind === 'armor' && R.proficientWith(b, id)).sort((x, y) => (order[data.equipment[x].group] ?? 3) - (order[data.equipment[y].group] ?? 3));
      const base = b.gear || { cls: 1, bg: 1, extra: [] }, tries = [...armors.map(a => [a]), ...armors.map(a => [a, 'shield'])];
      for (const ids of tries) { const t2 = { ...b, gear: { ...base, cls: 1, bg: 1, extra: [...(base.extra || []), ...ids.map(id => ({ id, count: 1, how: 'grant' }))] } }; delete t2.equip;
        if (R.derive(t2).ac === f.ac) { Object.assign(b, { gear: t2.gear }); delete b.equip; sheet = R.derive(b); check.push(`No armor named on the sheet: ${ids.map(id => data.equipment[id].name).join(' and ')} gives its AC ${f.ac}, so it was added. Change it in the creator if the hero wears something else.`); break; } }
    }
    // what differs from the sheet
    const compare = [];
    const row = (what, theirs, ours) => { if (theirs === null || theirs === undefined || theirs === '') return; compare.push({ what, sheet: theirs, ours, same: String(theirs) === String(ours) }); };
    row('Hit points', f.hp, sheet.hp.max); row('Armor class', f.ac, sheet.ac);
    for (const k of ABIL) row(k, f.abilities[k], sheet.scores[k]);
    for (const [id, v] of Object.entries(f.skills)) if (v.bonus !== undefined && v.bonus !== null) row(sheet.skills[id]?.name || id, (v.bonus >= 0 ? '+' : '') + v.bonus, (sheet.skills[id].bonus >= 0 ? '+' : '') + sheet.skills[id].bonus);
      else if (v.prof && !sheet.skills[id]?.prof) compare.push({ what: sheet.skills[id]?.name || id, sheet: 'trained', ours: 'not trained', same: false });
    for (const a of f.attacks) { const an = key(ATTACK_DE[norm(a.name)] || a.name), ours = sheet.attacks.find(x => key(x.name) === an || key(x.name) === key(GEAR_DE[norm(a.name)] || '')) || sheet.attacks.find(x => x.bonus === a.bonus && key(x.damage).startsWith(key(a.damage))); compare.push({ what: a.name + (ours && key(ours.name) !== key(a.name) ? ` (${ours.name})` : ''), sheet: `${a.bonus >= 0 ? '+' : ''}${a.bonus} ${a.damage}`, ours: ours ? `${ours.bonus >= 0 ? '+' : ''}${ours.bonus} ${ours.damage}` : 'not on the Quillbound sheet', same: !!ours && ours.bonus === a.bonus && key(ours.damage).startsWith(key(a.damage)) }); }
    if (b.cls === 'bard' && level >= 2 && compare.some(x => !x.same && /^[+-]/.test(x.sheet))) check.push('Bards add half their proficiency bonus to skills they aren’t trained in (Jack of All Trades). Skills that are 1 higher here than on the sheet come from that.');
    const subName = SUBCLASS_DE[norm(f.subclass)] || f.subclass;
    if (subName && sheet.subclass && key(subName) !== key(sheet.subclass)) check.push(`Subclass “${f.subclass}” isn’t in Quillbound yet: ${sheet.subclass} is used for now.`);
    for (const n of f.feats) if (!data.feats.some(x => key(x.name) === key(n))) check.push(`Feat “${n}” isn’t in Quillbound.`);
    return { build: b, sheet, check, compare, notes: f.notes, source: f.source };
  }

  root.QBHeroImport = { linesFromTextContent, fromText, fromFields, fromDdb, fromFoundry, fromJson, toBuild, speciesId, classId, skillId };
})(globalThis);
