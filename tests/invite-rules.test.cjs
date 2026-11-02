const fs = require('node:fs');
const {before, after, test} = require('node:test');
const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing');

let env;
const token = 'a'.repeat(32);
const invitePath = `campaignInvites/${token}`;
const requestPath = `${invitePath}/requests/player-user-123`;
const ts = ms => ({seconds: Math.floor(ms/1000), nanoseconds: 0});
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
