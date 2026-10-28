# HP + stamina, tested on fights from your library

Prototype only; the app is untouched.
This follows the proposal already in RULES.md: HP stays the harm track, and stamina is a small pool for optional exertion, not damage absorption.

```bash
node prototypes/stakes-v2/hp-stamina.cjs 3000
```

## Where the fights come from

- `extract.mjs` ran the offline reader over the adventure zips in `C:\Users\Ryo\Desktop\Dnd`. 17 books were usable.
  - For each book it took the party level from its own sentence ("four or five players of 4th-level characters").
  - It also took the book's stat blocks and every "number + creature" phrase.
- I picked **29 fights** by hand from that output, at levels 1–8, 15 and 20.
  - Examples: *Shadows of Lastwatch Keep* "Six drow… Six trained goblins" (p.6), and *Curse of Wardenwood* "There are twelve wolfchildren" (p.10).
  - The list is in `library.cjs`, each with book and page.
- **Monster stats:**
  - Book stat blocks keep the book's numbers.
  - Standard monsters (drow, goblin, chimera, scout and so on) use SRD numbers.
  - Damage that really needs a saving throw (spirit guardians, poison riders) is approximated as an attack roll.
- **Party:** five heroes (Fighter, Paladin, Rogue, Cleric, Wizard) grown by the usual 5e milestones, with magic weapon and armor bonuses at levels 8, 15 and 20.
  - They use weapons and cantrips only, with no spell slots, healing or smites, in every model, so the comparison stays fair.
- **Fights:** random initiative. Heroes focus the most hurt enemy, and enemies hit a random hero. No retreat or breaking points.
- **Runs:** 3,000 runs per cell, with a fixed seed. All d20s are fair.

## The models

| Model | Hitting | Defending | Damage |
|---|---|---|---|
| **5e** | attack roll vs AC | enemy attack roll vs AC | HP |
| **Stakes now** | fixed bands, 8+ lands | fixed bands, 15+ avoids | wound boxes by CR tier, 1 per hit |
| **HP vs AC** | hit at AC or more; up to 5 below = **graze** (half damage) | hero rolls d20 + AC − 10 vs 11 + enemy bonus; up to 5 below = half damage | HP |

In the HP models, a hero's graze or miss has a cost: one time in three the target strikes back once. A natural 1 on defense is a critical hit.

**Stamina:** a pool equal to the proficiency bonus, refilled each fight in this test. Spend 1 to **push** your own roll. At 0 you're **Winded** and can't push. Three versions of a push were tested.

## Results (average over all 29 fights)

| | 5e | Stakes now | HP vs AC | + push: re-roll, keep better | + push: re-roll, keep new | + push: +1d4 |
|---|---|---|---|---|---|---|
| Rounds | 3.9 | 2.2 | 3.5 | 3.0 | 3.2 | 3.2 |
| Someone drops | 38% | 9% | 32% | 19% | 25% | 25% |
| Party wiped | 5% | 3% | 1% | 0% | 1% | 1% |
| Average gap to 5e, fight by fight | — | 33% | **8%** | 20% | 14% | 13% |

Some single fights, showing the chance someone drops (5e → Stakes now → HP vs AC → HP vs AC with a +1d4 push):

| Fight | 5e | Stakes now | HP vs AC | +1d4 push |
|---|---|---|---|---|
| L1 Ghostlight, 2 worgs | 70% | 0% | 72% | 59% |
| L4 Lastwatch, Gulaira the drow commando | 69% | 0% | 72% | 59% |
| L4 Lastwatch, chimera + 2 drow | 89% | 1% | 75% | 64% |
| L6 Black Rose, Arena Champion | 73% | 0% | 64% | 50% |
| L7 Wardenwood, werewolf + 12 wolfchildren | 100% (93% wipe) | 100% (91% wipe) | 91% (21% wipe) | 87% (13% wipe) |
| L15 Gate, Moon Worm | 48% | 0% | 41% | 33% |

## What it says

