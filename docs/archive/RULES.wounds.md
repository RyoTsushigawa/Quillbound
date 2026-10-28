# Quillbound rules

How the app behaves today. Your project rules (no AI pictures or voices, fair dice, usable without AI) are in [PROJECT-RULES.md](PROJECT-RULES.md).

Words used in the app: **Scenes** are the parts of an adventure, **Leads** are clues, rumours and requests the party can follow, **People** are the characters the party meets, and **Fights** are prepared battles. A fight is run on the **Combat** tab with the **Stakes** rules below.

## Dice

- Every d20 is fair: each face has exactly a 5% chance. The on-screen die uses the browser's secure random numbers with rejection sampling. Nothing is weighted and no result is scripted.
- You can always type in the result of a physical die instead.
- A natural 20 and a natural 1 count no matter what the bonus is.
- **Opening** is normal advantage: roll two fair d20s and keep the higher. At the table, enter the die you kept.
- All player dice, including defense rolls, appear on the player screen as soon as they are rolled. Cancelling or undoing an outcome does not erase that roll. The app keeps the latest 20 player rolls; the player screen shows the latest 8.
- The **DM secret roll** is separate. It never reaches the player screen.

## Stakes combat

Stakes is still being playtested. It keeps your 5e character sheets but replaces how a fight is resolved.

### A turn

1. **Choose who acts**: a token on the board or the *Who acts?* list. Choosing an enemy means an enemy move (see below).
2. **Choose an action**: Attack, Defend, Help, Move or Improvise, and a target where needed.
3. **Say what's at risk** before rolling ("If it goes wrong, I end up in the open"). It's optional, but if the roll goes wrong it becomes the suggested consequence, and it is written into the fight log.
4. **Roll** one d20, on screen or at the table. The bonus comes from the character sheet automatically:
   - Attack and Help use the class's main ability.
   - Move uses Dexterity.
   - Defend uses the better of Dexterity and Constitution.
   - Improvise picks a fitting ability for the condition you want to create (for example Strength or Dexterity to pin or disarm, Charisma to frighten).
   - Proficiency is added when the character is trained in that ability. A sheet's `combatActions` can set the ability and training for an action explicitly.
5. **Confirm the result.** Nothing changes until you confirm, and **Undo** reverses a confirmed exchange (the last 20 are kept).

### Results

| Roll | Result |
|---|---|
| Natural 20 | You do it, and choose an extra benefit: an extra wound on the target, an opening or protection for a hero, or better ground. |
| Total 15+ | You do it. |
| Total 8–14 | You do it, and the DM chooses a consequence. |
| Total 7 or less | Setback: the opposition gains ground, and the DM chooses a consequence. |
| Natural 1 | Major reversal. |

Consequences after 8–14 or a setback: lose your position and become Exposed, take one wound, or what was at risk happens (the DM describes how; without a stated risk, the scene changes against you). After a natural 1: separated and pinned in open ground, two wounds, or the enemy achieves a major goal.

### Actions

- **Attack** deals one wound.
- **Defend** protects a hero: the next incoming enemy wound is absorbed. It doesn't stack.
- **Help** gives another hero an opening for their next roll. It doesn't stack.
- **Move** reaches a dangerous position or gets out of trouble.
- **Improvise** creates a condition, moves a target, deals a wound, or achieves a scene objective. Describe what success accomplishes before rolling.

### Enemy moves

Choose an enemy, describe what it does, and pick the hero it targets. The hero rolls to defend; this uses the enemy's turn, not the hero's.

- Natural 20: the hero avoids it and chooses an extra benefit.
- 15+: the hero avoids it.
- 8–14: one wound.
- 7 or less: one wound and Exposed.
- Natural 1: two wounds.

### Wounds, conditions and the board

- Heroes have four wound boxes. Enemies keep the one to four boxes from their stat block, or one box per member of a mob. A full track means out of this fight, not dead; the table decides what happens next.
- **Conditions** are plain words such as Disarmed, Pinned or Exposed. They change what is possible in the story; there are no hidden number penalties. Each has a description and a way to clear it (the ⓘ button), and the **Conditions guide** lists them all. You can write your own.
- The scene has three areas you can rename (by default Cover, Open ground, The objective). Drag tokens or use *Place selected token*. Free placement is a DM correction; use Move when getting there is risky. Areas carry no distance math.
- **Next round** lets everyone act again. It asks first if someone hasn't acted yet.

### What the enemy wants, and when it breaks

- Every fight has a goal for the opposition, set when you prepare the fight ("Get the crates onto the boat"). It is shown at the top of the Combat tab. A natural 1 can let them achieve it.
- Most enemies have a **breaking point**, the gold mark on their wound track. Humanoids break one wound before they go down, beasts when badly hurt, and a mob when half of it is down. Undead, constructs and other enemies without a breaking point fight until they drop.
- When an enemy reaches its breaking point, the fight pauses on its token and the DM decides: it **flees**, **surrenders**, **makes a deal** or **fights on**. It asks only once per enemy, and Undo reverses the decision.
- So a fight can end without anyone going down. When you end it, enemies that fled, surrendered or made a deal become suggested leads on the DM desk.
- **Status…** on an enemy token is for corrections by hand.
- Three or more minions of the same kind form mobs of at most twelve members, with one wound box per member. Larger groups split into multiple mobs.

