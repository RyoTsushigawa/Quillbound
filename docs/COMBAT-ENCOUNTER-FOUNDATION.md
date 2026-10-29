# One combat foundation: from thugs to bosses

Every enemy uses the same HP, AC, turns, and fair dice rules. A basic thug with one attack has no extra setup.

When an enemy has several attacks in its normal turn (for example a boss's Multiattack), choose a hero for each attack. Each hero rolls their own defense against that attack, using their own AC. The attacks happen in the listed order; this does not grant additional actions. Cover or an opening applies to the first defense against the chosen hero and is used only once.

Likewise, a hero with Extra Attack can choose a different foe for each attack. Each attack resolves against that enemy's AC and HP. An entire Attack action can cause at most one enemy strike-back, including when the attacks target different enemies. A foe defeated by the damage from a graze cannot respond. Undo restores the exchange.

No new boss resource, phase, AI logic, or character-creator changes are introduced here. Non-damage enemy objectives, saving-throw spells, area effects, and boss special actions remain manual.

**Verification:** `node tools/encounter-foundation-check.cjs` tests individual thugs, a three-thug group, a split-target boss, defender-specific cover, split hero attacks, fallen foes, one retaliation per action, and Undo. Run `npm test` for full project regression.