# Player screen

Start Quillbound with `npm start`, then open http://localhost:5173.

1. Click **Player screen**, then **Open player screen**. Move that tab to your TV or second display. Keep both pages in the same browser, using the same address (localhost and 127.0.0.1 are different origins).
2. On the DM desk, choose **Reveal…** on a story beat, hook, NPC or item. Review its title and write what the party has learned. Confirm **Show players**.
3. Choose **Shown · edit** to change or hide that card. Private changes do not overwrite approved public text.
4. In the library, **Show players** opens an image preview. Check for DM labels, choose a public title, then confirm. Only the image and public title are transmitted; original filenames and metadata are excluded. A large image is resized to at most 2400 pixels along its longest edge.
5. The **Player screen** controls can optionally show the party and the current encounter. Combat sharing reveals all enemies in that encounter; leave it off if there are hidden enemies.
6. **Clear map / read-aloud** clears the spotlight. **Hide everything** removes all revealed cards, party information, combat information and the spotlight.

Revealed cards and sharing preferences are saved on the DM page. The map or read-aloud spotlight is held only in memory and clears when the DM page reloads. Refreshing the player page requests the current approved feed from the open DM page. If the DM page closes, the player page keeps the last reveal and displays a waiting message.

The player page does not load the DM save, adventure importer or campaign state. Its feed is built from an explicit list of approved fields. NPC motives, secrets, roleplay notes, story branches, solutions, enemy statistics, plans, goal clocks and the DM log are excluded.

This feature is a local presentation screen, not account-based access control. Someone who can operate the DM browser or inspect its storage can access DM material. It does not synchronize to separate devices. No PIN is presented as security; remote player access will require authenticated accounts and server-side permissions.

Run `node tools/player-check.cjs` to check private-field filtering, explicit reveals, HTML escaping, app initialization and paired DM/player updates.


## Current dice and dramatic-moment rules

See DRAMATIC-MOMENTS.md for the current rules: actions choose their sheet bonuses automatically, all player dice are public immediately, the DM has a private roller, and both sides can trigger automatic dramatic moments. These rules replace the earlier manual ability/training selection and confirmed-only roll display.
