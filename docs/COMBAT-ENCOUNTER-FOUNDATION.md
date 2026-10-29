# Encounter foundation: thug, group, veteran and boss

**Scope:** Quillbound's existing combat engine. No new boss powers, extra resources or character-creator changes.

## One encounter loop for every enemy

Every enemy uses the same rules:

1. Enter its ordinary stat-block **HP, AC and attack list**. A one-attack street thug needs no additional options.
2. Choose the acting hero or enemy, their action, and the **first target**.
3. When the action involves several attacks, optionally choose a different target for each subsequent attack. Each target uses its own defenses and HP.
4. Roll the normal, fair dice. Resolve attacks **in order**, including damage, strike-back, stamina and any eligible on-hit bonus.
5. Confirm the exchange. **Undo** restores its consequences without removing public dice.

The enemy's declared turn determines the number and types of attacks; selecting different targets does **not** grant additional attacks or turns. The same is true for a Fighter splitting Extra Attack.

### Ordinary encounter: street thug
A thug with one Club attack uses the default one-target flow. No boss phases, special meters, hidden modifiers or extra decisions are needed.

### Group encounter: three thugs
Each thug keeps an individual attack and an individual turn, even when a group card visually organizes them. A grouped enemy is not silently multiplied into a more powerful stat block.

### Veteran or boss: multiple attacks
A veteran captain with Slash, Shield and Slash can aim those three attacks at one hero or divide them among several. Each defender uses **their own armor class** and their own available opening/cover. Damage and resulting hit point changes are applied to the chosen hero.

### Hero Extra Attack
A Fighter with two attacks may choose two different standing foes. Each roll uses its chosen weapon, enemy AC and HP. The Attack action still permits **at most one** eligible enemy strike-back, even across multiple targets.

If the first foe is dropped by a graze, it cannot strike back. A different, still-standing foe may respond to a later miss if the action has not already triggered its one response.

## Boundaries

- Ordinary **single-target attacks work unchanged**; target selection is added only when multiple attacks and multiple valid targets exist.
- This is a targeting improvement, **not** a boss difficulty multiplier. Boss phases, objectives and telegraphs remain optional DM tools rather than mandatory mechanics.
- The player chooses different defenders' dice when an enemy multiattacks, in the order described; each defense roll is publicly recorded.
- Split targeting is currently available for ordinary damage attacks, not for non-damage enemy objectives or area-of-effect saving-throw spells.
- The player screen must continue to receive only its allowlisted public information; private enemy goals are never shared by this feature.

## Validation

Run `node tools/encounter-foundation-check.cjs` or `npm test` for the full regression suite. Tests check single thug attacks, a three-thug group, multiattack bosses splitting across heroes, defender-specific cover, Fighter split attacks, the one-response limit, defeated enemies, and Undo.