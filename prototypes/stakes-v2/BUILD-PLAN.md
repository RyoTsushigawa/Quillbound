# Build plan: HP + stamina Stakes in the app

This plan implements [RULESET.md](RULESET.md). Nothing has been edited yet.

## Where the wound rules live today

| Place | What depends on wounds |
|---|---|
| `src/app/combat-rules.js` (the one engine, about 300 lines) | `capacity`, `active`, `hurt`, `adjust`, `syncHero` (4 wound boxes as `conds`), one roll per action with fixed bands (`grade`), Defend absorbs a wound, a natural 20 gives an extra wound, dramatic moments (`eligible`, `moment`, `chance`), breaking at a wound count |
| `index.html` (combat UI, about 25 spots) | wound tracks on tokens, the composer, the consequence menu ("take one wound"), dramatic-moment settings, foe setup (`slots`, `breakAt`, minion mobs) |
| `src/app/encounter-design.js` | `groupMinions` builds mobs as boxes |
| `src/app/player-core.js` | the player screen shows wound counts |
| `src/app/conditions.js` | guide text for Defiant and Second wind (the dramatic moments) |
| `src/importer/reader.js`, `library-session.js`, `index.html:432` | enemies get `tier`/`slots`/`breakAt`; HP and AC are kept as text, and attacks are not stored |
| Checks: `combat-check`, `drama-check`, `clarity-check`, `player-check` | they test the wound rules |

**What heroes have and lack:**
- They already have `hp` (max), `ac`, `level`, `prof`, `abil` and `cls`.
- They have no current HP, Hit Dice, stamina or weapon.
- The example heroes have `hp: 0`.

**Unused file:** `src/app/redesign-ui.js` is not loaded anywhere; its content was inlined into `index.html`. It can go to `docs/archive` during the build.

## Gaps RULESET.md doesn't cover: proposed defaults

These come up as soon as the engine changes. Each default is my suggestion; any of them can change.

| Gap | Today | Proposed default |
|---|---|---|
| **Defend** | absorbs the next wound | The protected hero gets an **opening** (roll twice, keep the higher) on their next defense roll. This works like Help, and like 5e's Dodge seen from the hero's side. |
| **Natural 20 on an attack** | extra wound | It doubles the damage dice, as in 5e. Non-attack natural 20s keep today's reward menu (opening / protect / better ground). |
| **Who rolls damage** | — | Players roll their own physical dice and type the total; a "Roll for me" button uses fair dice. Enemy damage is rolled by the app from the stat block, and the DM can override it. |
| **Hero weapons** | none | The character creator gives each class a starter attack (Fighter greatsword 2d6, Rogue rapier 1d8 + Sneak Attack, Wizard Fire Bolt 1d10, and so on), editable on the sheet. Attacks per action follow the level (Extra Attack at 5). |
| **Improvise "deal a wound"** | 1 wound | It becomes "deal damage", entered like an attack. |
| **Rests** | none | Party buttons: **Short rest** (spend Hit Dice to heal) and **Long rest** (full HP, all Hit Dice back as in the 2024 rules, stamina refilled). |
| **Dropping to 0 HP** | out of the fight | Status **Dying**, with 5e death saves (three successes or failures, rolled with fair dice). Healing brings the hero back. |

## Build order

Each step ends with `npm test` passing. A step that changes the app also ends with re-reading the changed files and republishing the Quillbound link (never `samples/`).

0. **Safety net.** The folder isn't a git repository. I suggest `git init` with a first commit of today's state, so the whole change can be compared and reverted. This needs your OK.
1. **Data.**
   - **Enemies:**
     - Keep numeric `hp`, numeric `ac` and parsed attacks (`[{name, bonus, damage}]`); the prototype's `extract.mjs` already has the parser.
     - This applies to the reader, the library session, the paste parser in `index.html` and the bestiary.
     - `slots`, `tier` and `breakAt` stay readable in old saves but are no longer used.
   - **Heroes:**
     - Add `hpNow`, `hitDice` (count and die from the class), `stamina` and an `attacks` entry.
     - The example heroes get real HP from `hpFor`.
     - Older saves get these fields when they load.
