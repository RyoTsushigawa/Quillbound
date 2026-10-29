# Quillbound

A D&D 5e table helper: a hero creator (SRD 5.2), homebrew backgrounds, species and classes, and Stakes combat (HP, stamina, grazes and breaking points). It runs entirely in the browser; no account or AI subscription is needed.

## Using it

- **Online:** open the GitHub Pages link for this repository. Everything you make is saved in your own browser.
- **On your computer:** run `Start Quillbound.cmd` (Windows, needs Node.js), or `npm start`, then open http://localhost:5173/.

The Night Shift's homebrew (the Vampire species and the Artificer class) is built in and appears, approved, the first time you open the app. It is defined in `src/app/table-homebrew.js`.

## For anyone changing the code (people, ChatGPT, Claude)

- Read `AGENTS.md` and `PROJECT-RULES.md` first.
- `RULES.md` describes how the app behaves now; keep it in step with the code.
- `npm test` runs every check (run `npm install` once first).
- Plain HTML, CSS and JavaScript: `index.html` holds the interface, `src/app/` the rules, `tools/` the checks.

## Not in this repository

Paid adventure content (`samples/`, `out/`, `prototypes/stakes-v2/library-raw.json`) stays on the DM's computer.

## Credits

Game rules from the System Reference Document 5.1 and 5.2 by Wizards of the Coast LLC, under CC-BY 4.0 (see Help → Credits in the app). PDF reading uses pdf.js (Apache 2.0) in `vendor/`. `src/app/phb-feats.js` lists the 2024 Player's Handbook feats by name with summaries written for Quillbound, not the book's text; Dungeons & Dragons is a trademark of Wizards of the Coast.
