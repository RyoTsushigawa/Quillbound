# Prepared encounters and scene objectives

Combat supports optional objectives beside attacks. Ordinary fights need no objective data. A prepared encounter may carry `zones` (cover, center, objective), `design` (mode, clues, discoveries, clocks, phases, objectives), and each `foes` entry may specify `zone`, `privatePlan`, `observableTell`, `publicName`, and `concealed`. Starting the fight deep-copies those settings; live progress never changes the saved template. Restarting starts from its prepared values.

An objective has `id`, `name`, `description`, `zone` (`any` or a combat area), `abilities`, `size` (1–12), `filled`, `requires` (other objective IDs), `stakes`, `success` (private DM follow-up), and optional `automatic`, `shared`, and `publicName`.

Choose a ready hero and **Attempt objective**. It prepares an ordinary Improvise/objective exchange. The DM chooses an allowed ability, whether proficiency applies, or enters the full skill/tool check bonus from the sheet (including Expertise when applicable). That explicit bonus is used instead of the ability calculation. Existing fair dice, Opening, Push and success bands apply. Confirmation adds one progress on 15+, 8–14, or natural 20; a mixed success still has its normal consequence. A setback/natural 1 adds none. Cancel spends nothing. Undo restores progress, position, HP, stamina and the actor's action together.

An `automatic` objective is only for a certain outcome, such as signing a release after all locks open. **Use action · no roll** spends the hero's normal action without inventing dice. It still enforces prerequisites and position. Free-form Improvise remains available; prepared objectives are suggestions, not a list of permitted creativity.

Only progress is automated. The `success` note tells the DM what to apply next: deactivate a guardian, open a passage, stop a clock or end the scene. The engine does not infer these effects, add boss turns, advance clocks, trigger phases, decide victory, or revive opponents. DM progress correction is for spells, roleplay or corrections and does not spend an action; resolve the appropriate action separately.

**Prepare objective…** adds or edits cards during combat. Sharing requires a reviewed public title. Player data contains only that title and progress; checks, prerequisites, solutions and private follow-up are excluded. Pending rolls block edits/corrections. Public dice still remain public after Cancel or Undo.

**Record an action resolved at the table…** spends the selected combatant's normal action and logs the result of a manually adjudicated spell/feature. It does not invent an attack roll or automate spell slots, saves, HP or conditions. Use the ordinary correction controls for those effects. This allows saving-throw spells to be resolved correctly without treating them as weapon attacks against AC. Bonus actions/reactions remain manual and should not be recorded as a second normal action.

Artificer Help and other default support approaches now use Intelligence rather than falling back to Strength. Custom `combatActions` overrides continue to apply to ordinary actions.

Verification: `node tools/scene-objectives-check.cjs`, then `npm test`. Includes prepared encounter cloning, restart, prerequisites, positioning, action limits, every outcome band, Push/cancel/Undo, full skill bonus, no-roll tasks, manual actions, stale pending checks and player-feed privacy.