1. **HP fixes the problems the wound boxes had.** Book HP, party size and minions all just work, and the book's encounters feel as dangerous as the author meant: on average about 3.5 rounds and 8 points off 5e.
2. **Stakes now is far too safe.** Solo bosses die in round 1 (Gulaira, Snow Mutant, Arena Champion, Moon Worm: 0% chance anyone drops, against 48–73% in 5e). Danger appears only in big mobs, where it is sometimes higher than 5e (8 snow apes: 52% vs 3%).
3. **Fixed bands don't work with HP.** If bands ignore AC, heroes land 85% of the time. In earlier runs that model (with stamina) was 23–30 points off 5e, so bands need to be measured from AC and attack bonus. The roll stays the familiar Stakes roll (success / graze / miss); only the line it is measured against comes from the book.
4. **Stamina makes fights safer even though it never touches HP.**
   - Pushing your own attacks ends fights sooner, so enemies get fewer turns.
   - A full keep-the-better re-roll halves the danger (38% → 19%).
   - A **+1d4 push** or a **re-roll where you must keep the new result** costs about a third of the danger (→ 25%) and feels like effort, not a safety net.
   - Allowing pushes on defense as well would bring it down to 12% (earlier run). That is damage absorption in disguise.
5. **Graze bands make whole-party wipes rarer than in 5e** (1% vs 5%), even where individual heroes drop just as often. Half damage on near misses smooths out the worst runs.

## Limits

- No healing, spells with saves, area damage, positioning, retreat or breaking points. Breaking points would end Stakes fights earlier.
- Stamina refills every fight here. If it refills only on a short rest, it matters less per fight.
- Hero builds are typical, not optimised. The level-15 and level-20 heroes have no spell slots, which badly undersells them.
- `library-raw.json` (extractor output) contains short text snippets from your paid books. It stays local, like `samples/`; never publish it.

## Decided (2026-10-27)

- **Bands measured from 5e numbers:**
  - Attack: hit at AC or more, graze (half damage) up to 5 below.
  - Defense: d20 + AC − 10 against 11 + the enemy's attack bonus, with the same graze band.
- **Push:** spend 1 stamina to add 1d4 to **your own action's** roll. Defense rolls can't be pushed.
- **Stamina:** a pool equal to the proficiency bonus, refilled **only on a long rest**, so Winded matters late in a dungeon. It is kept separate from Hit Dice.
- **Graze:** a hero's attack that misses by up to 5 still deals half damage. Enemy attacks hit or miss as in 5e (a natural 1 on the hero's defense roll is a critical hit).

## Stamina size and refill

```bash
node prototypes/stakes-v2/stamina.cjs 1500
```

**Within one fight, the pool size hardly matters.** A hero pushes about 0.7 times per fight on average, because a push only makes sense after a bad roll.

| Pool, full at the start of each fight | Someone drops | Heroes Winded at the end |
|---|---|---|
| none | 32% | — |
| 1 | 27% | 52% |
| 2 | 26% | 19% |
| 3, proficiency bonus, half level, or level | 25% | 5–14% |

(Plain 5e: 38%.)

**Over a whole adventure day, refill timing barely changes the danger.** It changes how often heroes run dry.

- Each book's fights at one level run in book order, 11 books in all.
- HP carries over between fights. One short rest heals with Hit Dice, as in 5e.

