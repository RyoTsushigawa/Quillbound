/* Campaign invitation UI: feature-branch only until Firestore rules and end-to-end tests pass. */
const inviteUI={token:null};
const inviteHex=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
const inviteRef=id=>sharedCloud.api.db.doc(sharedCloud.api.store,'campaignInvites',id);
const inviteError=e=>toast(sharedError(e));
function inviteSignedIn(){if(!sharedCloud.user||!sharedCloud.api){toast('Sign in with Google under Shared characters first.');return false;}return true;}
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
 return isDm?'<button class="btn" data-act="invite-create">Invite players</button><button class="btn" data-act="invite-review">Review join requests</button>':'<button class="btn" data-act="invite-join">Join a campaign</button>';
}
async function inviteCreate(){
 if(S.role!=='dm'||!inviteSignedIn())return;
 const user=sharedCloud.user,campaignId=S.campaigns?.current;
 const token=inviteHex(),db=sharedCloud.api.db;
 try{
  await db.setDoc(inviteRef(token),{dmUid:user.uid,campaignName:QBCampaigns.current(S).name.slice(0,100),active:true,createdAt:db.serverTimestamp(),expiresAt:db.Timestamp.fromMillis(Date.now()+7*86400000)});
  if(S.role!=='dm'||S.campaigns?.current!==campaignId||sharedCloud.user!==user)return;
  S.inviteTokens??={};S.inviteTokens[campaignId]=token;save();
  // An invitation does not contain campaign notes or other players' characters.
  const dlg=openDialog('Invite players',`<p>Share this invitation privately. It expires in seven days. Players choose a hero to submit; nothing joins your party without approval.</p><label class="f">Invitation link<input id="invite-url" readonly value="${esc(inviteLink(token))}"></label><div class="row"><button class="btn primary" id="invite-copy">Copy invitation link</button><button class="btn" id="invite-review-now">Review submissions</button></div>`);
  dlg.querySelector('#invite-copy').onclick=()=>navigator.clipboard.writeText(inviteLink(token)).then(()=>toast('Invitation link copied.'),()=>{dlg.querySelector('#invite-url').select();toast('Select and copy the invitation link.');});
  dlg.querySelector('#invite-review-now').onclick=()=>{dlg.close();void inviteReview(token);};
 }catch(e){inviteError(e);}
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
 const dlg=openDialog('Join '+esc(info.campaignName),`<p>Select one character to submit to the DM for approval. Your other heroes remain private.</p><label class="f">Character<select id="invite-hero">${options||'<option value="">No completed characters</option>'}</select></label><button class="btn primary" id="invite-submit" ${heroes.length?'':'disabled'}>Send character for approval</button>`);
 dlg.querySelector('#invite-submit').onclick=async()=>{
  const user=sharedCloud.user,hero=heroes.find(h=>h.id===dlg.querySelector('#invite-hero').value);
  if(!user||!hero)return;
  const button=dlg.querySelector('#invite-submit');button.disabled=true;
  try{
   const db=sharedCloud.api.db,ref=db.doc(db.collection(inviteRef(token),'requests'),user.uid);
   const sheetJson=QBSharedHeroes.sheet(hero,false);
   await db.setDoc(ref,{playerUid:user.uid,name:hero.build.name.slice(0,100),sheetJson,createdAt:db.serverTimestamp()});
   dlg.close();toast('Character submitted. Your DM can now approve it.');
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
  const target=dlg.querySelector('#invite-requests');target.innerHTML=blocks.length?blocks.map((item,i)=>`<div class="card stack"><b>${esc(item.record.name)}</b><p class="small muted">Player request · ${esc(item.uid)}</p><button class="btn primary" data-invite-approve="${i}">Approve and add to party</button><button class="btn" data-invite-decline="${i}">Decline</button></div>`).join(''):'No pending requests.';
  target.querySelectorAll('[data-invite-approve]').forEach(button=>button.onclick=()=>void inviteApprove(blocks[Number(button.dataset.inviteApprove)],dlg));
  target.querySelectorAll('[data-invite-decline]').forEach(button=>button.onclick=async()=>{const x=blocks[Number(button.dataset.inviteDecline)];await db.deleteDoc(db.doc(db.collection(inviteRef(x.id),'requests'),x.uid));dlg.close();toast('Request declined.');});
 }catch(e){dlg.querySelector('#invite-requests').textContent=sharedError(e);}
}
async function inviteApprove(item,dlg){
 if(S.role!=='dm'||!inviteSignedIn()||S.combat)return toast('Finish combat before adding a character.');
 const db=sharedCloud.api.db,user=sharedCloud.user;
 try{
  const parsed=QBSharedHeroes.read(item.record.sheetJson,cmSheet),campaign=QBCampaigns.current(S);
  const ref=db.doc(db.collection(db.store,'sharedHeroes'));
  const payload={dmUid:user.uid,playerUid:item.uid,revision:1,sheetJson:item.record.sheetJson,campaignName:campaign.name.slice(0,80),updatedBy:user.uid,updatedAt:db.serverTimestamp()};
  await db.setDoc(ref,payload);
  const p=QBHeroRules.toHero(parsed.build,parsed.sheet,{id:uid('p'),want:parsed.story.want});
  p.heroStory=parsed.story;p.cloudLink={id:ref.id,uid:user.uid,revision:1,baseJson:item.record.sheetJson};heroDefaults(p);S.party.push(p);
  await db.deleteDoc(db.doc(db.collection(inviteRef(item.id),'requests'),item.uid));
  dlg.close();render();toast('Character approved and added to the party.');
 }catch(e){inviteError(e);}
}
function inviteActions(){return {'invite-create':()=>void inviteCreate(),'invite-join':()=>void inviteJoin(),'invite-review':()=>void inviteReview(inviteUI.token)};}
