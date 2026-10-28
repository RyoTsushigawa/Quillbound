# Homebrew: your own species, backgrounds and classes (plan)

Nothing has been built yet. This is the "healthy framework" you asked for earlier: you build within a structure, and the app shows how your creation compares with the SRD ones before anyone plays it.

## The idea

Each kind of homebrew gets a fixed structure taken from the 2024 rules, and a comparison against all SRD options of the same kind.

- **The comparison guides; it doesn't block.** You see "within the SRD range", "stronger than any SRD class at level 5" and so on.
- **The DM decides.** Every homebrew has an **Approved by the DM** switch. Only approved homebrew appears in the hero creator for players.
- **Custom rules text is allowed.** Anything the app can't calculate is shown as text and marked "not calculated", so the comparison is honest about what it counts.

## 1. Backgrounds (exact 2024 structure)

A 2024 background always has the same parts, so a homebrew background follows them exactly:

- three abilities it can raise
- one origin feat (from the SRD or your own)
- two skills
- one tool
- a kit worth about 50 GP, or 50 GP

The app checks each part, so a homebrew background is as balanced as an SRD one by construction.

## 2. Species (trait budget)

- **Base:** size (Small or Medium), speed (25–35 ft), creature type.
- **Traits** come from a catalogue of building blocks. Each block has a weight:
  - darkvision 60 or 120 ft
  - resistance to one damage type
  - one skill
  - a cantrip
  - spells at levels 3 and 5
  - +5 ft speed
  - a breath-weapon-style attack
  - extra HP per level
  - an origin feat
  - a once-per-rest save from 0 HP
  - advantage against one condition
  - a custom trait, which the DM rates 1–3
- **Calibration:** the weights are tuned so that all 9 SRD species (and their lineages) land in the same band. Your species is then shown against that band: below, within or above.
- **Optional lineages:** the same building blocks, budgeted the way the SRD lineages are (Drow, High Elf, Draconic Ancestors and so on).

## 3. Classes (base, progression, features, measured)

- **Base:**
  - hit die (d6–d12)
  - primary ability
  - two saving throws (one of Strength, Dexterity or Constitution, one of the others, as in the SRD)
  - skill choices
  - armor and weapon training
  - a starting kit
- **Progression template:**
  - **Martial:** Extra Attack at level 5.
  - **Half caster:** Paladin and Ranger slots.
  - **Full caster:** Wizard slots.
  - **Pact:** Warlock slots.

  Ability score improvements come at 4, 8, 12, 16 and an Epic Boon at 19. You choose a spell list from the SRD class lists.
- **Features per level:** pick from SRD features the engine already calculates, or write your own text, marked "not calculated".
  - The calculated ones are Sneak Attack dice, Rage, Unarmored Defense (with an ability of your choice), Martial Arts dice, Fighting Style, Expertise, Extra Attack and weapon mastery count.
- **Subclass:** a name plus features at levels 3, 6, 10 and 14, either as text or as calculated features.
- **Measured against the 12 SRD classes,** live while you build. Each class's Quick build hero at levels 1, 5, 11 and 17 gives HP, AC, best attack bonus and expected damage per action against AC 15:

  | Class | L1 | L5 | L11 | L17 |
  |---|---|---|---|---|
  | Fighter | 11 HP · AC 17 · 6.8 | 39 · 17 · 17.1 | 81 · 17 · 27.2 | 174 · 17 · 28.9 |
  | Rogue | 10 · 14 · 6.8 | 38 · 15 · 14.0 | 102 · 15 · 23.5 | 173 · 16 · 36.0 |
  | Wizard | 8 · 11 · 4.4 | 32 · 11 · 10.1 | 79 · 11 · 16.1 | 138 · 12 · 22.8 |
  | Cleric | 10 · 16 · 3.0 | 38 · 16 · 7.0 | 91 · 16 · 11.1 | 156 · 17 · 15.8 |

  The comparison only counts weapons and cantrips, not spell slots or limited features. Spellcasters' real power is therefore higher, and the comparison says so.
- **Optional deeper test:** run the homebrew class through the Stakes simulator on the 29 library fights, next to a Fighter and a Wizard of the same level. It takes a few seconds.

## Storage and sharing

- Homebrew is saved in the browser with the rest of the campaign (`S.homebrew`).
- **Export** writes a `.json` file you can keep or give to another DM. **Import** reads one back after a preview, and replaces nothing without asking.
- In the creator, homebrew shows with a "Homebrew" chip, and the hero keeps a copy of what was used, so it still works if the homebrew is later changed or deleted.

## Decided (2026-10-28)

- **Guide plus DM approval.** The comparison never blocks saving. Only homebrew the DM switches to Approved appears to players.
- **Start with backgrounds, then species.** Classes come third.
- **Stakes simulation:** yes, on request, through a "Test in fights" button on the class comparison.

## Build order

1. **Backgrounds and the homebrew screen:** storage, export and import, DM approval, and the creator showing approved homebrew.
2. **Species,** with the calibrated trait budget.
3. **Classes,** with the live comparison table.
4. **Optional:** the Stakes simulation comparison.

Every step ends with checks, a browser test, RULES.md and republishing.
