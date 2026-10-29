// The 2024 Player's Handbook species that isn't in the free rules (SRD 5.2): the Aasimar. Traits as in the book,
// each described in Quillbound's own words (text on the sheet; nothing here is calculated).
(function (root) {
  const D = root.QBHERO; if (!D) return;
  const AASIMAR = { id: 'aasimar', name: 'Aasimar', speed: 30, source: 'phb-2024', sub: [], desc: 'Mortals touched by the Upper Planes, with a healing touch and a radiant inner light.', traits: [
    { id: 'celestial-resistance', name: 'Celestial Resistance', desc: 'You have Resistance to Necrotic and Radiant damage.' },
    { id: 'darkvision-60', name: 'Darkvision (60 ft.)', desc: 'You have Darkvision with a range of 60 feet.' },
    { id: 'healing-hands', name: 'Healing Hands', desc: 'Once per long rest, as a Magic action, touch a creature and heal it by a number of d4s equal to your Proficiency Bonus.' },
    { id: 'light-bearer', name: 'Light Bearer', desc: 'You know the Light cantrip, cast with Charisma.' },
    { id: 'celestial-revelation', name: 'Celestial Revelation', desc: 'From level 3, once per long rest as a Bonus Action, transform for a minute: Heavenly Wings (fly at your Speed), Inner Radiance (shed light and burn nearby creatures each turn) or Necrotic Shroud (frighten nearby creatures). While transformed, once per turn one target takes extra Necrotic or Radiant damage equal to your Proficiency Bonus.' }
  ] };
  if (!D.species.some(s => s.id === AASIMAR.id)) D.species.push(AASIMAR);
})(globalThis);
