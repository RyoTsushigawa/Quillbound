// Room-keyed books: overprinted text is read once, each numbered room is a location, and chapters about the book are references.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = f => import(pathToFileURL(path.join(__dirname, '..', 'src/importer', f)).href);

(async () => {
  const { dropOverprint } = await load('pdftext.js');
  const { readAdventure } = await load('reader.js');
  const item = (str, x, y, size = 10) => ({ str, x, y, w: str.length * 5, size });
  const kept = dropOverprint([item('Shadow', 50, 500, 18), item('Shadow', 50.5, 500.5, 18), item('Shadow', 50, 300, 18), item('the', 50, 100), item('the', 90, 100)]);
  assert.equal(kept.length, 4, 'only the copy drawn on top of another goes; the same word elsewhere stays');

  const line = (text, y, size = 10, font = 'Body') => ({ text, x: 50, y, w: Math.min(text.length * 5, 200), size, font, bold: size > 10, italic: false, leadBold: '' });
  const body = n => Array.from({ length: 8 }, (_, i) => `Room ${n} has plain test wording for the reader in sentence number ${i + 1} of this short note.`);
  const pages = [];
  const page = rows => { let y = 760; const n = pages.length + 1; pages.push({ n, width: 612, height: 792, images: 0, imageCover: 0, lines: rows.map(([t, s]) => { y -= s > 10 ? 26 : 13; return { ...line(t, y, s), page: n }; }) }); };
  page([['Running the Adventure', 18], ...body('setup').map(t => [t, 10]), ['The Old Mill', 18], ...body('mill').map(t => [t, 10])]);
  for (const [n, name] of [[1, 'Front Door'], [2, 'Grain Store'], [3, 'Wheel Room'], [4, 'Loft']]) page([[`${n} - ${name}`, 13], ...body(name).map(t => [t, 10])]);
  page([['Aftermath', 18], ...body('end').map(t => [t, 10])]);
  const r = readAdventure({ numPages: pages.length, meta: {}, pages });
  const places = r.beats.filter(b => !b.reference).map(b => b.title), notes = r.beats.filter(b => b.reference).map(b => b.title);
  assert.deepEqual(places, ['1. Front Door', '2. Grain Store', '3. Wheel Room', '4. Loft', 'Aftermath']);
  assert(notes.includes('Running the Adventure') && notes.includes('The Old Mill'), 'chapters about the book and the place as a whole stay to read');
  const room = r.beats.find(b => b.title === '2. Grain Store');
  assert(room.summary.includes('sentence number 8'), 'a room keeps its whole text');
  console.log('PASS: overprinted PDF text is read once; numbered rooms become locations with their whole text; setup chapters stay private references.');

  // A stat block whose wrapped lines look like headings still reaches its challenge rating and attacks.
  require('../src/app/attacks.js');
  const foePages = [];
  const foeLine = (text, y, x = 50, size = 10) => ({ text, x, y, w: text.length * 5, size, font: 'Body', bold: false, italic: false, leadBold: '', page: 1 });
  const foeBody = Array.from({ length: 24 }, (_, i) => foeLine(`Plain body wording for the test, sentence number ${i + 1} of a long and ordinary paragraph here.`, 760 - i * 12));
  const block = ['Medium undead, neutral evil', 'Armor Class 15', 'Hit Points 30 (5d8 + 8)', 'Speed 30 ft.', 'Languages understands its maker but', ['can\'t speak', 62], 'Challenge 3 (700 XP)', 'Multiattack. The test ghoul makes two claw attacks.', 'Claw. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.'];
  foePages.push({ n: 1, width: 612, height: 792, images: 0, imageCover: 0, lines: [...foeBody, { ...foeLine('Test Ghoul', 460), bold: true, size: 13 }, ...block.map((row, i) => Array.isArray(row) ? foeLine(row[0], 440 - i * 14, row[1]) : foeLine(row, 440 - i * 14))] });
  const foe = readAdventure({ numPages: 1, meta: {}, pages: foePages }).enemies.find(e => /ghoul/i.test(e.name));
  assert(foe, 'the stat block is found');
  assert.equal(foe.crNum, 3, 'the challenge rating after a wrapped line is read');

  // A Foundry module: rooms, read-aloud, fights by level, creature numbers and map ideas. All wording here is made up for the test.
  const { readModule, applyLevel, levelForParty } = await load('foundry.js');
  const mod = readModule({
    manifest: { title: 'Test Module' },
    journal: [
      { name: '1. Introduction', content: '<h1>Old Mill</h1><p>A test mill.</p><h5>Mill Hooks</h5><table><thead><tr><th>d2</th><th>Type</th><th>Details</th></tr></thead><tbody><tr><td>1</td><td>Fetch</td><td>Fetch the sack.</td></tr><tr><td>2</td><td>Find</td><td>Find the miller.</td></tr></tbody></table><h2>Level Selection</h2><table><thead><tr><th>Average Party Level</th><th>Recommended Adventure Version</th><th>Relative Difficulty</th></tr></thead><tbody><tr><td>5</td><td>5th-level</td><td>Hard</td></tr><tr><td>6</td><td>5th-level</td><td>Medium</td></tr><tr><td>8</td><td>8th-level</td><td>Hard</td></tr></tbody></table>' },
      { name: '2. Mill Rooms', content: '<h1>Mill Rooms</h1><h2>1 - Door</h2><blockquote><p>A &ldquo;creaking&rdquo; door.</p></blockquote><p>Plain note about @Item[Old Key].</p><p><strong><em>Encounter: Door Rats.</em></strong> Rats attack.</p><h5>Door Rats</h5><table><thead><tr><th>Adventure Level</th><th>Encounter</th></tr></thead><tbody><tr><td>5th</td><td>3 <strong>{Rat}</strong> led by a <strong>{Ghoul}</strong></td></tr><tr><td>8th</td><td>1 {Ghoul} with 99 hit points</td></tr></tbody></table><p><strong><em>Treasure: Old Coins.</em></strong> A few coins.</p><h2>2 - Bell Tower</h2><p>Cold and open.</p><h2>3 - Loft</h2><p><strong><em>Encounter: Sleeper.</em></strong> Each bed hides a {Ghoul}.</p>' },
      { name: '3. Aftermath', content: '<h1>Aftermath</h1><p>The end.</p>' },
      { name: '0. Handout', content: '' }
    ],
    actors: [
      { name: 'Rat', type: 'npc', data: { abilities: { str: { value: 8 }, dex: { value: 14 } }, attributes: { ac: { flat: 12 }, hp: { max: 5 } }, details: { cr: 0.25, type: { value: 'beast' } } }, items: [{ name: 'Bite', type: 'weapon', data: { actionType: 'mwak', ability: 'dex', damage: { parts: [['1d4 + @mod', 'piercing']] }, description: { value: '<p>Melee Weapon Attack: +4 to hit. Hit: 4 (1d4 + 2) piercing damage.</p>' } } }] },
      { name: 'Ghoul', type: 'npc', data: { abilities: { str: { value: 14 }, dex: { value: 14 } }, attributes: { ac: {}, hp: { max: 40 } }, details: { cr: 3, type: { value: 'undead' } } }, items: [{ name: 'Mail', type: 'equipment', data: { equipped: true, armor: { type: 'medium', value: 14 } } }, { name: 'Multiattack', type: 'feat', data: { activation: { type: 'action' }, description: { value: 'The ghoul makes two sword attacks or two bow attacks.' } } }, { name: 'Bow', type: 'weapon', data: { actionType: 'rwak', ability: 'dex', damage: { parts: [['1d8 + @mod', 'piercing']] }, description: { value: 'Ranged Weapon Attack: +4 to hit. Hit: 6 (1d8 + 2) piercing damage.' } } }, { name: 'Sword', type: 'weapon', data: { actionType: 'mwak', ability: 'str', damage: { parts: [['1d8', 'slashing']] }, description: { value: 'Melee Weapon Attack: +4 to hit. Hit: 6 (1d8 + 2) slashing damage, or 7 (1d10 + 2) with two hands.' } } }] }
    ],
    items: [{ name: 'Old Key', type: 'loot', data: { description: { value: '<p>A key.</p>' } } }]
  }, 'Test');
  assert.deepEqual(mod.beats.map(b => b.title), ['Introduction', '1. Door', '2. Bell Tower', '3. Loft', 'Aftermath'], 'empty pages go and rooms stay in order');
  assert.equal(mod.beats[0].reference, true, 'the introduction stays a private reference');
  assert.equal(mod.beats[4].reference, undefined, 'the ending is a scene');
  assert.deepEqual(mod.levels, [5, 8]);
  assert.equal(mod.hooks.length, 2); assert.equal(mod.hooks[0].title, 'Fetch');
  assert.equal(mod.beats[1].readAloud[0], 'A “creaking” door.');
  assert(mod.beats[1].summary.includes('> A “creaking” door.') && mod.beats[1].summary.includes('Old Key') && !mod.beats[1].summary.includes('@Item'), 'links read as plain words');
  assert(mod.beats[1].summary.includes('### Encounter: Door Rats'), 'an encounter gets its own section');
  assert(mod.beats[1].summary.includes('(level 5): 3 Rats led by a Ghoul') && !mod.beats[1].summary.includes('99'), 'only the chosen level shows');
  const ghoul = mod.enemies.find(e => e.name === 'Ghoul'), rat = mod.enemies.find(e => e.name === 'Rat');
  assert.equal(ghoul.acNum, 16, 'armor class comes from worn armor when the sheet gives none'); assert.equal(ghoul.crNum, 3); assert.equal(ghoul.tier, 'Elite');
  assert.equal(rat.acNum, 12); assert.equal(rat.attacks[0].damage, '1d4+2', '@mod becomes the ability modifier');
  assert.equal(ghoul.attacks[0].name, 'Sword', 'melee comes first'); assert.equal(ghoul.attacks[0].damage, '1d8+2', 'the written modifier fills a gap, and the two-handed option is not added');
  assert.deepEqual([...ghoul.turn], ['Sword', 'Sword'], '"two swords or two bows" is a choice');
  assert(ghoul.actions.some(a => a.name === 'Multiattack' && a.text.includes('two sword')), 'abilities keep their wording for the DM');
  for (const a of ghoul.attacks) for (const k of ['name', 'bonus', 'damage']) assert(a[k] !== undefined, 'attack keeps ' + k);
  assert.deepEqual(mod.fights.map(f => [f.where, f.foes.map(x => x.n + ' ' + x.name).join(', ')]), [['1. Door', '3 Rat, 1 Ghoul'], ['3. Loft', '1 Ghoul']]);
  assert.equal(mod.fights[1].askCount, true, 'prose without a number asks the DM');
  assert.equal(levelForParty(mod, 6).level, 5); assert.equal(levelForParty(mod, 6).difficulty, 'Medium'); assert.equal(levelForParty(mod, 8).level, 8); assert.equal(levelForParty(mod, 20).level, 8); assert.equal(levelForParty(mod, 3).level, 5);
  applyLevel(mod, 8);
  assert(mod.beats[1].summary.includes('(level 8): 1 Ghoul with 99 hit points'));
  assert.equal(mod.fights[0].foes[0].name, 'Ghoul (99 hit points)', 'a foe with its own hit points is its own creature');
  assert.equal(mod.enemies.find(e => e.name === 'Ghoul (99 hit points)').hpMax, 99); assert.equal(mod.enemies.find(e => e.name === 'Ghoul').hpMax, 40, 'the original keeps its numbers');
  assert.equal(mod.enemies.find(e => e.name === 'Rat').include, false, 'creatures this level does not use start unticked');
  applyLevel(mod, 5);
  assert.equal(mod.enemies.filter(e => e.variantOf).length, 0, 'going back removes the special copy');
  assert(mod.items.some(i => i.name === 'Old Coins' && i.where === '1. Door'), 'treasure is listed with its room');

  require('../src/app/scene-maps.js');
  const M = globalThis.SceneMaps, maps = ['mill_first-floor.jpg', 'mill_second-floor.jpg', 'mill_bell-tower.jpg', 'mill_cellars.jpg', 'mill_complete.jpg'].map(name => ({ name, path: name }));
  const rooms = [{ id: 'a', title: '1. Door', chapter: 'Mill Rooms' }, { id: 'b', title: '2. Bell Tower', chapter: 'Mill Rooms' }, { id: 'c', title: '3. Cellar Stair', chapter: 'Mill Rooms' }, { id: 'd', title: '4. Vat', chapter: 'Cellar Rooms' }, { id: 'e', title: 'Aftermath', chapter: 'Aftermath' }];
  const plan = M.suggestRooms(rooms, maps);
  assert.deepEqual(plan.a, { file: 0, sure: false }, 'a room nothing points at is only a guess');
  assert.deepEqual(plan.b, { file: 2, sure: true }, 'the room named like a map');
  assert.deepEqual(plan.c, { file: 0, sure: false }, 'one shared word in a room name is not enough');
  assert.deepEqual(plan.d, { file: 3, sure: true }, 'the chapter named like a map');
  assert.equal(plan.e, undefined, 'a scene that is not a room gets no map');
  assert.equal(M.mapTitle(maps[1], maps), 'Second Floor');
  assert.equal(rooms.some(r => r.playerMap), false, 'suggesting links nothing');
  // Sending again at another level moves untouched rooms and replaces the book's fights, and nothing else.
  const page = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const start = page.indexOf('const textMark='), stop = page.indexOf('function sendReaderResult(s,R){');
  const { textMark, moduleLevelChange } = new Function(page.slice(start, stop) + ';return { textMark, moduleLevelChange };')();
  const desk = { beats: [{ title: 'A', source: 'P', summary: 'level 5', moduleLevel: 5, moduleMark: textMark('level 5'), status: 'active', playerMap: { key: 'k' } }, { title: 'B', source: 'P', summary: 'mine', moduleLevel: 5, moduleMark: textMark('level 5') }, { title: 'C', source: 'Other', summary: 'other' }],
    encounters: [{ name: 'Fight', where: 'A', moduleLevel: 5 }, { name: 'Homemade', where: 'A' }] };
  const moved = moduleLevelChange(desk, { product: 'P', level: 8, beats: [{ title: 'A', summary: 'level 8' }, { title: 'B', summary: 'level 8' }, { title: 'C', summary: 'level 8' }], fightPlan: [{ name: 'Fight', where: 'A' }] }, () => true);
  assert.deepEqual(moved, { rooms: 1, edited: 1 });
  assert.equal(desk.beats[0].summary, 'level 8'); assert.equal(desk.beats[0].status, 'active', 'progress stays'); assert.equal(desk.beats[0].playerMap.key, 'k', 'the map link stays');
  assert.equal(desk.beats[1].summary, 'mine', 'an edited room is left alone'); assert.equal(desk.beats[2].summary, 'other', 'another adventure is left alone');
  assert.deepEqual(desk.encounters.map(e => e.name), ['Homemade'], "only the book's fight is replaced");
  console.log('PASS: Foundry modules give rooms, fights by level, creature numbers and map ideas; wrapped stat lines still reach the challenge rating.');
})().catch(e => { console.error(e); process.exit(1); });
