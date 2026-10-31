# Quillbound rules

How the app behaves today. Your project rules (no AI pictures or voices, fair dice, usable without AI) are in [PROJECT-RULES.md](PROJECT-RULES.md).

Words used in the app: **Scenes** are the parts of an adventure, **Leads** are clues, rumours and requests the party can follow, **People** are the characters the party meets, and **Fights** are prepared battles. A fight is run on the **Combat** tab with the **Stakes** rules below.

## Dice

- Every die is fair. Each face of a d20 has exactly a 5% chance, and the same goes for the d4 of a push, damage dice, Hit Dice and death saves. The on-screen dice use the browser's secure random numbers with rejection sampling. Nothing is weighted and no result is scripted.
- You can always type in the results of physical dice instead: one d20 per attack, in order (for example `14 9`), and damage as a number.
- A natural 20 and a natural 1 count no matter what the bonus is.
- **Opening** is normal advantage: roll two fair d20s and keep the higher. At the table, enter both like `3/17`.
- All player dice, including defense rolls, appear on the player screen as soon as they are rolled. Cancelling or undoing an outcome does not erase that roll. The app keeps the latest 20 player rolls; the player screen shows the latest 8.
- The **DM secret roll** is separate. It never reaches the player screen.

## Hero creator

The **Create a hero** tab builds 2024 (SRD 5.2) heroes from level 1 to 20.

**Layout**
- **Left: guided steps.** Species, Class & level, Abilities, Background, Skills, Spells (spellcasters only), Equipment, Story and Review.
  - Each step shows how many choices are still open, or a ✓ when it's done. Abilities, Skills, Spells and Equipment stay unmarked until a class is chosen, because they depend on it.
  - **Add to party** (DM) or **Save to My heroes** (player) stays disabled until nothing is open and the hero has a name.
- **Right: the live sheet,** recalculated on every click. Its tabs are Summary, Combat, Skills, Spells, Features and Gear.
  - At phone width it becomes a closed "View sheet" bar at the bottom showing HP, AC and the open choices; tapping it opens the sheet as a drawer, and "Hide sheet" closes it.
  - Rules text from the game data (traits, feats, features, spells) shows its bold labels, line breaks and small tables as formatted text.

**Editing a saved hero:** My heroes → Edit restores the background ability increases and every level's feat/Ability Score Improvement selections before recalculating the sheet. This also applies to hero files received from another player. Simply opening or navigating a saved hero must not clear those choices; saving an edit keeps the same hero ID.

**Choices**
- **Quick build:** choose a class card and press it, and every remaining choice is filled with a recommended default you can change.
  - It keeps a species you already picked.
  - Spells are filled once the spell list has loaded.
- **Ability scores,** four ways:
  - Set values (3–20).
  - Standard array (15, 14, 13, 12, 10, 8), placed where the class needs them, then click two abilities to swap.
  - Point buy (27 points, 8–15).
  - Roll 4d6 drop the lowest, with fair dice. The dice are kept with the hero and can't be rolled again.
