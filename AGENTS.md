# Quillbound project instructions

Read PROJECT-RULES.md before making changes. RULES.md describes how the app currently behaves; keep it in step with the code. Never generate AI pictures for any part of this project. Keep d20 outcomes fair and unweighted.

## Working in parallel (Claude and ChatGPT)

Quillbound is developed by two assistants through GitHub. Keep to these boundaries so neither overwrites the other:

- **Character creation (Claude):** character data, species, classes, subclasses, feats, equipment, homebrew validation, character-sheet generation, player mode and the Adventure manager. Files: `src/ui/creator.js`, `src/ui/homebrew.js`, `src/ui/campaigns.js`, `src/app/campaigns.js` (the screens, once moved out of `index.html`), `src/app/hero-rules.js`, `homebrew.js`, `phb-feats.js`, `table-homebrew.js`, `sheet-export.js`, `srd-heroes.js`, `creator.css`; tests `tools/hero-check.cjs`, `homebrew-check.cjs`, `sheet-check.cjs`.
- **Combat (ChatGPT):** attack resolution, HP during combat, enemy turns, strike-backs, conditions, encounter lifecycle, enemy morale, combat tests. Files: `src/app/combat-rules.js`, `attacks.js`, `encounter-design.js`, `conditions.js`; combat tests. Change the other side's files only where integration requires it.
- **Shared:** `index.html` (preserve the other side's sections; make small, targeted edits, never replace the file) and `package.json` (keep every existing test command when adding one). The long-term plan is to move each side's interface out of `index.html` into its own module.
- **The contract between them:** a hero record's `attacks` list keeps every attack with `name`, `bonus`, `damage` and `count` (it may carry extra fields such as `type`, `save` and `kind`). Custom abilities and resources stay structured character data; the creator doesn't implement their effects in its interface.
- **Workflow:** start from the latest `main`, use a focused branch (`creator/…` or `combat/…`) and a pull request; CI runs `npm test` on every PR.
- The Night Shift's vampire Artificer is called **Toxik** (with a K).
