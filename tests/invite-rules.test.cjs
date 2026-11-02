const fs = require('node:fs');
const {before, after, test} = require('node:test');
const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing');
const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');
const serverTime = () => firebase.firestore.FieldValue.serverTimestamp();

let env;
const token = 'a'.repeat(32);
const invitePath = `campaignInvites/${token}`;
const requestPath = `${invitePath}/requests/player-user-123`;
const now = Date.now();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'quillbound-invite-rules-test',
    firestore: {rules: fs.readFileSync('firestore.rules', 'utf8')}
  });
  await env.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    await db.doc(invitePath).set({
      dmUid:'dm-user-123', campaignName:'Test Campaign', active:true,
      expiresAt: new Date(now + 86400000), createdAt:new Date(now - 1000)
    });
    await db.doc('campaignInvites/'+'b'.repeat(32)).set({dmUid:'dm-user-123',campaignName:'Expired',active:true,expiresAt:new Date(now-86400000),createdAt:new Date(now-172800000)});
    await db.doc('campaignInvites/'+'c'.repeat(32)).set({dmUid:'dm-user-123',campaignName:'Revoked',active:false,expiresAt:new Date(now+86400000),createdAt:new Date(now-1000)});
    await db.doc(requestPath).set({
      playerUid:'player-user-123', name:'A Hero', sheetJson:'{"build":{}}',
      createdAt: new Date(now - 1000)
    });
  });
});
after(async () => {if(env) await env.cleanup();});
const db = uid => env.authenticatedContext(uid).firestore();

test('signed-in player with invite can read campaign name',async()=>{
  await assertSucceeds(db('player-user-123').doc(invitePath).get());
});
test('signed-out visitor cannot read invite',async()=>{
  await assertFails(env.unauthenticatedContext().firestore().doc(invitePath).get());
});
test('invitation collection enumeration is denied',async()=>{
  await assertFails(db('player-user-123').collection('campaignInvites').get());
});
test('cross-player request reads are denied',async()=>{
  await assertFails(db('other-user-123').doc(requestPath).get());
});
test('DM can view pending request',async()=>{
  await assertSucceeds(db('dm-user-123').doc(requestPath).get());
});
test('player can view their own request',async()=>{
  await assertSucceeds(db('player-user-123').doc(requestPath).get());
});
test('a different player cannot impersonate request owner',async()=>{
  await assertFails(db('other-user-123').doc(`${invitePath}/requests/another-user-123`).set({
    playerUid:'player-user-123',name:'Fake',sheetJson:'{}',createdAt:new Date()
  }));
});
test('requests cannot be edited after submission',async()=>{
  await assertFails(db('player-user-123').doc(requestPath).update({name:'Changed'}));
});
test('only the DM can delete a pending request, aside from its owner',async()=>{
  await assertFails(db('other-user-123').doc(requestPath).delete());
});
test('players cannot create shared hero records on behalf of DM',async()=>{
  await assertFails(db('player-user-123').doc('sharedHeroes/test-share').set({
    dmUid:'dm-user-123',playerUid:'player-user-123',revision:1,
    sheetJson:'{}',campaignName:'Test Campaign',updatedBy:'player-user-123',updatedAt:new Date()
  }));
});

const submission = () => ({playerUid:'player-user-123',name:'New Hero',sheetJson:'{"build":{"name":"New Hero"}}',createdAt:serverTime()});
test('a player can submit one request to an active invitation',async()=>{
  await assertSucceeds(db('player-user-123').doc(`${invitePath}/requests/player-user-123`).get());
  // Use a fresh request ID belonging to a different signed-in player.
  await assertSucceeds(db('new-player-123').doc(`${invitePath}/requests/new-player-123`).set({
    ...submission(),playerUid:'new-player-123'
  }));
});
test('expired invitations reject new submissions',async()=>{
  await assertFails(db('player-user-123').doc(`campaignInvites/${'b'.repeat(32)}/requests/player-user-123`).set(submission()));
});
test('revoked invitations reject new submissions',async()=>{
  await assertFails(db('player-user-123').doc(`campaignInvites/${'c'.repeat(32)}/requests/player-user-123`).set(submission()));
});
test('players cannot modify or revoke an invitation',async()=>{
  await assertFails(db('player-user-123').doc(invitePath).update({active:false}));
});
test('player cannot list other applicants',async()=>{
  await assertFails(db('player-user-123').collection(`${invitePath}/requests`).get());
});
test('DM can list pending applicants for an invite',async()=>{
  await assertSucceeds(db('dm-user-123').collection(`${invitePath}/requests`).get());
});
