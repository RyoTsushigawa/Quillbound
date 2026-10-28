# Stakes combat: HP + stamina rule set (decided, not yet in the app)

Decided step by step on 2026-10-27, based on [HP-STAMINA.md](HP-STAMINA.md). Every d20 is fair and unweighted.
The app still runs the wound-box rules described in RULES.md until this is implemented.

## The rules

### Health

| | Heroes | Enemies |
|---|---|---|
| **HP** | 5e hit points from the character sheet | hit points from the stat block |
| **Damage** | normal 5e damage | normal 5e damage |
| **Critical hit** | doubles the damage dice | doubles the damage dice |
| **At 0 HP** | down; 5e rules for dying apply | down |

Wound boxes, tiers-as-health and mobs-as-boxes go away.

### Attacking (the hero rolls)

Each attack in an action gets its own roll, as in 5e (Extra Attack, Multiattack).

| Roll: d20 + attack bonus | Result |
|---|---|
| natural 20 | **critical hit** |
| AC or more | **hit**: full damage |
| 1–5 below AC | **graze**: half damage, and the target **strikes back** |
| 6 or more below AC | **miss**: the target **strikes back** |
| natural 1 | **disaster**: miss, and the target makes a **critical strike-back** |

A **strike-back** is one of the target's attacks. Its damage is rolled with no extra roll to hit. If the target can't reach the hero, the DM uses another consequence instead: the hero becomes Exposed, or the stated risk happens (on a natural 1: pinned in the open, or the enemy reaches a major goal).

### Defending (the hero rolls)

The hero rolls **d20 + AC − 10** and must **beat 11 + the enemy's attack bonus**. A tie is a hit.

| Roll | Result |
|---|---|
| natural 20 | always avoids |
| beats 11 + bonus | avoids |
| otherwise | full damage |
| natural 1 | **critical hit** |

These are exactly 5e's chances, with the dice in the player's hand. There's no graze on defense.

### Stamina

- **Pool:** equal to the proficiency bonus (2 at level 1, rising to 6). It refills **only on a long rest**, and it is kept separate from Hit Dice.
- **Push:** after seeing your roll, spend 1 stamina to add **+1d4**.
  - Only on your own action's roll; never on defense.
  - A natural 1 or 20 stays what it is.
- **Winded (pool at 0):**
  - You can't push with stamina.
  - You may **overexert**: push anyway by spending a Hit Die. That Hit Die is gone until the long rest, so you heal less at the next short rest.
  - There are no other penalties.

## What it plays like (check with the complete rule set)

```bash
node prototypes/stakes-v2/final.cjs 2000
```

- **Single fights:** the 29 fights from 17 of your adventures.
- **Days:** 11 adventure days, where HP, Hit Dice and stamina carry over, with one short rest.

| | Rounds | Someone drops | Party wiped | Hero attacks that do nothing | Day: someone drops | Day: wiped | Fights started Winded |
|---|---|---|---|---|---|---|---|
| plain 5e | 3.9 | 38% | 5% | 25% | 74% | 18% | — |
| **complete rule set** | 2.5 | 38% | 3% | 5% | 74% | 12% | 4% |
| … if the DM always lets broken enemies go | 2.4 | 35% | 2% | 5% | 71% | 9% | 3% |
| … with no breaking points | 2.7 | 41% | 4% | 5% | 78% | 16% | 5% |

The complete rule set includes all seven implementation decisions below. It assumes the DM lets broken enemies flee or surrender about half the time.

**The danger is the books' danger:** heroes drop exactly as often as in plain 5e. What changes is the feel:
- A hero's swing does nothing only one time in twenty, instead of one in four.
- Fights take about 2.5 rounds instead of 4.
- Wiping the whole party is rarer: 12% of days instead of 18%.
- Stamina runs out late in long dungeon days.

