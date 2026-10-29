// The 2024 Player's Handbook backgrounds that aren't in the free rules (SRD 5.2), added beside the SRD ones.
// Abilities, origin feat, skills, tool and starting kit follow the book; the one-line descriptions are Quillbound's own.
(function (root) {
  const D = root.QBHERO; if (!D) return;
  const ARTISAN = ["Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools", "Cartographer's Tools", "Cobbler's Tools", "Cook's Utensils", "Glassblower's Tools",
    "Jeweler's Tools", "Leatherworker's Tools", "Mason's Tools", "Painter's Supplies", "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools"];
  const INSTRUMENT = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Horn', 'Lute', 'Lyre', 'Pan Flute', 'Shawm', 'Viol'];
  const GAMING = ['Dice', 'Dragonchess', 'Playing Cards', 'Three-Dragon Ante'];
  const item = (id, count = 1) => ({ id, name: D.equipment[id]?.name || id, count });
  // bg(id, name, abilities, [feat, note], skills, tools | {choose kind}, kit items, kit gold, extra kit text, description)
  const bg = (id, name, abilities, [feat, note], skills, tool, items, gp, other, desc) => {
    const choice = tool.choose ? { choose: 1, desc: `Choose one kind of ${tool.choose} (see "Equipment")`, from: tool.from } : null;
    const kitText = [...items.map(([i, n]) => (n > 1 ? n + ' ' : '') + (D.equipment[i]?.name || i)), ...other, gp + ' GP'].join(', ');
    return { id, name, abilities, feat: { id: feat, name: D.feats.find(f => f.id === feat)?.name || feat, note: note || '' }, skills, tools: choice ? [] : [tool], toolChoice: choice, source: 'phb-2024', desc,
      equipment: { desc: `Choose A or B: (A) ${kitText}; or (B) 50 GP`, choices: [{ items: items.map(([i, n]) => item(i, n || 1)), gp, other }, { items: [], gp: 50, other: [] }] } };
  };
  const BACKGROUNDS = [
    bg('artisan', 'Artisan', ['STR', 'DEX', 'INT'], ['crafter'], ['investigation', 'persuasion'], { choose: "Artisan's Tools", from: ARTISAN }, [['pouch', 2], ['clothes-travelers']], 32, ["Artisan's Tools (same as above)"], 'Raised in a workshop: you make things and know how to talk to customers.'),
    bg('charlatan', 'Charlatan', ['DEX', 'CON', 'CHA'], ['skilled'], ['deception', 'sleight-of-hand'], 'Forgery Kit', [['forgery-kit'], ['costume'], ['clothes-fine']], 15, [], 'A con artist of taverns and back rooms, selling comforting lies.'),
    bg('entertainer', 'Entertainer', ['STR', 'DEX', 'CHA'], ['musician'], ['acrobatics', 'performance'], { choose: 'Musical Instrument', from: INSTRUMENT }, [['costume', 2], ['mirror'], ['perfume'], ['clothes-travelers']], 11, ['Musical Instrument (same as above)'], 'Grew up with travelling fairs, performing for applause.'),
    bg('farmer', 'Farmer', ['STR', 'CON', 'WIS'], ['tough'], ['animal-handling', 'nature'], "Carpenter's Tools", [['sickle'], ['carpenters-tools'], ['healers-kit'], ['pot-iron'], ['shovel'], ['clothes-travelers']], 30, [], 'Years of field and herd made you patient and hardy.'),
    bg('guard', 'Guard', ['STR', 'INT', 'WIS'], ['alert'], ['athletics', 'perception'], { choose: 'Gaming Set', from: GAMING }, [['spear'], ['light-crossbow'], ['bolts', 20], ['quiver'], ['lantern-hooded'], ['manacles'], ['clothes-travelers']], 12, ['Gaming Set (same as above)'], 'You kept watch on a wall, one eye outside and one within.'),
    bg('guide', 'Guide', ['DEX', 'CON', 'WIS'], ['magic-initiate', 'Druid'], ['stealth', 'survival'], "Cartographer's Tools", [['shortbow'], ['arrows', 20], ['cartographer-tools'], ['bedroll'], ['quiver'], ['tent'], ['clothes-travelers']], 3, [], 'At home in the wilds, with a little druidic magic.'),
    bg('hermit', 'Hermit', ['CON', 'WIS', 'CHA'], ['healer'], ['medicine', 'religion'], 'Herbalism Kit', [['quarterstaff'], ['herbalism-kit'], ['book'], ['bedroll'], ['lamp'], ['oil', 3], ['clothes-travelers']], 16, [], 'Years of solitude spent tending herbs and pondering creation.'),
    bg('merchant', 'Merchant', ['CON', 'INT', 'CHA'], ['lucky'], ['animal-handling', 'persuasion'], "Navigator's Tools", [['navigators-tools'], ['pouch', 2], ['clothes-travelers']], 22, [], 'You drove caravans and struck deals from town to town.'),
    bg('noble', 'Noble', ['STR', 'INT', 'CHA'], ['skilled'], ['history', 'persuasion'], { choose: 'Gaming Set', from: GAMING }, [['clothes-fine'], ['perfume']], 29, ['Gaming Set (same as above)'], 'Born to privilege and schooled at court.'),
    bg('sailor', 'Sailor', ['STR', 'DEX', 'WIS'], ['tavern-brawler'], ['acrobatics', 'perception'], "Navigator's Tools", [['dagger'], ['navigators-tools'], ['rope'], ['clothes-travelers']], 20, [], 'A life on deck, in storms and in harbour taverns.'),
    bg('scribe', 'Scribe', ['DEX', 'INT', 'WIS'], ['skilled'], ['investigation', 'perception'], "Calligrapher's Supplies", [['calligraphers-supplies'], ['clothes-fine'], ['lamp'], ['oil', 3], ['parchment', 12]], 23, [], 'You copied texts in a scriptorium and notice every detail.'),
    bg('wayfarer', 'Wayfarer', ['DEX', 'WIS', 'CHA'], ['lucky'], ['insight', 'stealth'], "Thieves' Tools", [['dagger', 2], ['thieves-tools'], ['bedroll'], ['pouch'], ['clothes-travelers']], 16, ['Gaming Set (any)'], 'Grew up on the streets, poor but never without hope.')
  ];
  for (const b of BACKGROUNDS) if (!D.backgrounds.some(x => x.id === b.id)) D.backgrounds.push(b);
})(globalThis);
