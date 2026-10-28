# Stakes: simple combat playtest

Select a hero, choose Attack / Defend / Help / Move / Improvise, select a target, and roll. You can roll on screen or enter a physical d20 result. Confirm the result to apply it. Undo restores wounds, conditions, positions, openings, protection and spotlight use.

Each d20 face is equally likely. The on-screen die uses browser random numbers with rejection sampling: no weighting or manufactured criticals. Natural 1 and 20 override bonuses. Helping gives normal advantage (two independent fair dice, keep the higher), which changes the chances in the same way as ordinary advantage. Enter the kept die when rolling physically.

- Natural 20: accomplish the action and choose an extra benefit.
- Total 15+: accomplish the action.
- Total 8–14: accomplish it and choose a consequence.
- Total 7 or less: the opposition gains ground.
- Natural 1: choose a major reversal: two wounds, separation and pinning, or a major enemy achievement.

The bonus is the chosen 5e ability modifier plus proficiency when trained. The ability, training, target and intended result are chosen before rolling. The screen shows the entire calculation.

Attack deals one wound. Heroes have four wound boxes; enemies retain their imported one-to-four-box staying power, or their mob size. A full wound track means out of the fight, not automatically dead. Defend absorbs one incoming enemy wound; Help grants one opening. These benefits do not stack. Defending against an enemy move consumes the enemy’s spotlight, not the hero’s. An enemy move on a mixed defense causes one wound, a setback one wound plus Exposed, and a natural 1 two wounds.

Improvise creates a condition, moves a target, deals a wound, or achieves a stated objective. Agree what is possible and what the action accomplishes before rolling. Conditions are plain language: a disarmed swordsman must recover a weapon or act another way. They do not automatically reduce to a numeric modifier.

Move tokens by dragging, or select a token and click a destination under the board. Free placement is a DM correction, not a rolled action; choose Move when reaching that place is risky. Name the three areas to suit the scene. Start a new round to reset who has acted. The tracker asks before skipping characters who can still act.

The player screen receives the scene only when combat sharing is enabled. It shows hero wound counts, enemy hurt/out descriptions, locations, conditions, and confirmed dice results. Enemy wound capacity, stats, plans and the DM log remain private. Combat sharing includes every enemy; leave it off when an encounter contains hidden enemies.

Momentum, goal clocks and automatic boss phases are absent from this playtest flow. The previous data is retained in the save so an existing encounter can still be opened. Spell slots, limited features, healing resources, armor differences and the complete 5e feature set need more design work; this is a playable combat prototype, not a finished 5e conversion.


## Current dice and dramatic-moment rules

See DRAMATIC-MOMENTS.md for the current rules: actions choose their sheet bonuses automatically, all player dice are public immediately, the DM has a private roller, and both sides can trigger automatic dramatic moments. These rules replace the earlier manual ability/training selection and confirmed-only roll display.
