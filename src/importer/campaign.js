// Campaign building: a compact "profile" per adventure (level range, themes, distinctive names)
// and a connection finder that links adventures through shared names, artifacts, themes and level fit.
// Offline and deterministic: it only suggests; the DM picks.

const THEMES = {
  undead: /\b(undead|zombies?|skeletons?|ghouls?|ghasts?|wights?|wraiths?|vampires?|lich|necromanc\w*|crypts?|tombs?|graveyard|corpses?|untot\w*)\b/gi,
  demons: /\b(demons?|devils?|fiends?|abyss\w*|infernal|hell\w*|dämon\w*)\b/gi,
  cult: /\b(cults?|cultists?|ritual\w*|sacrific\w*|kult\w*)\b/gi,
  sea: /\b(sea|ships?|sail\w*|pirates?|harbou?r|docks?|ocean|islands?|merfolk|tides?|meer|schiff\w*)\b/gi,
  wilds: /\b(forest|woods?|jungle|wilderness|swamp|druids?|beasts?|hunt\w*|wald)\b/gi,
  underground: /\b(caves?|caverns?|tunnels?|underdark|sewers?|mines?|warrens?|höhle\w*)\b/gi,
  city: /\b(city|cities|town|streets?|alleys?|tavern|guild|merchants?|nobles?|thieves|stadt|dorf)\b/gi,
  fey: /\b(fey|feywild|faeries?|pixies?|hags?|sprites?)\b/gi,
  eldritch: /\b(aberrations?|eldritch|tentacles?|madness|cosmic|stars?|moons?|void|mythos|wahnsinn)\b/gi,
  dragons: /\b(dragons?|wyrms?|wyrmlings?|kobolds?|drachen)\b/gi,
  carnival: /\b(carnival|circus|clowns?|jesters?|performers?|opera|theater|theatre|funhouse)\b/gi,
  cold: /\b(snow|ice|icy|frost|frozen|winter|blizzard|schnee)\b/gi,
  fire: /\b(fire|flames?|lava|volcan\w*|magma|forge|feuer)\b/gi,
  time: /\b(time travel|timeline|chronicle|temporal|past and future)\b/gi
};

// Capitalised words that are rules terms or sentence furniture, not story names.
const STOP = new Set(('The A An And Or But If When While As At In On Of To For From By With Without Into Onto This That These Those There Here Then Than Each Every Any Some ' +
  'All No Not One Two Three Four Five Six Seven Eight Nine Ten Once After Before During Until Unless Although Because Since Whether Where Who What Which How Why ' +
  'He She It They We You I His Her Its Their Our Your Him Them Me My Mr Mrs Ms Dr St ' +
  'DM GM PC PCs NPC NPCs DC AC HP XP CR GP SP CP Strength Dexterity Constitution Intelligence Wisdom Charisma Perception Stealth Insight Athletics Acrobatics Arcana ' +
  'History Investigation Medicine Nature Religion Deception Intimidation Performance Persuasion Survival Sleight Hand Animal Handling Armor Class Hit Points Speed ' +
  'Challenge Saving Throw Throws Skills Senses Languages Common Actions Action Reactions Reaction Legendary Lair Bonus Multiattack Melee Ranged Weapon Attack Spell ' +
  'Area Appendix Part Chapter Section Page Table Treasure Development Transition Combat Dramatic Question Encounter Encounters Map Maps Development Sidebar Note Notes ' +
  'Adventure Adventures Background Summary Synopsis Introduction Conclusion Aftermath Hooks Hook Appeal Reward Heroism Discovery Light Sound Smell Roll Result Detail ' +
  'Medium Small Large Huge Tiny Gargantuan Advantage Disadvantage Short Long Rest Level Levels Round Rounds Turn Initiative Damage Cantrips Cantrip Slots ' +
  'Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December ' +
  'Dungeon Dungeons Master Masters Guild Dragons Edition Fifth Wizards Coast Open Game License Content Product Identity Version Copyright Rights Reserved Inc LLC ' +
  'Der Die Das Und Ein Eine Wenn Sie Er Es Wir Ihr Investigatoren Spielleiter ' +
  'Abyssal Infernal Celestial Draconic Elvish Dwarvish Giant Gnomish Goblin Halfling Orc Primordial Sylvan Undercommon Deep Speech Thieves Cant ' +
  'Wondrous Item Items Character Characters Monster Monsters Manual Handbook Player Players Guide Tome Xanathar Volo Mordenkainen Tasha Everything ' +
  'Version Credits Art Artist Cover Layout Editor Cartography Design Designer Writing Writer Special Thanks Stock Publisher Choice Quality Games Studio ' +
  'Chest Priest Sword Mirror Door Room Hall Tower Temple Church Cave Spider Climb Innate Spellcasting Recharge Melee ' +
  'Charge Tactics Areas Beginning Hybrid Form Only Shapechanger Assassinate Trait Traits First Last Generator Generators Rumors Rumours Patron Villager Secrets Detail Details').split(/\s+/));
