/* Opt-in Firebase connection. Local play and files continue to work without it. */
const sharedCloud={user:null,api:null,starting:false,stops:[],docs:new Map(),busy:new Set(),errors:new Map(),timer:null,message:'',open:false};
function sharedWatch(user){
 sharedCloud.stops.forEach(f=>f());sharedCloud.stops=[];sharedCloud.docs.clear();sharedCloud.errors.clear();
 if(!user)return;const a=sharedCloud.api,db=a.db;
 for(const field of ['dmUid','playerUid']){
  const q=db.query(db.collection(a.store,'sharedHeroes'),db.where(field,'==',user.uid));
  sharedCloud.stops.push(db.onSnapshot(q,snapshot=>{
   if(sharedCloud.user!==user)return;
   for(const change of snapshot.docChanges()){
    if(change.type==='removed'){sharedCloud.docs.delete(change.doc.id);continue;}
    sharedCloud.docs.set(change.doc.id,{...change.doc.data(),id:change.doc.id});
   }
   sharedCloud.message='Verbunden';sharedReconcile();render();
  },e=>{if(sharedCloud.user!==user)return;sharedCloud.message=sharedError(e);render();}));
 }
}
function sharedError(e){const code=String(e?.code || e?.message || e);return /permission-denied/.test(code)?'Kein Datenbankzugriff. Firestore anlegen und die Quillbound-Regeln veröffentlichen.':/unauthorized-domain/.test(code)?'In Firebase Authentication die Domain ryotsushigawa.github.io freigeben.':/operation-not-allowed/.test(code)?'In Firebase Authentication die Google-Anmeldung aktivieren.':/popup-blocked/.test(code)?'Das Anmeldefenster wurde blockiert. Pop-ups für Quillbound erlauben.':/popup-closed|cancelled-popup/.test(code)?'Anmeldung abgebrochen. Deine lokalen Daten bleiben gespeichert.':/CONFLICT/.test(code)?'Gleichzeitige Änderung: bitte den gemeinsamen Stand prüfen.':'Verbindung fehlgeschlagen: '+code.slice(0,200);}
async function sharedStart(login=false){
 const alreadyReady=!!sharedCloud.api;
 try{
  if(!sharedCloud.api){
   if(sharedCloud.starting)return;sharedCloud.starting=true;
   const base='https://www.gstatic.com/firebasejs/12.19.0/';
   const [app,auth,db]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
   const firebase=app.initializeApp({apiKey:'AIzaSyAHaOjOsnw_DFYe7qCzmNTyzUmmRHY1c9A',authDomain:'dnd-stuff-6dbe2.firebaseapp.com',projectId:'dnd-stuff-6dbe2',appId:'1:565044544014:web:26f1f57ca7e520170d325f'},'quillbound-characters');
   sharedCloud.api={auth,db,session:auth.getAuth(firebase),store:db.getFirestore(firebase)};
   auth.onAuthStateChanged(sharedCloud.api.session,user=>{
    sharedCloud.user=user;sharedWatch(user);liveWatch(user);render();
   });
  }
  if(login){S.cloudSettings={...S.cloudSettings,enabled:true};save();if(!alreadyReady){sharedCloud.message='Verbindung vorbereitet. Jetzt auf „Mit Google anmelden“ klicken.';render();return;}const a=sharedCloud.api;await a.auth.signInWithPopup(a.session,new a.auth.GoogleAuthProvider());}
 }catch(e){sharedCloud.message=sharedError(e);toast(sharedCloud.message);render();}finally{sharedCloud.starting=false;}
}
function sharedRecords(){return [...(S.party || []).filter(p=>p.cloudLink).map(p=>({record:p,party:true})),...(S.myHeroes || []).filter(h=>h.cloudLink).map(record=>({record,party:false}))];}
function sharedEditing(record,party){return S.tab==='create'&&(party?S.creator?.partyId===record.id:S.creator?.heroId===record.id);}
function sharedStatus(record,party){return QBSharedHeroes.state({...record,cloudParty:party},sharedCloud.docs.get(record.cloudLink?.id));}
function sharedApply(record,party,remote){
 const data=QBSharedHeroes.read(remote.sheetJson,cmSheet);
 if(party){
  const before=cmSheet(record.build),next=QBHeroRules.toHero(data.build,data.sheet,{...record});
  if(before){if(before.ac===data.sheet.ac)next.ac=record.ac;if(before.hp.max===data.sheet.hp.max)next.hp=record.hp;if(before.skills.perception.bonus===data.sheet.skills.perception.bonus)next.perceptionBonus=record.perceptionBonus;}
  next.hpNow=Math.min(record.hpNow ?? next.hp,next.hp);next.name=data.build.name;next.heroStory=data.story;next.want=data.story.want;Object.assign(record,next);
 }else{record.previousVersion={build:record.build,story:record.story,saved:record.saved};record.build=data.build;record.story=data.story;record.saved=Date.now();}
 record.cloudLink={...record.cloudLink,revision:remote.revision,baseJson:remote.sheetJson};
}
function sharedReconcile(){
 const user=sharedCloud.user;if(!user)return false;let changed=false;
 for(const remote of sharedCloud.docs.values()){
  if(remote.playerUid!==user.uid||(S.cloudSettings?.hidden || []).includes(remote.id))continue;
  if(!(S.myHeroes || []).some(h=>h.cloudLink?.id===remote.id)){
   try{const data=QBSharedHeroes.read(remote.sheetJson,cmSheet);S.myHeroes??=[];S.myHeroes.push({id:uid('shared'),build:data.build,story:data.story,saved:Date.now(),cloudLink:{id:remote.id,uid:user.uid,revision:remote.revision,baseJson:remote.sheetJson}});changed=true;}catch(e){sharedCloud.errors.set(remote.id,sharedError(e));}
  }
 }
 for(const {record,party} of sharedRecords()){
  const link=record.cloudLink;if(link.uid!==user.uid||sharedCloud.busy.has(link.id))continue;
  const remote=sharedCloud.docs.get(link.id);if(!remote||sharedEditing(record,party)||(party&&S.combat))continue;
  try{const state=sharedStatus(record,party);if(state==='incoming'){sharedApply(record,party,remote);changed=true;}else if(state==='same'){link.revision=remote.revision;link.baseJson=remote.sheetJson;}}catch(e){sharedCloud.errors.set(link.id,sharedError(e));}
 }
 return changed;
}
function sharedTick(){
 if(S.cloudSettings?.enabled&&!sharedCloud.api&&!sharedCloud.starting){void sharedStart();return;}
 if(!sharedCloud.user)return;
 clearTimeout(sharedCloud.timer);sharedCloud.timer=setTimeout(()=>void sharedFlush(),600);
}
async function sharedFlush(){
 const user=sharedCloud.user,a=sharedCloud.api;if(!user||!a)return;
 let changed=sharedReconcile();
 for(const {record,party} of sharedRecords()){
  const link=record.cloudLink;
  if(sharedCloud.user!==user)return;
  if(link.uid!==user.uid||sharedCloud.busy.has(link.id)||sharedCloud.errors.has(link.id)||sharedEditing(record,party)||(party&&S.combat))continue;
  try{
   if(sharedStatus(record,party)!=='outgoing')continue;
   const json=QBSharedHeroes.sheet(record,party);sharedCloud.busy.add(link.id);
   const adapter={transaction:(id,fn)=>a.db.runTransaction(a.store,async tx=>{const ref=a.db.doc(a.store,'sharedHeroes',id),snap=await tx.get(ref);const next=fn(snap.exists()?snap.data():null);tx.set(ref,{...next,updatedAt:a.db.serverTimestamp()});return next;})};
   const result=await QBSharedHeroes.update(adapter,link.id,link.revision,json,user.uid);
   link.baseJson=json;link.revision=result.revision;sharedCloud.docs.set(link.id,{...result,id:link.id});
  }catch(e){sharedCloud.errors.set(link.id,sharedError(e));}finally{sharedCloud.busy.delete(link.id);}
 }
 changed=sharedReconcile()||changed;save();if(changed)render();else sharedRefreshStatus();
}
function sharedRefreshStatus(){document.querySelectorAll('[data-shared-status]').forEach(el=>{const x=sharedRecords().find(x=>x.record.cloudLink.id===el.dataset.sharedStatus);if(x)el.textContent=sharedLabel(x.record,x.party);});}
function sharedLabel(record,party){
 const link=record.cloudLink;if(!link)return '';
 if(!sharedCloud.user||link.uid!==sharedCloud.user.uid)return 'Mit dem zugeordneten Google-Konto anmelden';
 if(sharedCloud.errors.has(link.id))return sharedCloud.errors.get(link.id);
 if(!sharedCloud.docs.has(link.id))return 'Warte auf Zugriff · Verbindung prüfen';
 if(party&&S.combat)return 'Abgleich nach dem Kampf';
 if(sharedEditing(record,party))return 'Bearbeitung · zuerst Charakter speichern';
 try{return {same:'Synchronisiert',incoming:'Gemeinsame Änderung wartet',outgoing:'Änderungen werden gespeichert …',conflict:'Gleichzeitige Änderungen · Stand prüfen',waiting:'Verbindung wird hergestellt …'}[sharedStatus(record,party)] || '';}catch(e){return sharedError(e);}
}
function sharedHeroBadge(record,party=false){return record.cloudLink?`<p class="small"><span data-shared-status="${esc(record.cloudLink.id)}">${esc(sharedLabel(record,party))}</span> <button class="btn sm" data-act="shared-review" data-id="${esc(record.id)}" data-party="${party?'1':''}">Abgleich prüfen</button></p>`:'';}
function sharedPanel(){
 const user=sharedCloud.user;
 const signedIn=user?`<p>Angemeldet: ${esc(user.displayName || user.email || '')}</p><p class="small">Dein Spielercode: <code style="overflow-wrap:anywhere">${esc(user.uid)}</code></p><button class="btn sm" data-act="shared-code">Spielercode kopieren</button> <button class="btn sm" data-act="shared-reconnect">Verbindung neu laden</button> <button class="btn sm ghost" data-act="shared-logout">Abmelden</button><p class="small">Spieler geben ihren Code dem DM. Dieser wählt bei der Abenteuerfigur „Spieler verbinden“. Zugeordnete Figuren erscheinen automatisch in My heroes.</p>`:`<button class="btn" data-act="shared-login">${sharedCloud.api?'Mit Google anmelden':'Google-Verbindung vorbereiten'}</button><p class="small">Dabei werden Anmeldung und ausdrücklich verbundene Charakterbögen bei Google Firebase gespeichert. Lokale Abenteuer und Karten werden nicht hochgeladen.</p>`;
 const hidden=user?[...sharedCloud.docs.values()].filter(d=>d.playerUid===user.uid&&(S.cloudSettings?.hidden || []).includes(d.id)):[];
 const owned=user&&S.role==='dm'?[...sharedCloud.docs.values()].filter(d=>d.dmUid===user.uid&&!(S.party || []).some(p=>p.cloudLink?.id===d.id)):[];
 return `<details class="card" ${sharedCloud.open?'open':''}><summary data-act="shared-toggle">Gemeinsame Charaktere${user?' · verbunden':''}</summary><p class="small">Gespeicherte Ausrüstung, Training, Geschichte, Items und Begleiter werden zwischen euren Geräten abgeglichen. HP, Kampfzustand und Würfelwürfe bleiben vorerst lokal.</p>${signedIn}<p class="small" role="status">${esc(sharedCloud.message)}</p>${hidden.map(d=>`<p>${esc(d.campaignName)} <button class="btn sm" data-act="shared-show" data-id="${esc(d.id)}">Entfernte gemeinsame Figur wieder anzeigen</button></p>`).join('')}${owned.map(d=>`<p>${esc(d.campaignName)} <button class="btn sm" data-act="shared-import" data-id="${esc(d.id)}">Gemeinsame Figur hier hinzufügen</button></p>`).join('')}</details>`;
}
function sharedImport(id){
 const remote=sharedCloud.docs.get(id);if(S.role!=='dm'||!remote||remote.dmUid!==sharedCloud.user?.uid)return;
 if(S.combat){toast('Zuerst den Kampf beenden.');return;}
 if(S.party.some(p=>p.cloudLink?.id===id))return;
 try{const data=QBSharedHeroes.read(remote.sheetJson,cmSheet),p=QBHeroRules.toHero(data.build,data.sheet,{id:uid('p'),want:data.story.want});p.heroStory=data.story;p.cloudLink={id,uid:sharedCloud.user.uid,revision:remote.revision,baseJson:remote.sheetJson};heroDefaults(p);S.party.push(p);render();}catch(e){toast(sharedError(e));}
}
function sharedShare(id){
 if(S.role!=='dm')return;const p=S.party.find(p=>p.id===id);if(!p?.build)return;
 if(!sharedCloud.user){toast('Zuerst unter Gemeinsame Charaktere mit Google verbinden.');return;}
 const user=sharedCloud.user,campaign=S.campaigns.current;
 const dlg=openDialog('Spieler verbinden · '+p.name,'<p>Der Spieler meldet sich unter My heroes → Gemeinsame Charaktere an und gibt dir seinen Spielercode. Nur du und dieses Konto erhalten Zugriff auf den Bogen.</p><label class="f">Spielercode<input id="shared-player" maxlength="128" autocomplete="off"></label><p class="small">Der aktuelle Bogen wird zu Firebase hochgeladen. Private Abenteuertexte und Karten bleiben lokal. Zum Wechseln eines Spielers zuerst die bestehende Verbindung beenden.</p><button class="btn primary" id="shared-share">Charakter verbinden</button>');
 dlg.querySelector('#shared-share').onclick=async()=>{
  const playerUid=dlg.querySelector('#shared-player').value.trim();if(!/^[A-Za-z0-9_-]{6,128}$/.test(playerUid)||playerUid===user.uid){toast('Bitte den Code des Spielers eintragen, nicht deinen eigenen.');return;}
  if(S.role!=='dm'||sharedCloud.user!==user||S.campaigns.current!==campaign||!S.party.includes(p)||p.cloudLink){toast('Die Figur oder Anmeldung hat sich geändert. Bitte erneut öffnen.');return;}
  const button=dlg.querySelector('#shared-share');button.disabled=true;
  try{crKeepHomebrew(p.build);const sheetJson=QBSharedHeroes.sheet(p,true),a=sharedCloud.api,ref=a.db.doc(a.db.collection(a.store,'sharedHeroes'));
   const data={dmUid:user.uid,playerUid,revision:1,sheetJson,campaignName:QBCampaigns.current(S).name.slice(0,80),updatedBy:user.uid,updatedAt:a.db.serverTimestamp()};
   await a.db.setDoc(ref,data);p.cloudLink={id:ref.id,uid:user.uid,revision:1,baseJson:sheetJson};sharedCloud.docs.set(ref.id,{...data,id:ref.id});dlg.close();render();toast('Verbunden. Der Spieler findet den Bogen in My heroes.');
  }catch(e){toast(sharedError(e));button.disabled=false;}
 };
}
function sharedReview(id,party){
 const record=party?S.party.find(p=>p.id===id):cmHero(id);if(!record?.cloudLink)return;
 const link=record.cloudLink,remote=sharedCloud.docs.get(link.id),user=sharedCloud.user;
 if(!user||link.uid!==user.uid){toast('Bitte mit dem zugeordneten Google-Konto anmelden.');return;}
 const dlg=openDialog('Charakterabgleich',`<p>${esc(sharedLabel(record,party))}</p><p>Deine lokale Fassung kannst du vor dem Übernehmen als Charakterdatei sichern. Der gemeinsame Stand ersetzt deine gespeicherten Charakterentscheidungen. Ein geöffneter Editor muss zuerst geschlossen werden.</p><button class="btn" id="shared-backup">Lokale Fassung sichern</button> ${remote?'<button class="btn primary" id="shared-use">Gemeinsamen Stand übernehmen</button>':''}${party?'<p><button class="btn ghost" id="shared-stop">Spielerverbindung beenden</button></p>':''}<button class="btn sm" id="shared-retry">Verbindung erneut prüfen</button><p class="small" id="shared-review-error"></p>`);
 dlg.querySelector('#shared-retry').onclick=()=>{sharedCloud.errors.delete(link.id);sharedWatch(sharedCloud.user);dlg.close();render();};
 dlg.querySelector('#shared-backup').onclick=()=>saveFile('character-before-sync.json',QBCampaigns.heroFile({id:record.id,build:record.build,story:party?record.heroStory:record.story}),'Lokale Fassung gesichert.');
 dlg.querySelector('#shared-use')?.addEventListener('click',()=>{
  if(sharedCloud.user!==user||sharedEditing(record,party)||(party&&S.combat)){toast('Zuerst Bearbeitung oder Kampf beenden.');return;}
  try{const latest=sharedCloud.docs.get(link.id);if(!latest)throw Error('Kein Zugriff auf den gemeinsamen Stand.');sharedApply(record,party,latest);sharedCloud.errors.delete(link.id);dlg.close();render();}catch(e){toast(sharedError(e));}
 });
 dlg.querySelector('#shared-stop')?.addEventListener('click',()=>clConfirm('Spielerverbindung beenden?','Beide lokalen Kopien bleiben erhalten. Der gemeinsame Bogen wird entfernt und nicht mehr abgeglichen.',async()=>{
  try{if(sharedCloud.user!==user||S.role!=='dm')return;await sharedCloud.api.db.deleteDoc(sharedCloud.api.db.doc(sharedCloud.api.store,'sharedHeroes',link.id));delete record.cloudLink;sharedCloud.docs.delete(link.id);dlg.close();render();}catch(e){toast(sharedError(e));}
 },'Verbindung beenden'));
}
function sharedHeroActions(){return {'shared-reconnect':()=>{sharedWatch(sharedCloud.user);liveWatch(sharedCloud.user);},'shared-toggle':()=>{sharedCloud.open=!sharedCloud.open;},'shared-show':d=>{S.cloudSettings.hidden=(S.cloudSettings.hidden || []).filter(id=>id!==d.id);sharedReconcile();},'shared-import':d=>sharedImport(d.id),'shared-login':()=>void sharedStart(true),'shared-code':()=>navigator.clipboard.writeText(sharedCloud.user?.uid || '').then(()=>toast('Spielercode kopiert.'),()=>toast('Bitte den sichtbaren Spielercode markieren und kopieren.')),'shared-logout':async()=>{S.cloudSettings={...S.cloudSettings,enabled:false};save();if(sharedCloud.api)await sharedCloud.api.auth.signOut(sharedCloud.api.session);render();},'shared-share':d=>sharedShare(d.id),'shared-review':d=>sharedReview(d.id,d.party==='1')};}