- **Background increases:** the background raises two of its three abilities by +2 and +1, or all three by +1. Scores can't go above 20.
- **Hit points after level 1:** the average (die ÷ 2 + 1 + Constitution) or a fair roll per level. Rolls are kept.
- **Feats:** all 75 feats of the 2024 rules outside the playtest (10 origin, 10 Fighting Style, 43 general from level 4, 12 Epic Boons from level 19). The 17 in the SRD carry their rules text; the other 58 (`src/app/phb-feats.js`) carry their name, prerequisites and ability increase as in the 2024 Player's Handbook and a short summary in Quillbound's own words, so check the book for the exact wording. Prerequisites are enforced. Tough (+2 HP per level), Boon of Fortitude (+40 HP), Resilient (saving throw proficiency in the raised ability), Lightly, Moderately and Heavily Armored and Martial Weapon Training change the sheet; the rest are text.
- **Backgrounds:** 33. The SRD's 4; the Player's Handbook's 12 (`src/app/phb-backgrounds.js`); Cultist, Gladiator and Pilgrim from the 2022 public playtest, which named two abilities, so Quillbound adds a fitting third; and 11 classic backgrounds the 2024 rules dropped, converted by Quillbound with 2024 parts (Folk Hero, Outlander, Knight, Spy, Haunted One, Far Traveler, Clan Crafter, Courtier, Investigator, Archaeologist, Smuggler; `src/app/extra-backgrounds.js`); and the three of the Night Shift adventure Die Sammlersache: Nachtbastlerin (DEX/CON/INT, Alert, Sleight of Hand and Stealth, Thieves’ Tools), Hüterin der Zugabe (CHA/DEX/INT, Alert, Insight and Persuasion, Flute) and Nachtingenieur (INT/DEX/CON, Alert, Stealth and Animal Handling, Tinker’s Tools), each with a kit worth about 50 GP. They keep the ids they had as homebrew, so heroes made with them still work. Each card shows its source. All follow the 2024 structure (three abilities, an origin feat, two skills, a tool, a kit or 50 GP); descriptions are Quillbound's own. A background's tool of choice is chosen on the Background step; Quick build takes the first. Changing the background drops expertise in skills the hero no longer has.
- **Subclasses:** from level 3, the SRD one, three from the Player's Handbook and 29 fan-made conversions of older subclasses from the 5.5 fan wiki (`src/app/fan-subclasses.js`; marked "fan-made" in the menu) (`src/app/phb-subclasses.js`: names and feature levels as in the book, each feature summarised in Quillbound's own words). The Class step offers them; a hero without a choice keeps the SRD subclass. Calculated: Eldritch Knight and Arcane Trickster cast Wizard spells with Intelligence (third-caster slots, cantrips and prepared spells, so the Spells step appears); College of Valor gains martial weapons, medium armor and shields at 3 and Extra Attack at 6; College of Swords medium armor and scimitars at 3 and Extra Attack at 6; the Forge and Order Domains heavy armor at 3. Other subclass features are text on the sheet. The hero importer matches subclass names ("Glamour", "College of Glamour").
- **Species:** the 9 SRD species and the Player's Handbook's Aasimar (`src/app/phb-species.js`, traits summarised as text).
- **Spells:** 390: the SRD's 339 plus 51 from the 2024 Player's Handbook beyond the free rules (18 entered from memory and confirmed against the book by the DM; Shadow Blade left out as a Xanathar's Guide spell). A spell tagged "check the book" in the spell list hasn't been confirmed yet; none is at present (`src/app/phb-spells.js`: level, school, classes, casting time, range, components, duration, attack or save and damage as in the book; descriptions summarised). They load with the spell list. Attack cantrips among them (Toll the Dead, Mind Sliver, Thorn Whip) appear as attacks and scale at levels 5, 11 and 17.
- **Levels 4, 8, 12, 16** (and the Fighter's and Rogue's extra levels): an Ability Score Improvement or a feat. **Level 19:** an Epic Boon. A feat that raises an ability by 1 (Grappler: Strength or Dexterity; Epic Boons: any ability) asks which one.
- **Feat choices** have two toggles: **Only recommended feats** narrows the menu to Ability Score Improvement and feats whose +1 can raise one of the class's main abilities (marked ★), and **Show future feats** lists the feats the hero can't take yet with what's missing (an ability score, another feat, a class, spellcasting). Homebrew feats only appear once the hero meets their prerequisites.
- **Other choices,** each counted on its step: fighting styles, expertise, weapon masteries, the Skilled and Versatile feats, cantrips and prepared spells.

**Equipment.** You take the class's and the background's starting kit.
- **More gear:** buy anything from the SRD equipment list with the kits' gold (ammunition by the bundle). The step shows the gold left, and spending more is flagged. Items the DM gives are added free as "granted by the DM".
- **Training granted by the DM:** armor, shield or weapon kinds, or a single weapon (for example a bard with a longbow). This is a house rule, and it shows on the sheet as one.
- By default the hero wears the best armor and shield they are trained in and wields every weapon they own. You can change both.
- **Tools:** tool proficiencies from the class and background are listed on the Skills tab.
- The sheet works out armor class, including Unarmored Defense and the Defense style.
- It also works out attacks: finesse, proficiency, Archery, Extra Attack, Sneak Attack, Martial Arts and attack cantrips.
- **Sneak Attack** is its own attack line right after each finesse or ranged weapon ("Shortsword + Sneak Attack"), because it needs Advantage or an ally next to the target and works once per turn. The plain line comes first and is the default in combat; pick the Sneak Attack line when it applies. Homebrew class and subclass comparisons measure each hero by its strongest line, Sneak Attack included.

**In combat,** a hero made here fights with the strongest attack on its sheet (highest average damage per action). It also uses the sheet's HP, AC and Hit Dice, and stamina equal to its proficiency bonus.

**What isn't included yet:**
- Heroes made before this creator keep their simple starter attack. A "Rebuild in the new creator" button for them comes later.
- Homebrew species, backgrounds and classes come later too.

**Character sheet (print / PDF):** the creator's last step and the DM desk's Character sheets show a two-page sheet: abilities, saves, skills (proficiency and expertise marked), attacks, AC, HP, speed, initiative, passive Perception, boxes for stamina, Hit Dice and death saves, equipment and tools, the Quillbound table rules, spells with slots, every feature and feat (summarised), and lines for notes. A switch shows it in German or English (rules text from the data stays English). **Print / save as PDF** opens the browser's print dialog; choose "Save as PDF" for a file. Heroes made before the hero creator have no sheet until they're rebuilt there.

### Homebrew

The **Homebrew** tab builds your own backgrounds, species, classes, subclasses and feats; the DM approves what players may use.

**Built-in table homebrew:** The Night Shift's Vampire species and Artificer class ship with the app (`src/app/table-homebrew.js`). The first time a browser opens Quillbound they are added, approved, unless that browser already has homebrew with the same name. After that they behave like your own: you can edit, unapprove or delete them, and they don't come back. When the app ships a newer version of one (the Artificer was updated to the 2025 rules), it replaces the earlier shipped copy and keeps its approval; homebrew of your own is never replaced.

**Players' homebrew:** players have the Homebrew tab too ("My homebrew"), with the same editors and checks, but they can't approve anything. **Send to DM** saves an idea as a homebrew file; the DM imports it under Homebrew → Import, where it arrives unapproved and marked "From a player". The creator's Species, Class and Background steps have **Make your own …** links (and "a subclass" for the chosen class, and "a feat") that open the matching editor.

**Publishing to the table:** **Publish to the table…** (DM) saves everything the DM approved as `table.json`. Put it in the repository's `homebrew/` folder (on GitHub: Add file → Upload files, or send it to Claude). Every browser that opens the site then adds it by itself, approved, and players can use it in the creator. A newer published version replaces the copy a browser got from the table; whatever the DM takes off the table and publishes again leaves every browser that got it from there. A player who deletes a published item keeps it deleted. Heroes keep their own copies throughout. Without accounts a player could edit a file they import, but that only changes their own browser: the DM still sees, in each hero file, exactly which homebrew a hero uses.

**Species** have a base (Small or Medium, speed 25–35 ft, creature type) and traits from building blocks. Each block has a weight:

| Weight | Building blocks |
|---|---|
| +1 | darkvision 60 ft; resistance to a damage type; advantage on saves against a condition; a skill (fixed or player's choice); +5 ft speed; a climb speed; a cantrip; a spell once per long rest from level 3 or 5; a natural weapon; a small trait |
| +2 | darkvision 120 ft; an origin feat of the player's choice; +1 HP per level; limited flight; a damaging or powerful action; once per long rest dropping to 1 HP instead of 0 |
| +1 to +3 | a custom trait (the DM rates it) |
| −1 to −3 | a drawback |

- **Calibration:** the weights put all 9 SRD species between 4 (Human) and 8 (Elf). A homebrew species is "within the SRD range" at 4–8.
- **Natural weapons** become attacks on the sheet, and so in combat. A hero is always trained with them; finesse ones may use Dexterity, and Sneak Attack applies to finesse ones.
- **Fixed skills** count as trained. "A skill of the player's choice" and "an origin feat" work like the Human's Skillful and Versatile.

**Classes** are built from parts the rules already know:
- **Base:** a hit die (d6–d12), one or two primary abilities, two saving throws, 2–4 skill choices from a list, armor, weapon and tool training, and a kit worth 50–155 GP (the range of the SRD class kits).
- **Spellcasting:** none, or half, full or pact casting. Slots and prepared spells follow the Paladin, Wizard or Warlock table. You choose the casting ability, which SRD class's spell list it uses, and how many cantrips it starts with, gaining one more at levels 4 and 10 (like the Cleric or Wizard) or at 10 and 14 (like the 2025 Artificer).
- **Progression:**
  - Extra Attack at level 5
  - Fighting Style, Weapon Mastery, Sneak Attack (1d6 per two levels from the level you choose) and a Martial Arts die
  - Unarmored Defense (10 + DEX + an ability you choose)
  - Expertise at chosen levels
  - Class attacks from a level, such as a launcher that uses INT (bonus = ability + proficiency, damage = dice + ability)
- **Fixed parts:** every class gets Ability Score Improvements at 4, 8, 12 and 16 and an Epic Boon at 19. You add its own features by level.
- **Subclass:** chosen at level 3, with a name, a summary, its own features, and training and tools it grants at level 3 (for example heavy armor and Smith's Tools).
- **The SRD range:** the screen derives a Quick build hero of the class at levels 1, 5, 11 and 17 and compares its HP, AC and average damage per action with all 12 SRD classes. A class is "within the SRD range" unless its HP or damage is more than 10% above the strongest SRD class, or its AC is above the highest SRD AC, at any of those levels.
- **Test in fights…** runs 150 Stakes fights at level 5 for parties of four identical heroes (yours, Fighter, Rogue, Wizard) against a pack of CR level/4 monsters, a pair of CR level/2 and one tough enemy of CR level. It reports rounds, how often a hero drops, and how often the party is wiped. Healing, stamina and breaking points are left out, so it compares classes rather than tactics.

**Subclasses** for the existing classes (SRD and Player's Handbook):
- **Features at the class's own levels:** a subclass needs at least one feature at each level that class's subclasses gain them (Fighter 3, 7, 10, 15, 18; Cleric 3, 6, 17; Rogue 3, 9, 13, 17 …) and none at other levels. Features are written in your own words; the sheet shows them.
- **Calculated parts:** medium armor, heavy armor, shield or martial weapon training at level 3; tools at level 3; Extra Attack at level 5 or 6; +1 HP per level from level 3 (like Draconic Resilience); and, for a class without spells (Barbarian, Fighter, Monk, Rogue), spellcasting of its own like the Eldritch Knight (2 cantrips, a third of a Wizard's slots, a chosen ability and spell list).
- **Compared with the class's subclasses:** the class's Quick build hero is derived with each of its subclasses (SRD, Player's Handbook, fan-made) and with yours at levels 3, 5, 11 and 17. Yours is "within the class's range" unless its HP or damage per action is more than 10% above the strongest of them, its AC or spell slots are above theirs, or it has more features than any of them. So +1 HP per level fits a Sorcerer but not a Fighter, and Extra Attack on a Rogue (which doubles Sneak Attack) is flagged. Written features aren't measured; the panel lists what the other subclasses get at each level to compare.
- Approved homebrew subclasses join their class in the creator's subclass menu ("· homebrew").

**Feats** are written by you; Quillbound checks their structure, enforces their prerequisites and scores their power, but doesn't calculate what they do.
- **Kind sets the level,** as in the 2024 rules: origin and Fighting Style feats at level 1, every general feat at level 4 ("Level 4+"), every Epic Boon at level 19. Each appears in the creator wherever a feat of that kind is chosen.
- **The +1:** in the 2024 rules every general feat and Epic Boon also raises an ability by 1, and origin and Fighting Style feats don't. You tick which abilities the player may choose from; the creator then asks, as for Grappler.
- **Prerequisites the creator enforces:** an ability score of 13 (usual) to 17 (stricter), counted from before the level the feat is taken; the Spellcasting or Pact Magic feature; another feat taken earlier; or a class. Anything else (a class feature, a spell) is free text the sheet shows. A hero only sees feats they qualify for.
- **Chains:** a feat may need a feat that needs a feat, but no longer than three.
- **Design tips** from the D&D Wiki feat design guides appear while you write (the "I am a …" naming test, conditional rather than flat bonuses, no prerequisite on the ability the feat raises, about the worth of a +2 increase). They never block approval.
- **Power score:** under **What it gives** you list the feat's benefits as building blocks, each with a weight: a tool ¼; a skill, a sense, more speed, a resistance, advantage on one kind of roll, a cantrip, a level 1 spell, a Bonus Action option, some extra damage, a reroll, ignoring a drawback or a small trick ½; Expertise, light or medium armor, martial weapons, a level 2 spell, rituals, a Reaction, a bonus attack, +2 to hit or +1 AC, or healing 1; a saving throw, heavy armor, a big Initiative bonus or a big damage bonus 1½; +2 HP per level, Lucky-style advantage or an Epic Boon's capstone 2; and anything else, or a drawback, rated by you (½ to 3). The +1 counts 1. All 75 feats of the 2024 rules are rated the same way, which sets the range for each kind: origin feats 1–2, general feats 1½–3½ (Ability Score Improvement is 2), Fighting Styles ¼–1¼ and Epic Boons 2½–3½ (a range narrower than 1 is widened to ½ either side). A homebrew feat has to land in the range of its kind to be approved; a stricter prerequisite (another feat or a class) allows ½ more. The panel shows the score and the closest 2024 feats.

**The 2024 structure**
- A background follows the 2024 structure, and the screen checks each part live:
  - three abilities it can raise
  - one origin feat
  - two skills
  - one tool
  - a kit worth 40–60 GP (SRD kits are 45–56 GP; players may take 50 GP instead)
- A comparison table shows it next to the four SRD backgrounds.

**Approval**
- You can save anything, including unfinished drafts.
- Only homebrew you switch to **Approved by the DM** appears in the hero creator, with a "Homebrew" chip. Unfinished ones can't be approved.
- A hero keeps a copy of the homebrew it was made with, so editing, unapproving or deleting it doesn't change existing heroes.

**Export and import**
- **Export** saves your homebrew as a `.json` file without approvals. On the published link, Claude asks you to confirm the save first.
- **Import** reads a Quillbound homebrew file and lists what it contains.
  - Where a name already exists, you choose: keep yours, keep both, or replace yours. Nothing is replaced without that choice.
  - Imported homebrew starts unapproved.

The rules are in `src/app/homebrew.js` and checked by `tools/homebrew-check.cjs`.

The creator's data is generated by `tools/hero-srd-convert.cjs` from github.com/5e-bits/5e-database (`src/2024/en`) and credited under Help → Credits (SRD 5.2, CC-BY 4.0). The rules are in `src/app/hero-rules.js` and checked by `tools/hero-check.cjs`.

## Players, the DM and campaigns

**Player mode** is how every browser starts: the tabs are Start, Create a hero and **My heroes**. At the end of the creator a player chooses **Save to My heroes**. From My heroes a player can print the character sheet, edit the hero, and **Send to DM**, which saves a hero file (`name.quillbound-hero.json`) to attach in Discord or an email; **Copy as text** gives the same thing for chats without files. **Open a hero file…** brings a hero to another device. Heroes a browser made before player mode (added to its own party) are copied into My heroes the first time. A hero file carries copies of the homebrew the hero uses, so it works in any browser.

**Import from a sheet** (My heroes, and Campaigns → Party for the DM) reads a hero made elsewhere and turns it into a creator hero:
- **Sources:** PDF sheets (fillable ones such as the official sheet or D&D Beyond's PDF export, read from their fields; text sheets such as the Night Shift ones, read line by line, in English or German, in rows or columns; one PDF may hold several heroes, each shown with its own buttons), a D&D Beyond character (from its link when D&D Beyond allows it, otherwise from its saved data file), and Foundry VTT (dnd5e) actor exports.
- **How it maps:** species, class, level and subclass by name (German names too, and homebrew such as "Vampir" → Vampire); ability scores are set so they land exactly on the sheet's; hit points through per-level rolls that add up to the sheet's; trained skills and expertise worked out from the bonuses; the background by name, otherwise the one whose skills the sheet shows; gear by name (common German names too), granted; armor worked out from the AC when the sheet names none; weapons the sheet attacks with but the class isn't trained in become training granted by the DM; spells by name.
- **What it shows:** how many of the sheet's numbers match, a table of the ones that differ (sheet next to Quillbound), and notes on anything it chose or couldn't map. Then **Save to My heroes** / **Add to the party**, or **Open in the creator** to change anything.
Rules: `src/app/hero-import.js`; screen: `src/ui/hero-import.js`; checked by `tools/hero-import-check.cjs`.

**DM mode** opens with **I'm the DM** and a passphrase the DM sets the first time on that device; **Lock DM mode** closes it. The passphrase only hides the DM tabs on that device. The DM's adventures, notes and fights stay private because they exist only in the DM's own browser: nothing is uploaded, and players' browsers never receive them.

**Campaigns** (DM mode) is the Adventure manager:
- Each campaign has its own party, DM desk, adventures, prepared fights and running fight. Opening another campaign saves the current one; a new campaign starts empty. The save the DM already had becomes the first campaign.
- **Add hero files…** (or a pasted hero) adds players' heroes to the open campaign's party, with their sheet numbers and attacks, and their story answers as leads on the DM desk. A hero sent again replaces the earlier version and keeps its current hit points.
- **Back up this campaign…** saves the campaign as a file; **Restore a campaign file…** brings one back as a new campaign. Backups hold only the campaign, never the DM lock or players' heroes.
- **Reset demo data** replaces only the open campaign; the DM lock, My heroes, homebrew and the other campaigns stay.

Rules: `src/app/campaigns.js`; screens: `src/ui/campaigns.js`; checked by `tools/campaign-check.cjs`.

## Stakes combat

Stakes is still being playtested. It keeps 5e character sheets, hit points and stat blocks, and changes how an exchange is resolved: players roll every die, a near miss still counts, and enemies can break before they drop. The design and its simulations are in [prototypes/stakes-v2/RULESET.md](prototypes/stakes-v2/RULESET.md).

### A turn

1. **Choose who acts**: a token on the board or the *Who acts?* list. Choosing an enemy means an enemy move (see below).
2. **Choose an action**: Attack, Defend, Help, Move or Improvise, and a target where needed.
3. **Say what's at risk** before rolling ("If it goes wrong, I end up in the open"). It's optional. It becomes the suggested consequence when the roll goes wrong and the enemy can't strike back, and it is written into the fight log.
4. **Roll**, on screen or at the table. Bonuses come from the sheet and the stat block automatically.
5. **Confirm the result.** Damage is rolled automatically for hits and grazes; you can edit or reroll it before confirming. Nothing changes until you confirm, and **Undo** reverses a confirmed exchange (the last 20 are kept).

### Attack

Each attack is its own roll: d20 + attack bonus against the target's armor class. Extra Attack means two (or more) rolls. The attack bonus is ability modifier + proficiency; heroes are always proficient with their own attack.

| Roll | Result |
|---|---|
| Natural 20 | **Critical hit**: damage dice double. |
| AC or more | **Hit**: normal damage. |
| 1–5 below AC | **Graze**: half damage, and the target strikes back. |
| 6 or more below | **Miss**: the target strikes back. |
| Natural 1 | Miss, and the target strikes back with a critical. |

Only the **first eligible graze or miss** in a hero's Attack action can cause a strike-back, while the target remains standing. Later rolls in the same Attack action cannot trigger additional strike-backs. A natural 1 causes a critical strike-back only if it is that first eligible response. A **strike-back** is one of the target's attacks; the app rolls its damage, with no extra roll to hit. If the target can't reach the hero, untick *can reach* and choose another consequence instead: become Exposed, or what was at risk happens (after a natural 1: separated and pinned, or the enemy achieves a major goal). A graze that drops the target draws no strike-back.

A hero made in the hero creator attacks with the strongest attack on its sheet (Sneak Attack lines aside: the plain weapon comes first). Older heroes have a simple starter attack per class (for example Fighter greatsword 2d6, Rogue rapier 1d8 with Sneak Attack, Wizard Fire Bolt 1d10). Cantrip dice grow at levels 5, 11 and 17.

### Enemy moves

Choose an enemy, describe what it does, and pick the hero it targets. The hero rolls, using the enemy's turn, not the hero's.

- **Deal damage** (the usual move): one defense roll per attack in the enemy's turn (Multiattack). The hero rolls d20 + AC − 10 and must **beat 11 + the attack bonus**; a tie hits. These are exactly 5e's chances to be hit. A failed defense takes the attack's stat-block damage, which the app rolls and the DM can change. A natural 1 is a critical hit. A natural 20 avoids it and earns an extra benefit (an opening, cover for a hero, or better ground).
- **Change position, create a condition, advance an objective, or resolve a physical situation**: agree the consequence before rolling. One defense roll against the enemy's best attack bonus; a failed defense applies the stated consequence instead of damage. Objective changes are recorded for the DM to adjudicate.

### Other actions

Help, Defend, Move and Improvise keep the Stakes bands: natural 20 a success with an extra benefit, 15+ success, 8–14 success with a consequence, 7 or less a setback, natural 1 a major reversal. The bonus comes from the sheet: Help uses the class's main ability, Move Dexterity, Defend the better of Dexterity and Constitution, and Improvise a fitting ability for the condition you want (Strength or Dexterity to pin or disarm, Charisma to frighten). Proficiency is added when the character is trained in that ability; a sheet's `combatActions` can set both explicitly.

- **Defend** covers an ally: their next defense roll gets an opening.
- **Help** gives another hero an opening for their next roll.
- **Move** reaches a dangerous position or gets out of trouble.
- **Improvise** creates a condition, moves a target, deals your attack's damage, or achieves a scene objective. Describe what success accomplishes before rolling.

Consequences after 8–14 or a setback: lose your position and become Exposed, an enemy strikes (the DM picks which; its attack damage is rolled), or what was at risk happens. After a natural 1: separated and pinned in open ground, an enemy lands a critical strike, or the enemy achieves a major goal.

### Stamina

- Each hero has **stamina** equal to their proficiency bonus (2 at level 1, up to 6). It comes back only on a long rest.
- **Push**: after seeing a roll for your own action that went wrong, spend 1 stamina to add 1d4. It can turn a miss into a graze or a hit. Defense rolls can't be pushed; a natural 1 or 20 stands; each roll can be pushed once.
- **Winded**: with no stamina left you can still push by spending a Hit Die instead (**overexert**). That Hit Die is gone until the long rest. Nothing else changes.
- The cost is paid when you confirm; a cancelled roll costs nothing.

### Hit points, dying and rests

- Heroes use the HP on their sheet; the sheet keeps current HP, stamina and Hit Dice between fights. Enemies use their stat block's HP.
- **± HP** on a token damages or heals by hand (potions, spells, corrections). Undo reverses it.
- At **0 HP** a hero is dying: roll a death save on their turn (10 or higher succeeds, a natural 20 brings them back with 1 HP, a natural 1 counts as two failures; three successes is stable, three failures is death). Damage while dying counts as a failure, and damage that leaves a hero at 0 with at least their maximum HP left over kills outright. Healing brings a hero back. An enemy at 0 HP is out of the fight.
- When no fight is running, the Combat tab shows the party with **Short rest** (spend Hit Dice: each die + Constitution heals) and **Long rest** (full HP, all Hit Dice back, full stamina).

### Enemies without full numbers

Enemies from a book's stat block bring their HP, AC and attacks.

- **Standard monsters:** anything still missing (for example a creature that only appears on a combat card) is looked up in the SRD 5.1 monster list, which ships with the app (334 monsters).
  - The match is by exact name, after removing numbers ("Goblin 3"), card sizes ("Chimera, L"), plurals ("Wolves") and card ordering ("Elf, Drow").
  - There is no guessing between similar names, and the book's own numbers are never replaced.
  - The importer shows where an enemy's numbers came from.
- **Anything else** (for example a book's own creature without a stat block) shows **Add numbers**, and the roll waits until the DM enters them.
  - The dialog suggests typical numbers for the creature's challenge rating: the middle value of the SRD monsters at that rating.
  - Numbers entered for one member of a group go to the whole group and to its bestiary entry.
- **Combat cards:** their attack lines are not used yet, because several cards share a page and the lines can't yet be tied to the right card reliably.

The SRD 5.1 is by Wizards of the Coast LLC and licensed under CC-BY 4.0. The attribution is under Help → Credits, and the data was converted with `tools/srd-convert.cjs` from github.com/5e-bits/5e-database.

### Groups, breaking points and the board

- Three or more of the same creature in a fight form a **group**: one card, each member with its own HP. **Group matching enemies** does the same by hand.
- Most enemies have a **breaking point**, the gold mark on their HP bar: tougher enemies hold out longer. Compared with the party's average level, an enemy whose challenge rating is at most a quarter of it wavers at 30% HP, at most half at 25%, at most equal at 20%, and higher at 15%. A group wavers when half of it is down. Undead, constructs and other enemies without a breaking point fight until they drop.
- Enemy statuses are validated consistently: down/dead foes have 0 HP, while fleeing, bargaining or surrendering preserves current HP. A pending roll must be resolved or cancelled before changing status. The combat board distinguishes ongoing, cleared and all-heroes-down scenarios (without automatically ending a fight). See [combat lifecycle](docs/COMBAT-LIFECYCLE.md).
- When an enemy wavers, the fight pauses on its card and the DM decides: it **flees**, **surrenders**, **makes a deal** or **fights on**. It asks only once, and Undo reverses the decision.
- So a fight can end without anyone going down. When you end it, enemies that fled, surrendered or made a deal become suggested leads on the DM desk.
- **Status…** on an enemy card is for corrections by hand.
- **Conditions** are plain words such as Disarmed, Pinned or Exposed. They change what is possible in the story; there are no hidden number penalties. Each has a description and a way to clear it (the ⓘ button), and the **Conditions guide** lists them all. You can write your own.
- The scene has three areas you can rename (by default Cover, Open ground, The objective). Drag tokens or use *Place selected token*. Free placement is a DM correction; use Move when getting there is risky. Areas carry no distance math.
- **Next round** lets everyone act again. It asks first if someone hasn't acted yet.
- Every fight has a goal for the opposition, set when you prepare the fight ("Get the crates onto the boat"). It is shown at the top of the Combat tab.

### Not in Stakes yet

Spell slots, limited class features and the full 5e feature set still need design work: use your sheet for those. Hero attacks are simple starter attacks until hero creation is reworked.

A fight saved under the earlier wound-box rules converts when it opens: lost wounds become lost HP by the same share, mobs become groups whose members have their stat-block HP, and stamina starts full. Undo can't go back past the conversion.

## Player screen

A second browser tab for the table or a TV. It shows only what you approve.

1. Start Quillbound with `npm start` and open http://localhost:5173.
2. Click **Player screen**, then **Open player screen**, and move that tab to your TV or second display. Keep both in the same browser at the same address (localhost and 127.0.0.1 count as different).
3. On the DM desk, choose **Reveal…** on a scene, lead, person or item. Write what the party has learned, then **Show players**. **Shown · edit** changes or hides it again; private notes never overwrite the approved text.
4. In the library, **Show players** on an image opens a preview first. Check it for DM labels and give it a title. Only the image and that title are sent, without the file name or metadata, scaled to at most 2400 pixels.
5. In the Player screen settings you can also share the party and the current fight. Fight sharing omits concealed enemies and uses player-facing names. It shows each hero's HP and stamina; enemies show only Fresh, Hurt, Bloodied, Wavering or Down. Review names and visibility before sharing.
6. **Clear map / read-aloud** clears the spotlight. **Hide revealed content** removes all revealed cards, party and fight information and the spotlight.

What players never see: secrets, motives and roleplay notes from People, story branches and solutions, enemy statistics (HP, AC, attacks, breaking points) and plans, the DM log and secret rolls.

Revealed cards and sharing settings are saved with the DM page. A manually shown map or read-aloud text lives only in memory and clears when the DM page reloads. Reloading the player tab asks the DM page for the current state; if the DM page is closed, the player tab keeps the last state and says it is waiting.

### DM session overview

**Security alert:** Le Louvré campaigns show a six-step Spannung meter above scene navigation, initially 0. Raise/lower and Undo are manual DM controls; no die roll or scene transition changes it automatically. The meter persists with its campaign and backup. At 2 service doors lock (handwheel DC 12 or Voss); at 4 Voss is called to the Reliquary without extra fights; at 6 the finale begins with Sealing 1. Reaching 6 does not end the adventure or destroy treasures. Thresholds are reminders, not automated changes to doors, enemies or the finale clock. The two one-use reductions track reconciliation with Voss and disabling C's central alarm; Undo restores their availability too. Use at most one increase per resolved scene, not per hero or die. Generic campaigns may add a manual six-step meter without the museum-specific rules.

The meter is private until **Show meter to players** is chosen. Players receive only the value and maximum, never threshold effects, change history or used reductions. Hiding it or Hide revealed content removes it from the player feed. The regular adventure alert and the finale's Sealing clock remain separate tracks.

The session header shows the players' current location and finished-scene count. Continuation is available above and below the briefing. Briefing shortcuts jump to the opening, core guidance, character clues or extra rules; the extra-rules shortcut opens its fold. NPC name buttons choose the speaker's complete helper, with relevant names first and the first selected automatically on room entry. Delivery and gestures share one card, dialogue is visually distinct, and private secrets remain labelled. **Enlarge map** opens a private map preview without changing the player screen. A delayed preview cannot open after changing location or campaign. Repeated generic scene questions and transitions are omitted from later rooms' main view; original notes remain in preparation tools.

The DM desk opens with location navigation, one selected scene, its linked map preview, and NPC roleplay helpers. Clicking a location enters it in one action and changes its automatic player map; **Preview** reads ahead without moving players. **Finish & continue** marks the current scene done and enters the next unfinished location in the notes. This is a suggested order; any location can be entered from the list. Other active scenes return to upcoming on movement; finished scenes remain finished until revisited. SL/DM/GM reference cards are grouped under Reference notes and cannot move players.

The opening, first three core sections, visible-hint sections and character-specific clues are shown as readable briefing blocks without separate clicks. Alternatives, consequences and rules remain together under More detail. Relevant NPC helpers show dialogue, motivation, delivery, gesture, knowledge, response under pressure and secrets immediately. Other campaign NPCs remain under one fold. Relevance is a text match, not a claim that somebody is present. Private scene and NPC notes are never automatically revealed; existing Reveal review controls still govern sharing. Preparation tools and complete original notes remain below the overview.

Legacy scenes with an explicit `KARTE: filename_PLAYER.jpg` or `MAP:` line automatically link when that exact, uniquely matching PLAYER image is loaded in the map library. DM-labelled files and ambiguous filenames are excluded, existing links are preserved, and manually unlinked scenes are not reattached. Each accepted image is hashed and cached locally for later reloads. A map mentioned in text is not itself an image: if its original file is not loaded, the overview names the required file. No room-name guessing or generic-image auto-approval is performed.

### Maps linked to story scenes

The Google Drive dialog includes **Firefox: sign in without the account chooser**. Enter an account email and use **Connect this account (Firefox)** to send a one-request Google login hint with an explicit consent prompt. The email is not saved or sent to the player screen. It uses the same Google library, scope and token storage as ordinary sign-in; Google may still require login or account selection. OAuth and popup errors are shown separately instead of being collapsed into a generic message.

**ZIP preparation packages:** Campaigns → **Restore campaign / ZIP…**, or Import adventure → **Restore campaign ZIP**, accepts a ZIP containing campaign JSON and maps/PDFs, including nested ZIPs. Review the campaign choice, then restore as a new campaign; existing campaigns are preserved. The library is loaded alongside it, allowing exact approved scene-map links to reconnect. Ordinary **Choose files** also reads nested map/PDF archives. Packages have limits of three nested archives, 4000 entries and 300 MB total expanded content; password-protected, unsafe or unreadable entries report an error.

**Google Drive:** Import adventure and Link adventures offer a Drive browser for selecting PDFs, map images, ZIPs and campaign JSON. One-time Google Cloud OAuth setup is required; see [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md). Drive is read-only and files are downloaded only when selected. Tokens remain in memory and expire; the public client ID alone is saved in this browser. Disconnect clears the token without deleting local imports. Source files must be loaded again after reload; adventure profiles and reviewed scene-map images remain saved. Read imported books with the normal reader to add their profiles to Link adventures. This is on-demand import, not cloud synchronization; native Google Docs and shortcuts are not supported.

Under **Map controls** on the DM desk, **Choose player map…** lets you select a library or local PNG/JPEG/WebP, inspect it, give it a public title, and save. GM-labelled images are excluded. Images without an exact explicit PLAYER-file match require this review.

With **Show this map when this scene becomes active** selected, marking that scene active displays its reviewed image on the player screen. **Show linked map** brings it back after a handout. Manual maps, read-alouds, and Clear/Hide override automatic display until another scene is activated. Entering an unlinked scene clears the previous map instead of showing a potentially wrong location. If several scenes are marked active, the most recently activated scene chooses the map.

Reviewed image pixels are re-encoded to at most 2400 pixels and saved in this browser's IndexedDB. They survive a normal reload; raw files, metadata, and private notes are not broadcast. A campaign backup carries each map's title, filename, and checksum, not its pixels. On another browser, load the original maps once: only an exact checksum match reconnects a reviewed link. A different image with the same filename requires a new review. Missing files or unavailable browser storage produce a DM message and never reveal an unreviewed replacement. Switching campaigns cancels any pending image from the previous campaign. This does not upload map artwork to the public website.

**This is a presentation screen, not access control.** Anyone who can use the DM's browser can see DM material, and it does not reach other devices. Real player access needs accounts and a server.

## Checks

Run these after changing the rules, the importer or the player screen (`npm test` runs all of them):

```
node tools/combat-check.cjs
node tools/player-check.cjs
node tools/clarity-check.cjs
node tools/library-check.cjs
node tools/hp-check.cjs
node tools/hero-check.cjs
node tools/homebrew-check.cjs
```

The equipment data corrects one error in its source: Parchment costs 1 SP a sheet (the source says 3 GP). Ammunition is priced per bundle (20 arrows for 1 GP).

## Clues, intent and encounter complexity

### Prepared scene objectives

A prepared fight may now carry named zones, private enemy plans/tells, clues, clocks, phases and optional objective cards. Starting it copies these settings into the live encounter, including initial clock values; progress never mutates the saved template. Ordinary fights remain unchanged. See [scene objectives](docs/SCENE-OBJECTIVES.md).

**Attempt objective** prepares a normal Improvise action. Choose an allowed ability and proficiency, or enter the full check bonus from the sheet when a skill/tool/Expertise applies. On confirmation, success or mixed success adds one progress; mixed success still has its ordinary consequence. Setbacks add none. Push, Cancel and Undo follow the ordinary rules. Prerequisites, location and the hero's one-action limit are enforced. A certain task may use **Use action · no roll** instead; it still spends the normal action. Progress correction is explicitly a DM correction, not a free action for the hero. Completion notes, clock changes, phases and victory remain DM decisions.

Only a reviewed public objective title and its progress reach the player display. Solutions, checks, prerequisites and completion notes remain private. **Record an action resolved at the table…** marks the normal action spent and records manually adjudicated spells/features, without inventing an attack roll or applying spell effects. Use the usual HP/condition corrections for those effects; spell slots remain manual. Artificer default Help/support actions use Intelligence.

Private enemy plans are separate from observable tells. Set each hero’s Perception bonus, then prepare layered observations by passive threshold and location. Discoveries remain private until explicitly shared. Revealing a clue does not reveal a concealed enemy.

Simple mode offers clues and plans; Standard adds manually advanced goal clocks; Boss adds manually triggered phase reminders. These modes do not change damage or dice probabilities. Subclasses remain sourced references with manual use reminders.

## Contextual conditions

For Improvise, choose Resolve a physical situation, or choose that consequence for an enemy move. Declare a specific outcome: trap a limb/equipment, knock a weapon away, knock someone down, remove a restraint, recover a weapon, or stand up. Successful hero outcomes (including mixed success) and failed enemy defenses apply or clear the corresponding condition on confirmation. The result previews the condition and the private combat log explains why. Undo restores the conditions. No free-text inference or AI is used.

Removing restraints clears only Pinned or Sword pinned; custom and combined conditions need explicit DM review. Moving to cover while Exposed offers an unchecked DM suggestion to clear Exposed. It only clears if accepted and the character actually remains in cover after consequences. Context rules do not infer safety from an area name.