2. **Engine** (`combat-rules.js`, save version 3):
   - **Combat:**
     - HP in place of wounds.
     - Attacks against AC with the 5-point graze, one d20 per attack in an action.
     - Defense: d20 + AC − 10 must beat 11 + the attack bonus, once per enemy attack.
     - A strike-back on every graze or miss; when the target can't reach, the DM picks Exposed or the stated risk instead.
   - **Stamina:** the +1d4 push (fair d4 by rejection sampling, like the d20) and overexert with a Hit Die.
   - **Breaking points:** 15–30% by CR compared with the average party level; groups break at half down; "Wavering" status.
   - **Removed:** dramatic moments, `chance()` and the drama settings.
   - **Kept:** Defend and natural 20s as in the gap table, plus short and long rests and death saves.
   - **Saves:** a version-2 fight converts by proportion and logs it; Undo stops at the conversion.
   - Undo covers everything new.
3. **Combat UI** (`index.html`):
   - **Tokens:** HP bars on all of them; mobs as one card ("Drow ×6") with a bar per member.
   - **Composer:** a die per attack, damage entry or "Roll for me", and a **Push +1d4** button showing stamina (or "Overexert: spend a Hit Die" when Winded).
   - **Enemy move:** the defense roll per attack, and the strike-back shown in the result.
   - **Breaking:** a Wavering badge when an enemy reaches its breaking point, with the existing flee / surrender / deal / fight-on dialog.
   - **Party:** Short rest and Long rest buttons.
   - **Removed:** the dramatic-moment settings.
   - Beginner wording follows PROJECT-RULES: plain language and the next step shown.
4. **Enemies without HP.**
   - **SRD 5.1 monster list:** bundled as a local data file, matched by name. The book's stat block always wins.
     - It is licensed CC-BY 4.0; I'd add the attribution line to the About text.
     - Getting the file means downloading it (e.g. from the 5e SRD project on GitHub), so **I'll ask you before downloading**, with the exact source and size.
   - **Combat cards:** attack lines are read from the cards.
   - **No match:** the DM is asked for HP when the fight starts, with a suggestion from the CR.
5. **Player screen** (`player-core.js`):
   - Heroes show exact HP, stamina and Hit Dice.
   - Enemies show a state only: Fresh, Hurt, Bloodied, Wavering or Down.
   - The allowlist test makes sure enemy numbers never reach the snapshot.
6. **Checks.**
   - **Rewritten:** `combat-check`, for the new resolution, push, overexert, strike-back, breaking, Undo and save conversion.
   - **Replaced:** `drama-check` is archived with the dramatic moments, and a new `stamina-check` covers stamina, rests and death saves.
   - **Fairness:** the d4 and d20 are proven uniform.
   - **Rules match:** a new check uses the engine's own functions to compare hit, graze and avoid chances against the prototype's exact odds, so the app plays as simulated.
   - **Updated:** `player-check` and `clarity-check`.
7. **Documentation.**
   - `RULES.md` gets a rewritten combat section, which becomes the single rules doc for HP + stamina.
   - The wound rules move to `docs/archive`.
   - `RELEASE-NOTES.md` explains the change and the save conversion.
   - The Defiant and Second wind guide text is removed from `conditions.js`.
8. **Publish.** Run the full tests, read every changed file once more, and republish the Quillbound link. Then check the deployed app in the browser.

## Next after this build: hero creation

The user wants a detour into hero creation once this build is done (noted 2026-10-28). Three things from this build overlap with it:
- the starter attacks per class
- Hit Dice
- the HP numbers (`hpFor`)

Step 1 keeps those minimal and editable, so the hero-creation work can redesign them freely.

## What I need from you before starting

1. OK or changes on the seven defaults in the gap table.
2. OK for `git init` with a baseline commit (step 0).
3. The SRD download is asked for later, when step 4 starts.
