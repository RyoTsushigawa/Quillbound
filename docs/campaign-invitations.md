# Campaign invitations — implementation contract

Status: **invite UI released on main for a two-account live trial, after the owner confirmed the Firestore rules were published.** Automated tests and rule tests pass; these are not end-to-end browser tests, so the two-account exercise below is still open.

## User flow
1. DM signs in, opens Campaigns → Invite players, creates an invitation with 128-bit random hex token (using crypto.getRandomValues). Show a copyable URL carrying the token in the URL fragment, so it is not sent as an HTTP request path/query.
2. Player opens link, signs in, sees campaign name and expiry, selects one of their own characters and explicitly submits it.
3. DM reviews requests (character name and sheet only), approves a player, and creates an existing `sharedHeroes` record with the DM UID and applicant UID. The matching character is imported into the campaign. Existing revisioned sync owns subsequent updates.
4. DM can decline (delete request), or revoke the invitation by setting `active: false`. Revoking a link stops new submissions; it does **not** revoke already shared characters.
5. Existing file sharing remains accessible offline.

## Firestore schema
- `campaignInvites/{32-char-hex-token}`: `dmUid`, `campaignName`, `active`, `expiresAt`, `createdAt`
- `campaignInvites/{token}/requests/{playerUid}`: `playerUid`, `name`, `sheetJson`, `createdAt`
- Approved shares reuse `sharedHeroes/{id}` as currently defined.

## Security boundaries
- Tokens must come from a cryptographically secure random source, never from `Math.random`.
- Only direct document `get` for a known token is permitted. Listing invitation documents is forbidden.
- Never store campaign data, hidden scenes, notes, maps, party details, or player emails in invitation documents.
- Only the signed-in player can create their own immutable request.
- Only the invitation's DM or requesting player may read a submitted request; DM can list pending submissions for a known invitation.
- In the current rules draft, the DM alone creates approved `sharedHeroes` records; player submissions never directly grant access to DM data.
- A request carries a player-supplied `sheetJson`; client must validate with `QBSharedHeroes.read(..., cmSheet)` and escape all output before displaying. Firestore rules enforce size and shape, not D&D semantics.
- A token is a bearer secret. Do not put it in logs, analytics, screenshots, or chat previews. Strip it from the URL after reading.
- An invitation expires within seven days and can be disabled earlier. No requests are accepted afterward.

## Deployment gate
Before any UI is exposed to users:
1. Publish the Firestore rules to the correct Firebase project through its controlled deployment process.
2. In Firebase emulator tests, verify rejection of token enumeration, cross-user request reads, impersonation, updates to another player's request, submission on expired/revoked invites, and unauthorized sharedHero creation.
3. Verify the DM can list requests for a known invitation and can approve via existing sharedHeroes mechanism.
4. Exercise sign-in, link sharing, pending state, rejection, approval, syncing, and offline fallback in a staging build.
5. Only then enable the player/DM invitation UI.

## Design constraints
Show “Invite players” as a primary campaign action, “Join campaign” on My heroes, and a simple three-state queue: Pending / Connected / Declined. Keep import/export in More options. Do not migrate saved campaigns.

## Owner-assisted Firestore release checklist (no local tools required)
1. Confirm the exact Firebase project ID is `dnd-stuff-6dbe2`. Do not deploy to a similarly named project.
2. Open Firebase Console → Firestore Database → Rules. Copy the **currently published rules** into a private backup file before editing. Do not include credentials.
3. Compare the published rules against the repository's `firestore.rules`: preserve the existing `sharedHeroes`, `liveSessions`, and final deny-all blocks. Only the reviewed invitation match blocks should be new.
4. Require a green invitation emulator run and a green general Quillbound CI run **for the exact final commit**. Confirm no permissions changed after those runs.
5. Run a two-account end-to-end exercise in staging before publishing rules. Both accounts must be signed in; test invite creation, redemption, submission, review, approval, sync, expired/revoked invite rejection, and rejection of unrelated-account access.
6. Only after the above checks, publish the reviewed full rules in Firebase Console. Then confirm existing sync still works with a previously linked character.
7. Merge the tested UI only when the rules are live and smoke-tested. The UI must never be deployed before the backend rules.
8. If the new rules break existing sharing, restore the copied previous rules immediately and leave the invitation UI disabled. Rollback of rules may disable the new invite flow without affecting local campaign files.

Do **not** paste a partial invitation snippet over existing rules. Console publish and GitHub merge are different operations: a green CI run does not deploy Firestore rules.

## Remaining release blockers
- Browser-backed end-to-end verification with two separate Google accounts.
- Verify invite creation and approval against the real Firebase authentication environment, not just emulator policy tests.
- Publish rules using the owner's Firebase Console access, then verify existing sync and invitations before merging the UI.
- Validate disabled invite handling, duplicate submissions, and interrupted approval recovery on real browsers.
