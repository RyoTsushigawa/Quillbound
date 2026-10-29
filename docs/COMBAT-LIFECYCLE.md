## Combat lifecycle and enemy status

The combat board now distinguishes an **ongoing encounter**, a **pending exchange**, an encounter where **no enemies are still fighting**, and an encounter in which **all heroes are down**. This is a derived display state; it does not automatically stop the scene, award treasure, or end combat.

The DM can set a foe to *fighting, down, dead, fled, surrendered,* or *bargained*. A down or dead foe has 0 HP. A surrendering, bargaining, or fleeing foe retains its HP. A DM who returns a 0-HP foe to fighting restores it to 1 HP, and Undo can reverse the change. A status change is blocked until a pending attack is resolved or cancelled.

Simple thugs and groups have identical transitions to bosses. Multi-round encounters maintain individual HP and acted state. No new class features, boss resources or character creator changes.

Tests: `node tools/encounter-lifecycle-check.cjs` and `npm test`.