// Sentences that are credits, licences or tables of contents: names there aren't story names.
const BOILERPLATE = /^.{0,90}\s&\s|\bSTR DEX CON\b|armor class \d|hit points \d|saving throws|damage (?:immunities|resistances|vulnerabilities)|condition immunities|passive perception|challenge \d|@|©|https?:|www\.|\.com\b|stock art|cartograph|layout|illustrat|cover art|editor|playtest|open game|license|trademark|all rights|table of contents|\bby [A-Z]{3,}|(?:\b[A-Z]{3,}\b\s+){4}/i;

const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20 };
export function levelRange(text) {
  let t = (text || '').slice(0, 8000).replace(/\s+/g, ' ');
  // "fourth/fifth level" → "4/5 level"; "4 th through 8 level" (broken superscripts) is handled by the optional suffix
  t = t.replace(new RegExp(`\\b(${Object.keys(ORD).join('|')})\\b`, 'gi'), w => String(ORD[w.toLowerCase()]));
  const n = s => parseInt(s, 10);
  let m0 = t.match(/levels? (\d{1,2})\s*[-–]\s*(\d{1,2})\b/i);
  if (m0 && n(m0[1]) <= n(m0[2]) && n(m0[2]) <= 20) return { min: n(m0[1]), max: n(m0[2]), text: m0[0] };
  m0 = t.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:st|nd|rd|th)? level/i);
  if (m0) return { min: n(m0[1]), max: n(m0[2]), text: m0[0] };
  let m = t.match(/(\d{1,2})(?:st|nd|rd|th)?[\s-]*(?:to|through|–|-|or)\s*(\d{1,2})(?:st|nd|rd|th)?[\s-]*level/i);
  if (m && n(m[1]) <= n(m[2]) && n(m[2]) <= 20) return { min: n(m[1]), max: n(m[2]), text: m[0] };
  m = t.match(/characters? of (\d{1,2})(?:st|nd|rd|th)? (?:to|through|or) (\d{1,2})(?:st|nd|rd|th)? level/i);
  if (m) return { min: n(m[1]), max: n(m[2]), text: m[0] };
  m = t.match(/(\d{1,2})(?:st|nd|rd|th)[\s-]*level (?:characters|party|adventurers|heroes|pcs)/i) || t.match(/level[\s-]*(\d{1,2}) (?:characters|party|adventure)/i) || t.match(/stufe (\d{1,2})/i);
  if (m) return { min: n(m[1]), max: n(m[1]), text: m[0] };
  m = t.match(/\(APL\) of (\d{1,2})/i);
  if (m) return { min: n(m[1]), max: n(m[1]), text: m[0] };
  return null;
}