### Dramatic moments

The DM can switch these on or off and choose **More dramatic moments**.

- **Last Stand**: when a combatant's wound track has just filled, they may stay in the fight with one box left (condition: Defiant).
- **Power Through**: after a wounded or hindered combatant lands an action, they may recover one wound; a condition clears only when the DM confirms its cause has been resolved (condition: Second wind).
- Each is a separate percentile check: 10% normally, 25% with More dramatic moments, the same for heroes and enemies. It never changes or rerolls a d20.
- At most one moment per combatant per fight, and one check of each kind per round. Only confirmed exchanges can trigger them, not manual wound corrections. Replaying an exchange after Undo can cause a new check, so use Undo for corrections.

### Not in Stakes yet

Spell slots, limited class features, healing resources, armor differences and the full 5e feature set still need design work: use your sheet for those. A fight saved by an older version still opens; damage it tracked as filled condition slots counts as wounds.

## Player screen

A second browser tab for the table or a TV. It shows only what you approve.

1. Start Quillbound with `npm start` and open http://localhost:5173.
2. Click **Player screen**, then **Open player screen**, and move that tab to your TV or second display. Keep both in the same browser at the same address (localhost and 127.0.0.1 count as different).
3. On the DM desk, choose **Reveal…** on a scene, lead, person or item. Write what the party has learned, then **Show players**. **Shown · edit** changes or hides it again; private notes never overwrite the approved text.
4. In the library, **Show players** on an image opens a preview first. Check it for DM labels and give it a title. Only the image and that title are sent, without the file name or metadata, scaled to at most 2400 pixels.
5. In the Player screen settings you can also share the party and the current fight. Fight sharing omits concealed enemies and uses player-facing names. Review names and visibility before sharing.
6. **Clear map / read-aloud** clears the spotlight. **Hide revealed content** removes all revealed cards, party and fight information and the spotlight.

What players never see: secrets, motives and roleplay notes from People, story branches and solutions, enemy statistics and plans, the DM log, secret rolls and dramatic-moment settings.

Revealed cards and sharing settings are saved with the DM page. A shown map or read-aloud text lives only in memory and clears when the DM page reloads. Reloading the player tab asks the DM page for the current state; if the DM page is closed, the player tab keeps the last state and says it is waiting.

**This is a presentation screen, not access control.** Anyone who can use the DM's browser can see DM material, and it does not reach other devices. Real player access needs accounts and a server.

## Checks

Run these after changing the rules or the player screen:

```
node tools/combat-check.cjs
node tools/drama-check.cjs
node tools/player-check.cjs
node tools/clarity-check.cjs
```

## Clues, intent and encounter complexity

Private enemy plans are separate from observable tells. Set each hero’s Perception bonus, then prepare layered observations by passive threshold and location. Discoveries remain private until explicitly shared. Revealing a clue does not reveal a concealed enemy.

Simple mode offers clues and plans; Standard adds manually advanced goal clocks; Boss adds manually triggered phase reminders. These modes do not change damage or dice probabilities. Subclasses remain sourced references with manual use reminders.

Enemy moves may threaten position, create a condition, or advance a stated objective instead of dealing wounds. Describe that consequence before rolling defense. A failed defense applies the stated consequence; objective changes are recorded for DM adjudication, not automatically simulated. Wound totals remain the current playtest damage rule. HP with complementary stamina and conditions is under discussion, not implemented.

## Next playtest proposal (not implemented)

Keep HP as the harm track. Add a small stamina pool for optional exertion, not damage absorption. Ordinary attacks, movement, defense and help remain available without stamina. Winded limits further pushes until the hero catches their breath; avoid blanket penalties that make an already struggling hero fail every action. Conditions such as Pinned still need a fictional cause and a specific way to clear them. Establish recovery timing and class-feature interactions before implementing or converting saved fights.

## Contextual conditions

For Improvise, choose Resolve a physical situation, or choose that consequence for an enemy move. Declare a specific outcome: trap a limb/equipment, knock a weapon away, knock someone down, remove a restraint, recover a weapon, or stand up. Successful hero outcomes (including mixed success) and failed enemy defenses apply or clear the corresponding condition on confirmation. The result previews the condition and the private combat log explains why. Undo restores the conditions. No free-text inference or AI is used.

Removing restraints clears only Pinned or Sword pinned; custom and combined conditions need explicit DM review. Moving to cover while Exposed offers an unchecked DM suggestion to clear Exposed. It only clears if accepted and the character actually remains in cover after consequences. Context rules do not infer safety from an area name. Stamina/Winded automation is not implemented.
