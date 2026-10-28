# Stakes v2 prototype: damage thresholds, threat, Hit Dice as stamina

> **Newer:** wound boxes were questioned, and HP + stamina was tested on 29 fights from the adventure library. See [HP-STAMINA.md](HP-STAMINA.md) (`hp-stamina.cjs`, `library.cjs`, `extract.mjs`). The study below is the earlier wounds-based one.

Not part of the app. Nothing in `index.html` or `src/` reads this folder.
Every d20 here is fair and unweighted.

| File | What it does |
|---|---|
| `model.cjs` | The rules as pure functions: current Stakes ("v1") and the proposal ("v2") |
| `data.cjs` | 5 heroes at level 1 and 5 (app's recommended scores), 5 real stat blocks from the library, 6 encounters |
| `odds.cjs` | Exact odds for one roll and the design targets (PASS/FAIL) |
| `fights.cjs` | Monte Carlo of whole fights: plain 5e vs Stakes now vs v2 |
| `tune.cjs` | Pacing sweep of the open levers |

```bash
node prototypes/stakes-v2/odds.cjs
```
```bash
node prototypes/stakes-v2/tune.cjs 10000
```

## The rules as they stand now

- **Hitting:** the same d20 bands as today. A landed hit rolls normal 5e damage and compares it to the target's thresholds: under Major = 1 wound, Major or more = 2, Severe or more = 3.
- **Enemy thresholds** come from 5e hit points: Major = HP ÷ 4 (minimum 3), Severe = 2 × Major.
- **Hero thresholds** come from armor and level: Major = AC + ½(AC − 10), rounded down, + level − 6, and Severe = 2 × Major.
  - AC 16 at level 1 gives 14 / 28; AC 11 gives 6 / 12.
  - My first draft (AC − 5 + level) failed the "plate matters against a boss" target, so armor now counts one and a half times.
- **Threat:** the enemy's tier moves the wounds its moves cause. Minion −1, Standard and Elite 0, Boss +1. On top of that, a mixed result takes one step off and a natural 1 adds one.
- **Counter-damage:** when a hero's own roll goes wrong, a dangerous target hits back; minions only cost position.
- **Hit Dice as stamina:** spend one to take a wound less, or to make a Last Stand (once per fight) instead of dropping.
- **Proficiency:** always proficient with your own attack and defense. Today the app only counts the class's saving throws, which leaves the Paladin attacking untrained.

## Exact odds: all 7 targets pass

| Target | Result |
|---|---|
| Heavy armor cuts wounds ≥30% vs the same hero unarmored: L1 Ackshie / L5 Ackshie / L5 Happy Jack | 41% / 58% / 31% |
| Biggest weapon deals ≥30% more wounds per hit than the smallest: L1 / L5 | +34% / +46% |
| Wounds per move rise with tier (vs a level-5 fighter) | 0.05 < 0.15 < 0.38 < 0.91 |
| Paladin (AC 18) defends at least as well as Wizard (AC 11) | 0.72 vs 1.15 wounds per Ackshie move |

Today none of this holds. Every hit is 1 wound, armor plays no part, and the Paladin defends worst of the five.

## Whole fights: the problem the odds didn't show

The simulation runs a party of five with simple, identical tactics in every model: heroes focus the weakest enemy, and each enemy hits a random hero. There is no healing and no breaking points, and each row is 10,000 fights. "Down" means the fights in which at least one hero drops.

| Fight | Plain 5e | Stakes now | v2 as drafted | v2 tuned (D) | D with Hit Dice |
|---|---|---|---|---|---|
| L1 Easy: 3 lookouts | 2.1 rounds, 4% down | 1.0, 0% | 1.0, 0% | 1.0, 0% | 0% |
| L1 Medium: 2 cultists + 3 lookouts | 3.1, 22% | 2.0, 1% | 1.9, 0% | 2.0, 0% | 0% |
| L1 Deadly: Ackshie | 3.6, 80% (6% party loss) | 1.0, 0% | 1.1, 2% | 1.8, 15% | 6% |
| L5 Easy: Guz | 1.7, 0% | 1.0, 0% | 1.0, 0% | 1.2, 0% | 0% |
| L5 Hard: Guz + Ackshie | 2.9, 1% | 1.9, 0% | 1.5, 2% | 2.2, 5% | 0% |
| L5 Deadly: Happy Jack + 4 cultists | 3.4, 14% | 3.0, 7% | 2.3, 23% | 3.6, 63% | 7% |

What this shows:

1. **Fights are too short, today and in the draft.**
   - Five heroes land about 85% of the time.
   - An Elite has 3 boxes (4 in the draft), so a single enemy usually dies before it acts.
   - Thresholds alone don't fix this. More boxes for big enemies, plus a "graze" (an 8–14 hit deals at most 1 wound), brings boss fights to 5e length.
2. **Small enemies are harmless.**
   - A one-box minion dies to almost any hit, so making minions hit harder (variant C) changed nothing: they never get to act.
   - In 5e, the level-1 medium fight drops someone 22% of the time. In every Stakes version it is 0%.
3. **Uncapped Hit Dice make level-5 heroes nearly unkillable.**
   - 5 dice per hero work like a second health bar: 0–2% down in the Jack fight.
   - Capping spending at the proficiency bonus per fight gives 7%, close to 5e's 14%.

The tuned set **D** is: graze on 8–14 hits, boxes Minion 1 / Standard 3 / Elite 6 / Boss 10, minion threat 0, and Hit Dice spending capped at the proficiency bonus per fight.

## Limits of the simulation

- No healing, spells with saves, positioning, breaking points, Defend/Help or dramatic moments.
- The party is always five heroes.
- Everyone goes in a fixed order: heroes first, the same in every model.
- Stakes v1 counter-damage is modelled as "the DM picks a wound one time in three".
- The 5e column is a reference point, not a target. Level-1 5e is famously swingy, and Stakes doesn't need to match it.

## Decisions that are yours

1. **Enemy boxes.** Raise Elite and Boss boxes (6 / 10) so solo enemies last 2–4 rounds, or keep fights short on purpose.
2. **Graze.** Should a mixed (8–14) hit deal at most 1 wound?
3. **Minions and mobs.** Should groups of small enemies be a real threat? If yes, they need to get to act: for example, a mob strikes before it loses members, or the mob's boxes are worth more than one per member. The simulator can test whichever you prefer.
4. **Hit Dice cap.** Proficiency bonus per fight, all of them, or another number.
5. **Hero thresholds** are a formula on the hero card (players see two numbers, not the maths). Is that acceptable for the "less math" goal?
