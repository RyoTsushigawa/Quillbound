# Once-per-turn on-hit damage riders

**Scope:** Combat rules only. This change does not edit the hero creator or the proposed Adventure Maker.

Some 2024 and homebrew features add extra damage to one qualifying hit on the hero's turn. Combat now supports one optional damage rider per Attack action, independently of the weapon's ordinary damage.

## Toxik's Lightning Launcher

Toxik (Artificer 5, Armorer) can use the Lightning Launcher and the Tesla-Faltschwert during the same Attack action. The Armorer Lightning Launcher gains **+1d6 lightning damage once per turn when it hits**; this bonus is separate from the launcher's ordinary `1d6+4` damage.

- The extra die applies to **one full hit or critical hit** from the Lightning Launcher. A graze still deals half ordinary weapon damage but does not qualify as a hit for the rider.
- If multiple qualifying launcher hits occur, the DM can choose which hit receives the rider before confirming. Switching between hits reuses the same fair dice, rather than rolling again.
- On a critical hit, the extra damage die is doubled just like other damage dice. A normal hit receives only one die.
- A Push that upgrades a graze or miss to a hit updates the available choices. The extra damage does not automatically activate when no qualifying hit exists.
- The bonus is tracked as used for the current round/turn, is restored for the next round, and Undo reverses the expenditure with the exchange.
- The attack is still part of **one Attack action**, so the existing one-strike-back cap remains unchanged.

The combat result panel shows the selected bonus hit and separate bonus damage. The DM may enter physical dice or explicitly reroll before confirming.

## Reusable homebrew combat metadata

A custom hero can supply a combat-only `combatRiders` array without changing the character creator:

```js
hero.combatRiders = [{
  attack: 'Ash Needle',
  id: 'ash-needle-bonus',
  name: 'Ash flare',
  dice: '2d4',
  trigger: 'hit',
  limit: 'turn'
}];
```

The `attack` name must match a weapon or technique on the hero's existing attack list. Dice expressions are intentionally limited to 1–12 dice using d4, d6, d8, d10 or d12. Invalid dice are ignored rather than silently applying an arbitrary bonus.

The engine also recognizes the built-in Armorer's Lightning Launcher rider by its class, subclass and attack name; this requires no extra profile configuration for Toxik when using an Armorer sheet.

## Current limits

- This pass handles **one on-hit rider selected within each Attack action**. It is not a general automation engine for spell concentration, saving throws, reactions, healing, or arbitrary class features.
- At present, Stakes allows a hero to act once per round. Within that model, turn use is tracked through the round and resets at the next round. Out-of-turn reaction attacks need a later explicit turn-boundary model.
- A creature defeated by an earlier attack is no longer a valid target for later effects. If the player selects an ineligible later hit, its rider does not deal extra damage.
- For 2024 fidelity, **graze is not treated as a hit** for rules that require an actual hit. The normal Quillbound half-damage graze rule still applies.

## Regression checks

Run `node tools/rider-check.cjs`, or `npm test` for the complete suite. Cases include Toxik's mixed-weapon turn, critical hits, switching without rerolling, grazes, Push, Undo, turn reset, and generic homebrew metadata.