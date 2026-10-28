# Local playtest — 28 October 2026

Launch with Start Quillbound.cmd and use http://localhost:5173/. The old quillbound.html is an earlier standalone prototype; use this launcher for the updated tool.

**Stakes combat now uses hit points and stamina** instead of wound boxes (see RULES.md):
- Attacks roll against armor class, and a near miss of up to 5 is a graze for half damage. A graze or miss lets the target strike back.
- Heroes roll defense against the enemy's attack bonus, with exactly 5e's chances.
- Stamina pushes a roll by 1d4; when it runs out, a push costs a Hit Die.
- Enemies waver at 15–30% HP depending on how tough they are for the party, and groups waver when half of them are down.
- Heroes at 0 HP make death saves. Short and long rests are on the Combat tab between fights.
- Dramatic moments (Last Stand, Power Through) are retired.

**Older saves keep working.** A fight in progress converts when it opens: lost wounds become lost HP by share, and mobs become groups whose members have their stat-block HP. Heroes get current HP, Hit Dice, stamina and a starter attack. Enemies imported before this version have no attacks stored, so the app asks for their numbers once per creature (**Add numbers**).

Also included: layered passive-Perception clues, private plans, concealed enemies, encounter tools, non-damage enemy outcomes, contextual conditions, and Happy Jack reference imports.

Saves live in the browser at their original address. Work from localhost:5175 remains there; changing to localhost:5173 does not move or erase it. Use the same browser as before for Desktop saves. Supplied adventure content stays local.

A copy of the app from before this change is in backups/2026-10-28-before-hp.

Validation: `npm test` runs the combat engine, player privacy, UI, library and HP-data checks.
