/* Campaign invitations: the DM invites by private link, a player submits one hero, the DM approves. Contract: docs/campaign-invitations.md. */
const inviteUI={token:null};
// One hour under the rules' seven-day limit: that limit is measured on Google's clock, and a device clock running even a second ahead would be refused.
const INVITE_LIFE=7*86400000-3600000;
const inviteHex=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
const inviteRef=id=>sharedCloud.api.db.doc(sharedCloud.api.store,'campaignInvites',id);
const inviteError=e=>toast(sharedError(e));
function inviteSignedIn(){if(!sharedCloud.user||!sharedCloud.api){toast('Sign in with Google first: Connection & import → Shared characters.');return false;}return true;}
function inviteLink(token){return location.origin+location.pathname+'#join='+encodeURIComponent(token);}
function inviteFromUrl(){
 if(typeof location==='undefined'||typeof history==='undefined')return;
 const match=location.hash.match(/^#join=([a-f0-9]{32})$/);
 if(!match)return;
 inviteUI.token=match[1];
 history.replaceState(history.state,'',location.pathname+location.search);
 S.tab='heroes';
}
function inviteButtons(isDm){
 return isDm?'<button class="btn" data-act="invite-create">Invite players</button><button class="btn" data-act="invite-review">Review join requests</button><button class="btn ghost" data-act="invite-revoke">Disable invite link</button>':'<button class="btn" data-act="invite-join">Join a campaign</button>';
}
async function inviteCreate(){
 if(S.role!=='dm'||!inviteSignedIn())return;
 const user=sharedCloud.user,campaignId=S.campaigns?.current;
 const db=sharedCloud.api.db;
 try{
  let token=S.inviteTokens?.[campaignId];
  if(token){
   const existing=await db.getDoc(inviteRef(token));
   if(!existing.exists()||existing.data().dmUid!==user.uid)throw Error('Saved invitation belongs to another account or cannot be found. Review the connection first.');
   if(!existing.data().active||existing.data().expiresAt.toMillis()<=Date.now())token=null;
  }
  if(!token){
   token=inviteHex();
   await db.setDoc(inviteRef(token),{dmUid:user.uid,campaignName:QBCampaigns.current(S).name.slice(0,100),active:true,createdAt:db.serverTimestamp(),expiresAt:db.Timestamp.fromMillis(Date.now()+INVITE_LIFE)});
  }
  if(S.role!=='dm'||S.campaigns?.current!==campaignId||sharedCloud.user!==user)return;
  S.inviteTokens??={};S.inviteTokens[campaignId]=token;save();
  // An invitation does not contain campaign notes or other players' characters.
  const dlg=openDialog('Invite players',`<p>Share this invitation privately. Links expire no later than seven days after creation. Players choose a hero to submit; nothing joins your party without approval.</p><label class="f">Invitation link<input id="invite-url" readonly value="${esc(inviteLink(token))}"></label><div class="row"><button class="btn primary" id="invite-copy">Copy invitation link</button><button class="btn" id="invite-review-now">Review submissions</button></div>`);
  dlg.querySelector('#invite-copy').onclick=()=>navigator.clipboard.writeText(inviteLink(token)).then(()=>toast('Invitation link copied.'),()=>{dlg.querySelector('#invite-url').select();toast('Select and copy the invitation link.');});
  dlg.querySelector('#invite-review-now').onclick=()=>{dlg.close();void inviteReview(token);};
 }catch(e){inviteError(e);}
}
async function inviteRevoke(){
 if(S.role!=='dm'||!inviteSignedIn())return;
 const campaignId=S.campaigns?.current,token=S.inviteTokens?.[campaignId],user=sharedCloud.user;
 if(!token){toast('No invitation link is saved for this campaign.');return;}
 const db=sharedCloud.api.db;
 try{
  const ref=inviteRef(token),snapshot=await db.getDoc(ref);
  if(!snapshot.exists()||snapshot.data().dmUid!==user.uid)throw Error('Invitation not found for this account.');
  if(sharedCloud.user!==user||S.campaigns?.current!==campaignId||S.role!=='dm')return;
  if(!snapshot.data().active){toast('This invitation is already disabled.');return;}
  clConfirm('Disable this invitation?', 'The link will stop accepting characters. Existing connected characters will keep syncing.',async()=>{
   try{
    if(sharedCloud.user!==user||S.campaigns?.current!==campaignId||S.role!=='dm')return;
    await db.updateDoc(ref,{active:false});
    toast('Invitation disabled. Existing character connections are unchanged.');
   }catch(e){inviteError(e);}
  },'Disable invitation');
 }catch(e){toast(e.message==='Invitation not found for this account.'?e.message:sharedError(e));}
}
async function inviteJoin(){
 if(!inviteSignedIn())return;
 const dlg=openDialog('Join a campaign',`<p>Paste the invitation code or link your DM sent you. You can review the campaign before sharing a character.</p><label class="f">Invitation link or code<input id="invite-code" autocomplete="off"></label><button class="btn primary" id="invite-find">Find campaign</button>`);
 if(inviteUI.token)dlg.querySelector('#invite-code').value=inviteUI.token;
 dlg.querySelector('#invite-find').onclick=async()=>{
  const raw=dlg.querySelector('#invite-code').value.trim(),match=raw.match(/(?:#join=)?([a-f0-9]{32})$/);
  if(!match){toast('Enter a valid invitation link or code.');return;}
  const token=match[1],user=sharedCloud.user;
  try{
   const snapshot=await sharedCloud.api.db.getDoc(inviteRef(token));
   if(!snapshot.exists())throw Error('Invitation not found.');
   const data=snapshot.data();
   if(!data.active||data.expiresAt.toMillis()<=Date.now())throw Error('This invitation has expired or was disabled.');
   if(sharedCloud.user!==user)return;
   inviteUI.token=token;dlg.close();inviteChooseHero(token,data);
  }catch(e){toast(e.message?.startsWith('Invitation')||e.message?.startsWith('This invitation')?e.message:sharedError(e));}
 };
}
function inviteChooseHero(token,info){
 const heroes=(S.myHeroes||[]).filter(h=>h.build?.name&&h.build?.cls&&h.build?.species);
 const options=heroes.map(h=>`<option value="${esc(h.id)}">${esc(h.build.name)}</option>`).join('');
 const dlg=openDialog('Join '+info.campaignName,`<p>Select one character to submit to the DM for approval. Your other heroes remain private.</p><label class="f">Character<select id="invite-hero">${options||'<option value="">No completed characters</option>'}</select></label><button class="btn primary" id="invite-submit" ${heroes.length?'':'disabled'}>Send character for approval</button>`);
 dlg.querySelector('#invite-submit').onclick=async()=>{
  const user=sharedCloud.user,hero=heroes.find(h=>h.id===dlg.querySelector('#invite-hero').value);
  if(!user||!hero)return;
  const button=dlg.querySelector('#invite-submit');button.disabled=true;
  try{
   const db=sharedCloud.api.db,ref=db.doc(db.collection(inviteRef(token),'requests'),user.uid);
   if((await db.getDoc(ref)).exists()){toast('You already sent a character with this invitation. Your DM can approve or decline it.');dlg.close();return;}
   const sheetJson=QBSharedHeroes.sheet(hero,false);
   await db.setDoc(ref,{playerUid:user.uid,name:hero.build.name.slice(0,100),sheetJson,createdAt:db.serverTimestamp()});
   hero.joinToken=token;inviteUI.token=null;save();dlg.close();render();toast('Character submitted. Your DM can now approve it.');
  }catch(e){inviteError(e);button.disabled=false;}
 };
}
async function inviteReview(token){
 if(S.role!=='dm'||!inviteSignedIn())return;
 const user=sharedCloud.user,db=sharedCloud.api.db;
 const dlg=openDialog('Review join requests','<p id="invite-requests" role="status">Loading requests…</p>');
 try{
  // Only query invitations owned by the signed-in DM; requests live under a specific invitation.
  const known=token || S.inviteTokens?.[S.campaigns?.current];
  const ids=known?[known]:[];
  // Rules deliberately forbid invitation listing; use the saved token for this campaign.
  if(!ids.length){dlg.querySelector('#invite-requests').textContent='No invitation selected. Open the review link from your invitation dialog.';return;}
  const blocks=[];
  for(const id of ids){
   const inv=await db.getDoc(inviteRef(id));if(!inv.exists()||inv.data().dmUid!==user.uid)continue;
   const requests=await db.getDocs(db.collection(inviteRef(id),'requests'));
   for(const doc of requests.docs){const record=doc.data();blocks.push({id,uid:doc.id,record});}
  }
  const target=dlg.querySelector('#invite-requests');target.innerHTML=blocks.length?blocks.map((item,i)=>`<div class="card stack"><b>${esc(item.record.name)}</b><p class="small muted">Player request · ${esc(item.uid)}</p><label class="f">Player name (optional, only you see it)<input data-invite-name="${i}" value="${esc(sharedPlayerName(item.uid))}" maxlength="60" autocomplete="off"></label><button class="btn primary" data-invite-approve="${i}">Approve and add to party</button><button class="btn" data-invite-decline="${i}">Decline</button></div>`).join(''):'No pending requests.';
  target.querySelectorAll('[data-invite-approve]').forEach(button=>button.onclick=()=>{const i=button.dataset.inviteApprove,name=target.querySelector('[data-invite-name="'+i+'"]');if(name)sharedSetPlayerName(blocks[Number(i)].uid,name.value);void inviteApprove(blocks[Number(i)],dlg);});
  target.querySelectorAll('[data-invite-decline]').forEach(button=>button.onclick=async()=>{const x=blocks[Number(button.dataset.inviteDecline)];try{await db.deleteDoc(db.doc(db.collection(inviteRef(x.id),'requests'),x.uid));dlg.close();toast('Request declined.');}catch(e){inviteError(e);}});
 }catch(e){dlg.querySelector('#invite-requests').textContent=sharedError(e);}
}
async function inviteApprove(item,dlg){
 if(S.role!=='dm'||!inviteSignedIn()||S.combat)return toast('Finish combat before adding a character.');
 const db=sharedCloud.api.db,user=sharedCloud.user,campaignId=S.campaigns?.current;
 try{
  const invitation=await db.getDoc(inviteRef(item.id));
  if(!invitation.exists()||invitation.data().dmUid!==user.uid)throw Error('You no longer own this invitation.');
  const pendingRef=db.doc(db.collection(inviteRef(item.id),'requests'),item.uid);
  const pending=await db.getDoc(pendingRef);
  if(!pending.exists()||pending.data().playerUid!==item.uid)throw Error('This request is no longer pending.');
  if(sharedCloud.user!==user||S.role!=='dm'||S.campaigns?.current!==campaignId)throw Error('The active campaign changed. Reopen requests.');
  const parsed=QBSharedHeroes.read(pending.data().sheetJson,cmSheet),campaign=QBCampaigns.current(S);
  const ref=db.doc(sharedCloud.api.store,'sharedHeroes',item.id+'-'+encodeURIComponent(item.uid));
  const existing=await db.getDoc(ref).catch(e=>{if(e?.code==='permission-denied')return {exists:()=>false};throw e;}); // the rules refuse reading a connection that doesn't exist yet; one that isn't ours is refused again on writing
  if(existing.exists() && (existing.data().dmUid!==user.uid || existing.data().playerUid!==item.uid || existing.data().sheetJson!==pending.data().sheetJson))throw Error('This invitation has a different existing connection. Review it before proceeding.');
  const payload={dmUid:user.uid,playerUid:item.uid,revision:1,sheetJson:pending.data().sheetJson,campaignName:campaign.name.slice(0,80),updatedBy:user.uid,updatedAt:db.serverTimestamp()};
  if(!existing.exists())await db.setDoc(ref,payload);
  if(sharedCloud.user!==user||S.campaigns?.current!==campaignId||S.role!=='dm')throw Error('Character connected, but the active campaign changed. Reopen this campaign before importing.');
  const p=QBHeroRules.toHero(parsed.build,parsed.sheet,{id:uid('p'),want:parsed.story.want});
  const activeRecord=existing.exists()?existing.data():payload;
  p.heroStory=parsed.story;p.cloudLink={id:ref.id,uid:user.uid,revision:activeRecord.revision,baseJson:activeRecord.sheetJson};heroDefaults(p);
  if(!(S.party||[]).some(x=>x.cloudLink?.id===ref.id))S.party.push(p);
  await db.deleteDoc(pendingRef);
  dlg.close();render();toast('Character approved and added to the party.');
 }catch(e){inviteError(e);}
}
function inviteActions(){return {'invite-create':()=>void inviteCreate(),'invite-join':()=>void inviteJoin(),'invite-review':()=>void inviteReview(null),'invite-revoke':()=>void inviteRevoke()};}
