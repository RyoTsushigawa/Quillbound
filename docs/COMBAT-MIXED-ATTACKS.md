# Mixed attacks in a single Attack action

**Status:** Combat implementation in this branch; does not change the hero creator or homebrew editor.

A hero created in Quillbound has a list of attacks calculated from its character sheet. In combat, the first attack (highest expected damage per action) is selected by default.

When the hero has multiple available attacks, the DM can choose the attack for each roll before rolling. For example, a level-5 Artificer can use Lightning Launcher for the first roll and an equipped sword for the second. Each roll uses that attack's own bonus and damage expression.

- The **first selected attack** determines how many rolls the action allows. Choosing a one-roll spell does not grant weapon Extra Attack.
- Later rolls may choose only attacks with the **same permitted action count**. They cannot mix a cantrip into a weapon's Extra Attack action.
- All attacks still use **one target** in this version.
- No extra rolls or strike-backs are generated: the first eligible graze/miss against a standing target can trigger **at most one strike-back per Attack action**.
- Damage is rolled automatically and can be edited or rerolled before confirming. Push, critical hits and Undo follow the existing Stakes rules.
- Unrecognized attack names never create new attacks; the engine falls back to the hero's first valid attack.

**Not yet automated:** Once-per-turn extra damage (for example, Toxic's +1d6 Lightning Launcher rider), Sneak Attack eligibility, mixed targets, spell-slot use, saving-throw spells, and custom reactions. The DM resolves these manually until separately implemented and tested.

**Validation:** `node tools/mixed-attack-check.cjs` (also part of `npm test`). Tests cover different bonuses and damage, roll counts, invalid selections, one strike-back, and Undo.