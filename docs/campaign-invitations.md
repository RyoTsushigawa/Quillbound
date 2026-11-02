# Campaign invitations — implementation contract

Status: **backend rules draft only; not deployed or enabled in the UI**.

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
