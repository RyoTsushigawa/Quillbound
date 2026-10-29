// More backgrounds in the 2024 structure (three abilities, an origin feat, two skills, a tool, a kit worth about 50 GP):
// - playtest: Cultist, Gladiator and Pilgrim from the 2022 public playtest (via the 5.5 fan wiki). They named two abilities;
//   Quillbound adds a fitting third so +1/+1/+1 works as for every 2024 background.
// - classic: well-known backgrounds from the 2014 era that the 2024 rules dropped, converted by Quillbound with 2024 parts.
// - adventure: the three backgrounds of the Night Shift adventure "Die Sammlersache" (Quinn, Camilla, Toxik). Their ids stay
//   as they were when they were homebrew, so heroes already made with them keep working.
// Descriptions are Quillbound's own.
(function (root) {
  const D = root.QBHERO; if (!D) return;
  const INSTRUMENT = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Horn', 'Lute', 'Lyre', 'Pan Flute', 'Shawm', 'Viol'];
  const GAMING = ['Dice', 'Dragonchess', 'Playing Cards', 'Three-Dragon Ante'];
  const ARTISAN = ["Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools", "Cartographer's Tools", "Cobbler's Tools", "Cook's Utensils", "Glassblower's Tools",
    "Jeweler's Tools", "Leatherworker's Tools", "Mason's Tools", "Painter's Supplies", "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools"];
  const item = (id, count = 1) => ({ id, name: D.equipment[id]?.name || id, count });
  const bg = (source, id, name, abilities, [feat, note], skills, tool, items, gp, other, desc) => {
    const choice = tool.choose ? { choose: 1, desc: `Choose one kind of ${tool.choose} (see "Equipment")`, from: tool.from } : null;
    const kitText = [...items.map(([i, n]) => (n > 1 ? n + ' ' : '') + (D.equipment[i]?.name || i)), ...other, gp + ' GP'].join(', ');
    return { id, name, abilities, feat: { id: feat, name: D.feats.find(f => f.id === feat)?.name || feat, note: note || '' }, skills, tools: choice ? [] : [tool], toolChoice: choice, source, desc,
      equipment: { desc: `Choose A or B: (A) ${kitText}; or (B) 50 GP`, choices: [{ items: items.map(([i, n]) => item(i, n || 1)), gp, other }, { items: [], gp: 50, other: [] }] } };
  };
  const P = 'playtest', C = 'classic', A = 'adventure';
  const BACKGROUNDS = [
    // 2022 playtest (third ability added by Quillbound: Cultist WIS, Gladiator CON, Pilgrim CHA)
    bg(P, 'cultist', 'Cultist', ['INT', 'CHA', 'WIS'], ['magic-initiate', 'Warlock'], ['arcana', 'religion'], 'Disguise Kit', [['dagger'], ['disguise-kit'], ['bell'], ['lamp'], ['robe']], 19, ['Common Clothes'], 'Raised in the service of an otherworldly being, now hiding among unbelievers.'),
    bg(P, 'gladiator', 'Gladiator', ['STR', 'CHA', 'CON'], ['savage-attacker'], ['athletics', 'performance'], "Smith's Tools", [['javelin', 6], ['chain'], ['costume'], ['healers-kit'], ['smiths-tools'], ['clothes-travelers']], 15, [], 'A pit fighter who learned to win crowds as well as bouts.'),
    bg(P, 'pilgrim', 'Pilgrim', ['WIS', 'CON', 'CHA'], ['healer'], ['religion', 'survival'], { choose: 'Musical Instrument', from: INSTRUMENT }, [['bedroll'], ['healers-kit'], ['rations', 2], ['clothes-travelers']], 16, ['Holy Symbol', 'Musical Instrument (same as above)'], 'You walked a long road to a distant shrine and found more than you sought.'),
    // classic backgrounds, converted
    bg(C, 'folk-hero', 'Folk Hero', ['STR', 'CON', 'WIS'], ['tough'], ['animal-handling', 'survival'], { choose: "Artisan's Tools", from: ARTISAN }, [['shovel'], ['pot-iron'], ['clothes-travelers']], 40, ["Artisan's Tools (same as above)"], 'A commoner who stood up to a tyrant or a monster, and whom the village remembers.'),
    bg(C, 'outlander', 'Outlander', ['STR', 'DEX', 'WIS'], ['alert'], ['athletics', 'survival'], { choose: 'Musical Instrument', from: INSTRUMENT }, [['quarterstaff'], ['hunting-trap'], ['bedroll'], ['tent'], ['clothes-travelers']], 36, ['Musical Instrument (same as above)'], 'Raised far from towns, you read the land and never lose your way.'),
    bg(C, 'knight', 'Knight', ['STR', 'WIS', 'CHA'], ['savage-attacker'], ['athletics', 'persuasion'], { choose: 'Gaming Set', from: GAMING }, [['lance'], ['clothes-fine']], 25, ['Gaming Set (same as above)', 'Signet ring'], 'Sworn to a lord and an ideal, trained in arms and courtesy.'),
    bg(C, 'spy', 'Spy', ['DEX', 'INT', 'CHA'], ['alert'], ['deception', 'stealth'], "Thieves' Tools", [['thieves-tools'], ['crowbar'], ['clothes-fine']], 8, ['Dark common clothes with a hood'], 'You gathered secrets for someone powerful and still have contacts in the shadows.'),
    bg(C, 'haunted-one', 'Haunted One', ['CON', 'WIS', 'CHA'], ['alert'], ['investigation', 'religion'], 'Herbalism Kit', [['herbalism-kit'], ['crowbar'], ['candle', 5], ['clothes-travelers']], 38, ['Trinket of special significance'], 'Something terrible marked you; you hunt the darkness so it cannot hunt others.'),
    bg(C, 'far-traveler', 'Far Traveler', ['DEX', 'WIS', 'CHA'], ['skilled'], ['insight', 'perception'], { choose: 'Musical Instrument', from: INSTRUMENT }, [['clothes-travelers'], ['pouch']], 45, ['Musical Instrument (same as above)', 'Jewelry from your homeland'], 'You come from a distant land whose ways seem strange here.'),
    bg(C, 'clan-crafter', 'Clan Crafter', ['STR', 'CON', 'INT'], ['crafter'], ['history', 'insight'], { choose: "Artisan's Tools", from: ARTISAN }, [['clothes-travelers'], ['pouch']], 36, ["Artisan's Tools (same as above)", "Maker's mark chisel"], 'Trained in a great clan’s workshops; your work carries its mark.'),
    bg(C, 'courtier', 'Courtier', ['INT', 'WIS', 'CHA'], ['skilled'], ['insight', 'persuasion'], "Calligrapher's Supplies", [['calligraphers-supplies'], ['clothes-fine'], ['parchment', 10]], 24, [], 'You know the halls of power, their etiquette and their whispers.'),
    bg(C, 'investigator', 'Investigator', ['DEX', 'INT', 'WIS'], ['alert'], ['insight', 'investigation'], 'Disguise Kit', [['disguise-kit'], ['book']], 0, [], 'You follow evidence where others see only coincidence.'),
    bg(C, 'archaeologist', 'Archaeologist', ['STR', 'INT', 'WIS'], ['tough'], ['history', 'survival'], "Cartographer's Tools", [['cartographer-tools'], ['case-map-or-scroll'], ['lantern-bullseye'], ['shovel'], ['tent'], ['clothes-travelers']], 15, [], 'You dig up the past and know how ruins fall apart.'),
    bg(C, 'smuggler', 'Smuggler', ['DEX', 'CON', 'CHA'], ['tavern-brawler'], ['athletics', 'deception'], "Navigator's Tools", [['navigators-tools'], ['dagger'], ['rope'], ['clothes-travelers']], 18, [], 'Hidden holds, quiet coves and bribed harbor masters were your trade.'),
    // Die Sammlersache
    bg(A, 'hb-bg-sammler-quinn', 'Nachtbastlerin', ['DEX', 'CON', 'INT'], ['alert'], ['sleight-of-hand', 'stealth'], "Thieves' Tools", [['thieves-tools'], ['crowbar'], ['lantern-hooded'], ['grappling-hook'], ['clothes-travelers'], ['pouch']], 10, [], 'You fix, open and quietly borrow things after closing time, when nobody is watching the locks.'),
    bg(A, 'hb-bg-sammler-camilla', 'Hüterin der Zugabe', ['CHA', 'DEX', 'INT'], ['alert'], ['insight', 'persuasion'], 'Flute', [['flute'], ['costume'], ['clothes-fine'], ['perfume'], ['bell'], ['pouch']], 20, [], 'You kept the music going after the house lights went down, and you remember everyone who stayed for the encore.'),
    bg(A, 'hb-bg-sammler-toxic', 'Nachtingenieur', ['INT', 'DEX', 'CON'], ['alert'], ['stealth', 'animal-handling'], "Tinker's Tools", [['tinkers-tools'], ['pouch']], 0, [], 'You keep strange machines running through the night, and they tend to trust you more than people do.')
  ];
  for (const b of BACKGROUNDS) if (!D.backgrounds.some(x => x.id === b.id)) D.backgrounds.push(b);
})(globalThis);