export function profileAdventure(r, rawText) {
  const text = (rawText.replace(/\s*\n\s*/g, ' \n').match(/[^.!?\n]+[.!?]?/g) || []).filter(s => !BOILERPLATE.test(s)).join(' ');
  const themes = {};
  for (const [k, re] of Object.entries(THEMES)) { const c = (text.match(re) || []).length; if (c) themes[k] = c; }
  // distinctive names: capitalised runs that don't start a sentence
  const names = new Map();
  const re = /(?<=[a-z,;:)”’"]\s+|\b(?:the|of|a|an)\s+)([A-ZÄÖÜ][a-zäöüß’']{2,}(?:[ -](?:of |the |von |de )?[A-ZÄÖÜ][a-zäöüß’']{2,}){0,3})/g;
  for (const m of text.matchAll(re)) {
    let name = m[1].replace(/[’']s$/, '');
    const words = name.split(/[ -]/);
    while (words.length && STOP.has(words[0])) words.shift();
    while (words.length && STOP.has(words[words.length - 1])) words.pop();
    if (!words.length || words.every(w => STOP.has(w) || /^(of|the|von|de)$/.test(w))) continue;
    name = words.join(' ');
    if (name.length < 4) continue;
    names.set(name, (names.get(name) || 0) + 1);
  }
  // keep a sentence of context for the names that matter
  const top = [...names].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 120);
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]/g) || [];
  const contexts = {};
  for (const [name] of top.slice(0, 80)) { const s = sentences.find(x => x.includes(name)); if (s) contexts[name] = s.trim().slice(0, 240); }
  // single mentions still count for cross-book links (e.g. "a vile artifact called a Whisperskull")
  const once = [...names].filter(([, c]) => c === 1).map(([n]) => n).slice(0, 400);
  for (const n of once) { const s = sentences.find(x => x.includes(n)); if (s) contexts[n] = contexts[n] || s.trim().slice(0, 240); }
  return {
    title: r.title, levels: levelRange(rawText), system: r.system, language: r.language, themes,
    names: Object.fromEntries([...top, ...once.map(n => [n, 1])]), contexts,
    npcs: r.npcs.map(n => n.name), villains: r.enemies.filter(e => e.tier === 'Boss' || e.npc).map(e => e.name.split(',')[0]),
    items: r.items.filter(i => !i.mention || i.rarity).map(i => i.name), hooks: r.hooks.map(h => h.title || h.text.slice(0, 80))
  };
}

const lower = s => s.toLowerCase();

