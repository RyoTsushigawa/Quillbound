/* Session metadata is separate from character sheets. Only the reviewed player map is sent. */
const liveCloud={sessions:new Map(),stops:[],feedStops:[],selected:null,session:null,messages:[],mapUrl:'',mapKey:'',loadingKey:'',wanted:null,lastRoll:null,publishing:false,lastPublished:null,message:'',timer:null};
function liveClear(){liveCloud.feedStops.forEach(f=>f());liveCloud.feedStops=[];clearTimeout(liveCloud.timer);liveCloud.session=null;liveCloud.messages=[];liveCloud.mapUrl='';liveCloud.mapKey='';liveCloud.loadingKey='';liveCloud.wanted=null;liveCloud.lastRoll=null;liveCloud.lastPublished=null;}
function liveWatch(user){
 liveCloud.stops.forEach(f=>f());liveCloud.stops=[];liveCloud.sessions.clear();liveClear();liveCloud.selected=null;
 if(!user)return;const a=sharedCloud.api,db=a.db;
 for(const [field,op] of [['dmUid','=='],['members','array-contains']])liveCloud.stops.push(db.onSnapshot(db.query(db.collection(a.store,'liveSessions'),db.where(field,op,user.uid)),snapshot=>{
  if(sharedCloud.user!==user)return;
  for(const c of snapshot.docChanges()){if(c.type==='removed')liveCloud.sessions.delete(c.doc.id);else liveCloud.sessions.set(c.doc.id,{...c.doc.data(),id:c.doc.id});}
  const current=liveCloud.sessions.get(liveCloud.selected),choices=[...liveCloud.sessions.values()].filter(s=>QBLiveSession.active(s));
  if(current&&QBLiveSession.active(current))liveChoose(current);else if(choices.length===1)liveChoose(choices[0]);else{liveClear();liveCloud.selected=null;render();}
 },e=>{if(sharedCloud.user!==user)return;liveCloud.message=sharedError(e);liveRefresh();}));
}
function liveChoose(session){
 const changed=liveCloud.selected!==session.id||liveCloud.session?.epoch!==session.epoch;
 if(changed){liveClear();liveCloud.selected=session.id;}
 liveCloud.session=session;
 clearTimeout(liveCloud.timer);liveCloud.timer=setTimeout(()=>{if(!QBLiveSession.active(liveCloud.session)){liveClear();liveCloud.message="The live session has ended.";render();}},Math.max(1,Math.min(43200000,session.expiresAt.toMillis()-Date.now()+100)));
 if(changed){const a=sharedCloud.api,db=a.db,user=sharedCloud.user;
  liveCloud.feedStops.push(db.onSnapshot(db.query(db.collection(a.store,'liveSessions',session.id,'runs',session.epoch,'messages'),db.orderBy('createdAt','desc'),db.limit(100)),snapshot=>{
   if(sharedCloud.user!==user||liveCloud.selected!==session.id||liveCloud.session?.epoch!==session.epoch)return;
   liveCloud.messages=snapshot.docs.map(d=>({...d.data(),id:d.id})).reverse();liveRefresh();
  },e=>{if(liveCloud.selected!==session.id)return;liveCloud.message=sharedError(e);liveRefresh();}));
 }
 void liveLoadMap(session);render();
}
async function liveLoadMap(session){
 const desc=session.map,key=desc?.id?session.id+'/'+session.epoch+'/'+desc.id:'';
 if(!key){liveCloud.mapKey='';liveCloud.mapUrl='';liveCloud.loadingKey='';return;}
 if(key===liveCloud.mapKey||key===liveCloud.loadingKey)return;
 liveCloud.loadingKey=key;liveCloud.mapUrl='';liveCloud.mapKey='';liveRefresh();
 try{const a=sharedCloud.api,snaps=await Promise.all(Array.from({length:Math.min(12,desc.count)},(_,i)=>a.db.getDoc(a.db.doc(a.store,'liveSessions',session.id,'runs',session.epoch,'assets',desc.id+'-'+i))));
  const url=QBLiveSession.join(snaps.map(s=>s.exists()?s.data().data:''),desc.count);
  if(liveCloud.selected!==session.id||liveCloud.session?.epoch!==session.epoch||liveCloud.session?.map?.id!==desc.id||!QBLiveSession.active(liveCloud.session))return;
  liveCloud.mapUrl=url;liveCloud.mapKey=key;liveRefresh();
 }catch(e){if(liveCloud.selected===session.id){liveCloud.loadingKey='';liveCloud.message="Map could not be loaded. "+sharedError(e);liveRefresh();}}finally{if(liveCloud.loadingKey===key)liveCloud.loadingKey='';}
}
function livePanel(){
 if(!sharedCloud.user)return '';
 const user=sharedCloud.user,s=liveCloud.session,active=QBLiveSession.active(s),owner=s?.dmUid===user?.uid;
 const choices=[...liveCloud.sessions.values()].filter(s=>QBLiveSession.active(s));
 return `<section class="card stack" id="live-table"><h3>Live table${active?' · '+esc(s.title):''}</h3>${!user?"<p class=\"small\">Sign in with Google under Shared Characters to see maps and group history.</p>":!active?`<p>No active session. Your DM starts the shared table.</p>${S.role==='dm'?"<button class=\"btn\" data-act=\"live-start\">Start live session</button>":''}`:`<p class="small">Maps and history for this session · until ${esc(s.expiresAt.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))}${owner&&s.publisher!==playerPublisherId?' · This DM tab is viewing only.':''}</p><div id="live-map-slot">${liveCloud.mapUrl?`<img id="live-map" data-map-key="${esc(liveCloud.mapKey)}" src="${esc(liveCloud.mapUrl)}" alt="${esc(s.map?.title || "Player map")}" style="width:100%;max-height:70vh;object-fit:contain"><p>${esc(s.map?.title)}</p>`:`<p>${liveCloud.loadingKey?"Map is loading...":"Your DM has not shared a map yet."}</p>`}</div><div class="row"><button class="btn sm" data-act="player-dice">Roll dice</button>${owner?`${s.publisher!==playerPublisherId?'<button class="btn sm" data-act="live-claim">Use this DM tab</button>':''}<button class="btn sm" data-act="live-hide">Hide map</button><button class="btn sm ghost" data-act="live-end">End session</button>`:''}</div><details open><summary>Group chat & dice rolls</summary><div role="log" aria-label="Group history" style="max-height:22rem;overflow:auto" id="live-log">${liveCloud.messages.map(m=>`<article class="small"><b>${esc(m.authorName)} · ${esc(m.authorUid.slice(0,6))}${m.kind==='roll'?' · 🎲':''}</b><p style="white-space:pre-wrap">${esc(m.text)}</p></article>`).join('') || "<p>No messages yet.</p>"}</div><form id="live-chat-form"><label class="f">Message<input id="live-chat-text" maxlength="4000" autocomplete="off"></label><button class="btn" type="submit">Send</button></form><p class="small">Rolls from your dice roller will be automatically published this session. No secret rolls here.</p></details>`}${choices.length>1?`<div class="row">${choices.map(x=>`<button class="btn sm" data-act="live-select" data-id="${esc(x.id)}">${esc(x.title)}</button>`).join('')}</div>`:''}<p class="small" role="status">${esc(liveCloud.message)}</p></section>`;
}
function liveWire(){const form=document.getElementById('live-chat-form');if(form)form.onsubmit=e=>{e.preventDefault();const field=document.getElementById('live-chat-text'),text=field.value.trim();if(text)void liveSend(text,'chat').then(()=>{if(field.value.trim()===text)field.value='';},e=>{liveCloud.message=sharedError(e);toast(liveCloud.message);});};}
function liveCapture(){return {image:document.getElementById('live-map'),draft:document.getElementById('live-chat-text')?.value,focused:document.activeElement?.id==='live-chat-text',scroll:document.getElementById('live-log')?.scrollTop,bottom:(()=>{const e=document.getElementById('live-log');return !e||e.scrollHeight-e.scrollTop-e.clientHeight<40;})()};}
function liveRestore(old){
 const image=document.getElementById('live-map');if(old?.image?.dataset?.mapKey&&image&&old.image.dataset.mapKey===image.dataset?.mapKey)image.replaceWith(old.image);
 const field=document.getElementById('live-chat-text');if(field&&old?.draft!==undefined){field.value=old.draft;if(old.focused)field.focus();}
 const log=document.getElementById('live-log');if(log)log.scrollTop=old?.bottom?log.scrollHeight:(old?.scroll ?? log.scrollHeight);liveWire();
}
function liveRefresh(){const el=document.getElementById('live-table');if(!el)return;const old=liveCapture();el.outerHTML=livePanel();liveRestore(old);}
async function liveSend(text,kind='roll'){
 const s=liveCloud.session,user=sharedCloud.user,a=sharedCloud.api;
 if(!user||!QBLiveSession.active(s)||!QBLiveSession.member(s,user.uid))throw Error("No active shared session.");
 if(!['roll','chat'].includes(kind)||!text.trim()||text.length>4000)throw Error("Message is empty or too long.");
 const ref=a.db.doc(a.db.collection(a.store,'liveSessions',s.id,'runs',s.epoch,'messages'));
 await a.db.setDoc(ref,{authorUid:user.uid,authorName:String(user.displayName || "Player").slice(0,80),kind,text,createdAt:a.db.serverTimestamp()});
}
function liveRoll(text){if(QBLiveSession.active(liveCloud.session))void liveSend(text).catch(e=>{liveCloud.message="Roll saved locally, but not sent to group chat: "+sharedError(e);toast(liveCloud.message);liveRefresh();});}
function liveStart(){
 const user=sharedCloud.user;if(S.role!=='dm'||!user){toast("First connect to Google.");return;}
 const members=[...new Set(S.party.map(p=>sharedCloud.docs.get(p.cloudLink?.id)).filter(d=>d?.dmUid===user.uid).map(d=>d.playerUid))];
 if(!members.length){toast("Connect the adventure characters to their players first.");return;}
 const dlg=openDialog("Start live session",`<p>${members.length} assigned player accounts will have access to the player map and group chat for up to 8 hours. Location changes share the linked player map automatically. Private DM maps are not shared.</p><p>The images will be temporarily stored in your Firebase database. End Session locks player access and cleans up session data.</p><button class="btn primary" id="live-confirm-start">Start live session</button>`);
 const campaign=S.campaigns.current;dlg.querySelector('#live-confirm-start').onclick=async()=>{
  if(sharedCloud.user!==user||S.role!=='dm'||S.campaigns.current!==campaign)return;
  const a=sharedCloud.api,button=dlg.querySelector('#live-confirm-start');button.disabled=true;
  try{const previous=await a.db.getDoc(a.db.doc(a.store,'liveSessions',user.uid));if(previous.exists()){const old={...previous.data(),id:user.uid};if(QBLiveSession.active(old))throw Error("You already have an active session. Select or end it first.");await liveCleanRun(old);}
   await a.db.setDoc(a.db.doc(a.store,'liveSessions',user.uid),{dmUid:user.uid,epoch:crypto.randomUUID().replace(/-/g,''),campaignId:campaign,members:members.slice(0,6),title:QBCampaigns.current(S).name.slice(0,80),active:true,expiresAt:a.db.Timestamp.fromMillis(Date.now()+8*3600000),publisher:playerPublisherId,map:null});dlg.close();liveCloud.message='Live session started.';render();}catch(e){toast(sharedError(e));button.disabled=false;}
 };
}
async function liveCompress(url){
 if(url.length<=2880000){QBLiveSession.split(url);return url;}
 const bitmap=await createImageBitmap(await (await fetch(url)).blob()),scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
 canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const compressed=canvas.toDataURL('image/jpeg',0.78);QBLiveSession.split(compressed);return compressed;
}
function livePublish(data){
 const s=liveCloud.session,user=sharedCloud.user;if(S.role!=='dm'||!user||s?.campaignId!==S.campaigns?.current||s?.dmUid!==user.uid||s.publisher!==playerPublisherId||!QBLiveSession.active(s))return;
 const last=data.rolls?.at(-1),rollKey=JSON.stringify(last || null);if(liveCloud.lastRoll===null)liveCloud.lastRoll=rollKey;else if(rollKey!==liveCloud.lastRoll){liveCloud.lastRoll=rollKey;if(last)liveRoll('DM-Tisch · '+last.roller+': W20 '+(last.dice?.length?last.dice.join(' / '):last.die)+' · Gesamt '+last.total+(last.band?' · '+last.band:''));}
 const spot=data.spotlight?.type==='image'?data.spotlight:null,key=spot?spot.title+'|'+spot.url:'';
 liveCloud.wanted={id:s.id,epoch:s.epoch,publisher:s.publisher,key,spot};if(!liveCloud.publishing&&key!==liveCloud.lastPublished)void liveUpload();
}
async function liveUpload(){
 const job=liveCloud.wanted;if(!job)return;liveCloud.publishing=true;const a=sharedCloud.api,user=sharedCloud.user;let uploaded=[];
 const valid=()=>sharedCloud.user===user&&liveCloud.session?.id===job.id&&liveCloud.session?.epoch===job.epoch&&liveCloud.session?.publisher===job.publisher&&QBLiveSession.active(liveCloud.session)&&liveCloud.wanted?.key===job.key;
 try{
  let map=null;
  if(job.spot){const url=await liveCompress(job.spot.url);if(!valid())return;const parts=QBLiveSession.split(url),id=crypto.randomUUID().replace(/-/g,'');map={id,title:job.spot.title.slice(0,160),count:parts.length};const batch=a.db.writeBatch(a.store);
   parts.forEach((data,i)=>{const ref=a.db.doc(a.store,'liveSessions',job.id,'runs',job.epoch,'assets',id+'-'+i);uploaded.push(ref);batch.set(ref,{data,publisher:job.publisher});});await batch.commit();
  }
  if(!valid()){await liveDeleteRefs(uploaded);return;}
  const old=await a.db.runTransaction(a.store,async tx=>{const ref=a.db.doc(a.store,'liveSessions',job.id),snap=await tx.get(ref),s=snap.data();if(!valid()||!s||s.epoch!==job.epoch||s.publisher!==job.publisher||!QBLiveSession.active(s))throw Error("The session has ended or been taken over by another DM tab.");tx.update(ref,{map});return s.map;});
  liveCloud.lastPublished=job.key;uploaded=[];
  if(old?.id)await liveDeleteRefs(Array.from({length:old.count},(_,i)=>a.db.doc(a.store,'liveSessions',job.id,'runs',job.epoch,'assets',old.id+'-'+i)));
 }catch(e){liveCloud.message="Card transfer: "+sharedError(e);toast(liveCloud.message);if(uploaded.length)try{await liveDeleteRefs(uploaded);}catch{}liveRefresh();}
 finally{liveCloud.publishing=false;if(liveCloud.wanted&&liveCloud.wanted.key!==job.key)void liveUpload();}
}
async function liveDeleteRefs(refs){if(!refs.length)return;const a=sharedCloud.api;for(let i=0;i<refs.length;i+=400){const batch=a.db.writeBatch(a.store);refs.slice(i,i+400).forEach(ref=>batch.delete(ref));await batch.commit();}}
async function liveCleanRun(s){const a=sharedCloud.api;for(const collection of ['assets','messages']){let snapshot;do{snapshot=await a.db.getDocs(a.db.query(a.db.collection(a.store,'liveSessions',s.id,'runs',s.epoch,collection),a.db.limit(400)));await liveDeleteRefs(snapshot.docs.map(d=>d.ref));}while(snapshot.size===400);}}
async function liveEnd(){
 const s=liveCloud.session,user=sharedCloud.user;if(s?.dmUid!==user?.uid)return;
 clConfirm("Live-End session?","Players lose access to map and history. Local character arcs remain. Session images and messages are removed from Firebase.",async()=>{
  let ended=false;try{if(sharedCloud.user!==user)return;const a=sharedCloud.api;await a.db.updateDoc(a.db.doc(a.store,'liveSessions',s.id),{active:false,map:null});ended=true;
   await liveCleanRun(s);
   liveClear();liveCloud.message="Session ended and session data removed.";render();
  }catch(e){liveCloud.message=(ended?"Session ended; Check cleanup: ":"Session could not be ended: ")+sharedError(e);toast(liveCloud.message);render();}
 },"End session");
}
function liveActions(){return {'live-start':liveStart,'live-select':d=>{const s=liveCloud.sessions.get(d.id);if(s&&QBLiveSession.active(s))liveChoose(s);},'live-end':()=>void liveEnd(),'live-hide':()=>{if(liveCloud.session?.publisher!==playerPublisherId){toast("First take over this DM tab.");return;}sceneMapsPause();playerSpotlight=null;publishPlayer(true);},'live-claim':async()=>{const s=liveCloud.session;if(s?.dmUid!==sharedCloud.user?.uid)return;try{await sharedCloud.api.db.updateDoc(sharedCloud.api.db.doc(sharedCloud.api.store,'liveSessions',s.id),{publisher:playerPublisherId,campaignId:S.campaigns.current});liveCloud.lastPublished=null;}catch(e){toast(sharedError(e));}}};}