> **Correction found while checking:** the earlier defense tables let a tie count as a dodge, which made heroes about 3–4 points safer than this. The rule above ("beat", a tie hits) is the exact 5e version; the earlier tables stay reproducible with `defDC: 11`.

## What the app keeps from Stakes today

- **The flow:** stakes said before the roll ("what's at risk"), the DM choosing consequences, and enemy moves that threaten position, a condition or an objective instead of damage.
- **Tools:** Defend and Help (an opening gives advantage), conditions and contextual conditions, the public dice log, Undo, and the player screen.
- **DM aids:** encounter clues, private plans, and clocks and phases.

## Implementation decisions (all settled 2026-10-28)

1. **Mobs: decided.**
   - Each member keeps its own stat-block HP, as in 5e.
   - The app shows the group as one card ("Drow ×6") with a small HP bar per member.
   - Why not a shared pool, where damage spills to the next member: it made mobs much weaker. In Lastwatch's 6 drow + 6 goblins, the chance someone drops fell from 48% to 19%. See `mobs.cjs`.
2. **Breaking points: decided.** They work like the capture threshold in Monster Hunter: the tougher the enemy is compared with the party, the longer it holds out.

   | Enemy CR compared with party level | Breaks at |
   |---|---|
   | up to ¼ of the level | 30% HP |
   | up to ½ | 25% |
   | up to the level | 20% |
   | above the level | 15% |

   - Examples: at level 4, a goblin breaks at 30% and Gulaira at 15%. At level 8, a Ras-Godai acolyte breaks at 30% and the Demon Blade at 20%.
   - A group of three or more of one creature still breaks when half of it is down.
   - Undead, constructs and others without a breaking point fight on, as today.
   - At the breaking point the DM picks flee, surrender, deal or fight on.
   - Simulated upper bound, if every broken enemy leaves: 2.4 rounds and 26% chance someone drops, against 3.2 rounds and 38% with no breaking. A flat ¼ HP gives about the same. See `breaking.cjs`.
   - In Monster Hunter you see a cue (limping) rather than a number. The app could likewise show "wavering" on the enemy card at that point.
3. **Dramatic moments: decided, both retire.** Last Stand and Power Through, the toggles and the percentile checks all go away. Stamina, overexert and breaking points carry the drama. In the simulation the moments changed danger by only 1–3 points (`drama.cjs`).
4. **Strike-back: decided.** Every graze or miss draws a strike-back (see Attacking above). It replaces "take one wound" in today's consequence menu.
   - Of everything simulated, this comes closest to 5e's danger.
   - With the DM letting broken enemies go about half the time, someone drops in 38% of fights, the same as plain 5e. Fights stay shorter: 2.6 rounds against 3.9.
   - If strike-backs were only a menu choice picked a third of the time, it would be 26–31%. See `dial.cjs`.
5. **Enemies without HP: decided.**
   - Bundle the free SRD 5.1 monster list (CC-BY 4.0, with one attribution line in the app) and match enemies by name.
   - Read the attack lines from combat cards; they come through cleanly, e.g. "Scimitar: +4, 1d6+2s".
   - If nothing matches, the app asks the DM for HP when the fight starts and suggests a value from the CR.
   - The book's own stat block always wins over the SRD.
   - Reading AC and HP from the card layout can come later, if needed.
6. **Saved fights: decided, convert by proportion.**
   - Wounds become lost HP by share. A hero with 2 of 4 wounds is at half HP; an enemy with 1 of 3 wounds is at two-thirds of its stat-block HP.
   - Stamina starts full.
   - The fight log notes the conversion, and Undo can't go back past it.
   - The wound engine is removed; there is still only one Stakes system.
7. **Player screen: decided.**
   - Heroes show exact HP and stamina.
   - Enemies show only a state: Fresh, Hurt, Bloodied (½ HP), **Wavering** (at its breaking point, the Monster Hunter cue) or Down.
   - Enemy numbers never reach the player screen. The DM view always shows exact numbers.