| Refill | Someone drops during the day | Party wiped | Heroes start a fight Winded | Pushes per hero per day |
|---|---|---|---|---|
| plain 5e | 74% | 17% | — | — |
| HP vs AC, no stamina | 65% | 8% | — | — |
| proficiency bonus per fight | 56% | 3% | 0% | 1.7 |
| proficiency bonus per short rest | 56% | 3% | 2% (17% in Lastwatch's 3rd fight) | 1.6 |
| proficiency bonus per long rest | 57% | 4% | 8% (42% in Lastwatch's 3rd fight) | 1.4 |
| 2 × proficiency bonus per long rest | 56% | 3% | 1% | 1.7 |
| level per long rest | 57% | 3% | 4% | 1.7 |

What this means:
- **Balance is not the deciding factor.** Every option lands within one point of the others.
- **The choice is about feel: is stamina ever scarce?**
  - Per fight, nobody is ever Winded. It's just "+1d4 when it matters".
  - Per short rest gives 5e's rhythm (like Action Surge or Second Wind). Heroes run dry only in long stretches without a rest.
  - Per long rest makes Winded a real state late in a dungeon. That's tension for the DM to play with, but also more tracking.
- **Keep stamina separate from Hit Dice.** Hit Dice already heal on short rests, so a shared pool would make players choose between healing and effort.
- **The simulated heroes push greedily.** Real players would save pushes when stamina is scarce, which makes a long-rest pool feel tighter than these numbers show.

## The graze window

```bash
node prototypes/stakes-v2/graze.cjs 1500
```

- **Setup:** all 29 library fights, with the decided rules (HP vs AC, +1d4 push, stamina = proficiency bonus).
- **"Nothing happens"** is the share of hero attack rolls that deal no damage.
- **"Heroes only"** means grazes apply to the heroes' attacks. Enemy attacks against heroes then hit or miss as in 5e.

| Graze | Rounds | Someone drops | Party wiped | Gap to 5e | Nothing happens |
|---|---|---|---|---|---|
| plain 5e | 3.9 | 38% | 5% | — | 25% |
| no graze (5e hit chances + push) | 3.5 | 38% | 4% | 3% | 15% |
| 3 below, half damage | 3.3 | 30% | 2% | 9% | 7% |
| **5 below, half damage (tested so far)** | 3.2 | 25% | 1% | 13% | 5% |
| 7 below, half damage | 3.2 | 22% | 0% | 17% | 5% |
| 10 below, half damage | 3.2 | 18% | 0% | 20% | 5% |
| 5 below, flat bonus only | 3.3 | 24% | 0% | 15% | 5% |
| **5 below, heroes only** | 3.3 | 35% | 3% | 5% | 5% |
| 5 below, enemies only | 3.5 | 29% | 1% | 10% | 15% |

What this means:
- **Grazes on the heroes' attacks deliver the "meaningful" goal almost for free.**
  - A hero's attack does nothing only 5% of the time, against 25% in 5e.
  - Danger stays close to 5e: 35% vs 38%, and fights are slightly shorter.
- **Grazes on enemy attacks are what make Stakes safer than 5e.** Half damage on near misses removes about a third of the drops and most of the wipes.
  - Most of that is the window itself: 3 below → 30%, 10 below → 18%.
  - It's a safety dial, not a feel improvement.
- **Half damage and "flat bonus only" play almost the same.** Half damage keeps the damage roll, so it's one rule fewer to explain.

## What Winded means

```bash
node prototypes/stakes-v2/winded.cjs 1500
```

- **Setup:** the decided rules, run over 11 adventure days (each book's fights in order).
- HP carries over between fights, with one short rest that heals with Hit Dice.
- A Winded hero can never push with stamina; each option adds one thing to that.

| Winded means | Someone drops during the day | Drop in the day's last fight | Party wiped | Heroes start a fight Winded | Hit Dice burned per hero |
|---|---|---|---|---|---|
| plain 5e | 74% | 51% | 18% | — | — |
| no stamina at all | 76% | 54% | 20% | — | — |
| **no pushes, nothing else** | 70% | 47% | 14% | 9% | — |
| + catch your breath: a short rest returns 1 stamina | 70% | 47% | 13% | 2% | — |
| + **overexert:** may still push by spending a Hit Die | 70% | 48% | 13% | 9% | 0.25 |
| + grazes stop working | 71% | 50% | 17% | 10% | — |
| + exposed: misses draw a strike-back 2 in 3 instead of 1 in 3 | 73% | 51% | 18% | 9% | — |

What this means:
- **Stamina is worth a few points of safety over a whole day.** Winded heroes are 9% of fight starts on average, more late in long dungeons.
- **Penalty options cancel what stamina gave.** "Grazes stop working" and "exposed" bring danger back to plain 5e (wipes 17–18%). They also punish the hero who is already struggling, which the RULES.md proposal warns against.
- **"Catch your breath on a short rest" undoes the long-rest decision.** Only 2% of fight starts are Winded, so Winded would hardly matter late in a dungeon.
- **Overexert is a choice, not a penalty.**
  - A Winded hero can still push, but pays with a Hit Die, which means less healing at the next short rest.
  - Danger doesn't change; heroes burn about a quarter of a Hit Die per day.
  - It keeps "effort costs you later" in the players' hands and is one sentence to explain.

## Still open

1. ~~Stamina refill~~ (decided: long rest).
2. ~~The graze window~~ (decided: 5 below, half damage, heroes only).
3. ~~What Winded means~~ (decided: no stamina pushes, but you may still push by spending a Hit Die).

All five decisions are settled. The full rule set is in [RULESET.md](RULESET.md).
