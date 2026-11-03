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
const liveOwner=()=>QBLiveSession.active(liveCloud.session)&&liveCloud.session.dmUid===sharedCloud.user?.uid;
const liveClock=s=>esc(s.expiresAt.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
const liveChatOpen=()=>liveCloud.chatOpen ?? !liveOwner();
const liveStatus=()=>liveCloud.message?'<p class="small live-status" role="status">'+esc(liveCloud.message)+'</p>':'';
function liveChat(){
 const list=liveCloud.messages;
 return '<details class="live-chat" '+(liveChatOpen()?'open':'')+'><summary data-act="live-chat-toggle">Group chat & dice rolls'+(list.length?' · '+list.length:'')+'</summary><div role="log" aria-label="Group history" class="live-log" id="live-log">'+(list.map(m=>'<article class="live-msg'+(m.kind==='roll'?' live-roll':'')+'"><b title="'+esc(m.authorUid.slice(0,6))+'">'+esc(m.authorName)+'</b><p>'+esc(m.text)+'</p></article>').join('') || '<p class="small muted">No messages yet.</p>')+'</div><form id="live-chat-form" class="live-chat-form"><input id="live-chat-text" aria-label="Message to the group" placeholder="Message to the group" maxlength="4000" autocomplete="off"><button class="btn" type="submit">Send</button></form><p class="small muted">Rolls from the dice roller appear here during the session. There are no secret rolls here.</p></details>';
}
// What the map button can put back: the map hidden in this scene, otherwise the current scene's linked map.
function liveMapOffer(){
 const context=sceneMapContext();
 if(liveCloud.hidden?.token===context.token)return {title:liveCloud.hidden.spot.title};
 const ref=SceneMaps.reference(context.beat?.playerMap);
 return ref?{title:ref.title,beat:context.beat.id}:null;
}
// The DM's live controls, on the Session page beside the adventure they run.
function liveBar(){
 if(!sharedCloud.user)return '';
 if(!liveOwner())return '<section class="live-bar live-off" id="live-table" data-live="bar"><div class="live-bar-main"><div class="live-bar-state"><b>Live table is off</b><span class="small muted">Share maps, chat and dice with connected players.</span></div><div class="row"><button class="btn" data-act="live-start">Start live session</button></div></div>'+liveStatus()+'</section>';
 const s=liveCloud.session,shown=!!s.map?.id,offer=shown?null:liveMapOffer(),elsewhere=s.publisher!==playerPublisherId||s.campaignId!==S.campaigns?.current,count=(s.members || []).length;
 const seen=shown?(liveCloud.mapUrl?'<img id="live-map" class="live-thumb" data-map-key="'+esc(liveCloud.mapKey)+'" src="'+esc(liveCloud.mapUrl)+'" alt="">':'')+'<span><span class="small muted">Players see</span><b>'+esc(s.map.title)+'</b></span>':'<span><span class="small muted">Players see</span><b>No map</b></span>';
 const button=shown?'<button class="btn" data-act="live-hide">Hide from players</button>':offer?'<button class="btn primary" data-act="live-show">Show to players: '+esc(offer.title)+'</button>':'<span class="small muted live-no-map">This scene has no player map. Link one under Player map below.</span>';
 return '<section class="live-bar" id="live-table" data-live="bar"><div class="live-bar-main"><div class="live-bar-state"><b><span class="live-dot" aria-hidden="true"></span>Live</b><span class="small muted">until '+liveClock(s)+' · '+count+' player'+(count===1?'':'s')+'</span></div><div class="live-bar-map">'+seen+'</div><div class="row live-bar-actions">'+button+'<button class="btn" data-act="player-dice">Roll dice</button><button class="btn ghost" data-act="live-end">End session</button></div></div>'+(elsewhere?'<p class="hero-note small live-elsewhere">Scene changes in this tab are not reaching players yet. <button class="btn sm" data-act="live-claim">Use this tab</button></p>':'')+liveChat()+liveStatus()+'</section>';
}
function livePanel(){
 const user=sharedCloud.user;if(!user)return '';
 if(liveOwner())return '<section class="live-bar live-compact" id="live-table"><div class="live-bar-main"><div class="live-bar-state"><b><span class="live-dot" aria-hidden="true"></span>Live table is running</b><span class="small muted">until '+liveClock(liveCloud.session)+'. Map and chat controls are on the Session page.</span></div><div class="row"><button class="btn primary" data-act="live-open">Open Session</button></div></div></section>';
 if(S.role==='dm'&&!QBLiveSession.active(liveCloud.session))return liveBar();
 const s=liveCloud.session,active=QBLiveSession.active(s),choices=[...liveCloud.sessions.values()].filter(x=>QBLiveSession.active(x));
 const picker=choices.length>1?'<div class="row">'+choices.map(x=>'<button class="btn sm" data-act="live-select" data-id="'+esc(x.id)+'">'+esc(x.title)+'</button>').join('')+'</div>':'';
 if(!active)return '<section class="live-bar live-off" id="live-table"><div class="live-bar-state"><b>No live session right now</b><span class="small muted">Your DM starts the shared table.</span></div>'+picker+liveStatus()+'</section>';
 const map=liveCloud.mapUrl?'<img id="live-map" data-map-key="'+esc(liveCloud.mapKey)+'" src="'+esc(liveCloud.mapUrl)+'" alt="'+esc(s.map?.title || 'Player map')+'"><p class="small muted">'+esc(s.map?.title)+'</p>':'<p class="live-map-empty muted">'+(liveCloud.loadingKey?'Map is loading…':'Your DM has not shared a map yet.')+'</p>';
 return '<section class="card live-player" id="live-table"><div class="live-player-head"><div><h3>'+esc(s.title)+'</h3><span class="small muted"><span class="live-dot" aria-hidden="true"></span>Live until '+liveClock(s)+'</span></div><button class="btn primary" data-act="player-dice">Roll dice</button></div>'+picker+'<div class="live-player-grid"><div id="live-map-slot">'+map+'</div>'+liveChat()+'</div>'+liveStatus()+'</section>';
}
function liveWire(){const form=document.getElementById('live-chat-form');if(form)form.onsubmit=e=>{e.preventDefault();const field=document.getElementById('live-chat-text'),text=field.value.trim();if(text)void liveSend(text,'chat').then(()=>{if(field.value.trim()===text)field.value='';},e=>{liveCloud.message=sharedError(e);toast(liveCloud.message);});};}
function liveCapture(){return {image:document.getElementById('live-map'),draft:document.getElementById('live-chat-text')?.value,focused:document.activeElement?.id==='live-chat-text',scroll:document.getElementById('live-log')?.scrollTop,bottom:(()=>{const e=document.getElementById('live-log');return !e||e.scrollHeight-e.scrollTop-e.clientHeight<40;})()};}
function liveRestore(old){
 const image=document.getElementById('live-map');if(old?.image?.dataset?.mapKey&&image&&old.image.dataset.mapKey===image.dataset?.mapKey)image.replaceWith(old.image);
 const field=document.getElementById('live-chat-text');if(field&&old?.draft!==undefined){field.value=old.draft;if(old.focused)field.focus();}
 const log=document.getElementById('live-log');if(log)log.scrollTop=old?.bottom?log.scrollHeight:(old?.scroll ?? log.scrollHeight);liveWire();
}
function liveRefresh(){const el=document.getElementById('live-table');if(!el)return;const old=liveCapture();el.outerHTML=el.dataset?.live==='bar'?liveBar():livePanel();liveRestore(old);}
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
   await a.db.setDoc(a.db.doc(a.store,'liveSessions',user.uid),{dmUid:user.uid,epoch:crypto.randomUUID().replace(/-/g,''),campaignId:campaign,members:members.slice(0,6),title:QBCampaigns.current(S).name.slice(0,80),active:true,expiresAt:a.db.Timestamp.fromMillis(Date.now()+8*3600000),publisher:playerPublisherId,map:null});dlg.close();S.tab='desk';S.deskView='session';liveCloud.message='';render();toast('Live session started. Your controls are at the top of Session.');}catch(e){toast(sharedError(e));button.disabled=false;}
 };
}
async function liveCompress(url){
 if(url.length<=2880000){QBLiveSession.split(url);return url;}
 const bitmap=await createImageBitmap(await (await fetch(url)).blob());
 try{const compressed=await QBLiveSession.fit((size,quality)=>{const scale=Math.min(1,size/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',quality);});QBLiveSession.split(compressed);return compressed;}finally{bitmap.close();}
}
function livePublish(data){
 const s=liveCloud.session,user=sharedCloud.user;if(S.role!=='dm'||!user||s?.campaignId!==S.campaigns?.current||s?.dmUid!==user.uid||s.publisher!==playerPublisherId||!QBLiveSession.active(s))return;
 const last=data.rolls?.at(-1),rollKey=JSON.stringify(last || null);if(liveCloud.lastRoll===null)liveCloud.lastRoll=rollKey;else if(rollKey!==liveCloud.lastRoll){liveCloud.lastRoll=rollKey;if(last)liveRoll('DM table · '+last.roller+': d20 '+(last.dice?.length?last.dice.join(' / '):last.die)+' · Total '+last.total+(last.band?' · '+last.band:''));}
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
 }catch(e){liveCloud.message="Map transfer: "+sharedError(e);toast(liveCloud.message);if(uploaded.length)try{await liveDeleteRefs(uploaded);}catch{}liveRefresh();}
 finally{liveCloud.publishing=false;if(liveCloud.wanted&&liveCloud.wanted.key!==job.key)void liveUpload();}
}
async function liveDeleteRefs(refs){if(!refs.length)return;const a=sharedCloud.api;for(let i=0;i<refs.length;i+=400){const batch=a.db.writeBatch(a.store);refs.slice(i,i+400).forEach(ref=>batch.delete(ref));await batch.commit();}}
async function liveCleanRun(s){const a=sharedCloud.api;for(const collection of ['assets','messages']){let snapshot;do{snapshot=await a.db.getDocs(a.db.query(a.db.collection(a.store,'liveSessions',s.id,'runs',s.epoch,collection),a.db.limit(400)));await liveDeleteRefs(snapshot.docs.map(d=>d.ref));}while(snapshot.size===400);}}
async function liveEnd(){
 const s=liveCloud.session,user=sharedCloud.user;if(s?.dmUid!==user?.uid)return;
 clConfirm("End the live session?","Players lose access to the map and chat. Character sheets stay. Session images and messages are removed from Firebase.",async()=>{
  let ended=false;try{if(sharedCloud.user!==user)return;const a=sharedCloud.api;await a.db.updateDoc(a.db.doc(a.store,'liveSessions',s.id),{active:false,map:null});ended=true;
   await liveCleanRun(s);
   liveClear();liveCloud.message="Session ended and session data removed.";render();
  }catch(e){liveCloud.message=(ended?"Session ended; Check cleanup: ":"Session could not be ended: ")+sharedError(e);toast(liveCloud.message);render();}
 },"End session");
}
// A reload or another tab can hold the players' map; acting here moves it to this tab.
async function liveEnsure(){
 const s=liveCloud.session;if(!liveOwner())return false;
 if(s.publisher===playerPublisherId&&s.campaignId===S.campaigns?.current)return true;
 try{await sharedCloud.api.db.updateDoc(sharedCloud.api.db.doc(sharedCloud.api.store,'liveSessions',s.id),{publisher:playerPublisherId,campaignId:S.campaigns.current});liveCloud.session={...liveCloud.session,publisher:playerPublisherId,campaignId:S.campaigns.current};liveCloud.lastPublished=null;return true;}catch(e){toast(sharedError(e));return false;}
}
function liveActions(){return {'live-start':liveStart,'live-open':()=>{S.tab='desk';S.deskView='session';window.scrollTo(0,0);},'live-chat-toggle':()=>{liveCloud.chatOpen=!liveChatOpen();},'live-select':d=>{const s=liveCloud.sessions.get(d.id);if(s&&QBLiveSession.active(s))liveChoose(s);},'live-end':()=>void liveEnd(),'live-hide':async()=>{if(!await liveEnsure())return;liveCloud.hidden=playerSpotlight?.type==='image'?{token:sceneMapContext().token,spot:playerSpotlight}:null;sceneMapsPause();playerSpotlight=null;publishPlayer(true);},'live-show':async()=>{if(!await liveEnsure())return;const offer=liveMapOffer();if(!offer){toast('This scene has no player map to show.');return;}if(offer.beat){await sceneMapShow(offer.beat);return;}sceneMapsPause();playerSpotlight=liveCloud.hidden.spot;liveCloud.hidden=null;publishPlayer(true);},'live-claim':async()=>{if(await liveEnsure()){publishPlayer(true);render();}}};}