// Links between adventures. Names that show up in many books are treated as generic (rules words, common monsters).
export function findConnections(profiles) {
  const df = new Map();
  for (const p of profiles) for (const n of Object.keys(p.names)) df.set(lower(n), (df.get(lower(n)) || 0) + 1);
  const generic = n => df.get(lower(n)) > Math.max(2, profiles.length * 0.25);
  const links = [];
  for (let i = 0; i < profiles.length; i++) for (let j = i + 1; j < profiles.length; j++) {
    const a = profiles[i], b = profiles[j];
    const bNames = new Map(Object.entries(b.names).map(([k, v]) => [lower(k), [k, v]]));
    for (const [n, ca] of Object.entries(a.names)) {
      const hit = bNames.get(lower(n));
      if (!hit || generic(n) || lower(n) === lower(a.title || '') || lower(n) === lower(b.title || '')) continue;
      const cb = hit[1];
      if (ca + cb < 3) continue; // one mention in each book is too thin
      // single words ("Jack") need to matter in both books
      if (!/\s/.test(n) && (n.length < 5 || Math.min(ca, cb) < 2) && !/[A-Z].*[A-Z]/.test(n.slice(1))) {
        const special = [a, b].some(x => x.items.some(v => lower(v).includes(lower(n))) || x.villains.some(v => lower(v) === lower(n)));
        if (!special || n.length < 6) continue;
      }
      const role = x => x.villains.some(v => lower(v) === lower(n) || lower(v).startsWith(lower(n) + ' ')) ? 'villain'
        : x.npcs.some(v => lower(v) === lower(n) || lower(v).split(' ').includes(lower(n))) ? 'npc'
        : x.items.some(v => lower(v) === lower(n) || (n.length >= 6 && lower(v).includes(lower(n)))) ? 'item' : 'name';
      const ra = role(a), rb = role(b);
      links.push({ a: i, b: j, type: [ra, rb].includes('item') ? 'artifact' : [ra, rb].includes('villain') ? 'villain' : [ra, rb].includes('npc') ? 'character' : 'name',
        name: n, strength: Math.min(ca, cb) + (ra !== 'name' || rb !== 'name' ? 3 : 0), ctxA: a.contexts[n] || '', ctxB: b.contexts[hit[0]] || '', countA: ca, countB: cb });
    }
    // shared themes (weighted by how strongly each book leans into them)
    const shared = Object.keys(a.themes).filter(t => b.themes[t] && a.themes[t] >= 8 && b.themes[t] >= 8);
    if (shared.length) links.push({ a: i, b: j, type: 'theme', name: shared.join(', '), strength: shared.length, themes: shared });
  }
  // for each pair keep the most specific name: "Tasha's Kiss" beats "Tasha" and "Kiss"; "Baron Henrik Rennet" beats "Henrik"
  const kept = links.filter(l => l.type === 'theme' || !links.some(o => o !== l && o.type !== 'theme' && o.a === l.a && o.b === l.b && o.name.length > l.name.length && lower(o.name).includes(lower(l.name))));
  kept.sort((x, y) => y.strength - x.strength);
  return kept;
}

// A suggested running order: by level, then keep strongly linked adventures next to each other.
export function suggestOrder(profiles, links) {
  const idx = profiles.map((p, i) => i);
  const lvl = i => profiles[i].levels ? profiles[i].levels.min + profiles[i].levels.max / 100 : 99;
  idx.sort((x, y) => lvl(x) - lvl(y));
  const gaps = [];
  for (let k = 1; k < idx.length; k++) {
    const p = profiles[idx[k - 1]].levels, q = profiles[idx[k]].levels;
    if (p && q && q.min - p.max > 1) gaps.push({ after: idx[k - 1], before: idx[k], from: p.max, to: q.min });
    if (p && q && q.max < p.min) gaps.push({ after: idx[k - 1], before: idx[k], from: p.max, to: q.min, backwards: true });
  }
  return { order: idx, gaps };
}

// Ways to tie two adventures together, built from what the link is.
export function bridgeIdeas(link, A, B) {
  const ideas = [];
  if (link.type === 'artifact') ideas.push(`Let the ${link.name} survive ${A.title}. Someone in ${B.title} wants it, which pulls the party there.`);
  if (link.type === 'villain') ideas.push(`Make ${link.name} the face behind both adventures: escaping at the end of ${A.title} sets up ${B.title}.`);
  if (link.type === 'character') ideas.push(`${link.name} appears in both. Introduce them in ${A.title} so the party already knows them in ${B.title}.`);
  if (link.type === 'name') ideas.push(`Both books mention ${link.name}. Turn it into a rumor in ${A.title} that ${B.title} pays off.`);
  if (link.type === 'theme') ideas.push(`Both deal with ${link.name}. One cause behind both (a cult, a curse, a faction) turns two one-shots into an arc.`);
  if (link.type === 'none') ideas.push(`End ${A.title} with a letter, map or rumor that points the party toward ${B.title}.`, `Let someone the party helped in ${A.title} ask for help again; their trouble is the start of ${B.title}.`);
  const villain = A.villains[0];
  if (villain) ideas.push(`Have ${villain} (from ${A.title}) send someone after the party during ${B.title}.`);
  const item = A.items.find(i => i.split(' ').length <= 4);
  if (item) ideas.push(`Leave a clue on ${item} that points to ${B.title}.`);
  return ideas.slice(0, 3);
}
