const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,Date,setTimeout:()=>0,clearTimeout(){},crypto:require('node:crypto').webcrypto});
vm.runInContext(fs.readFileSync(path.join(root,'src/app/live-session.js'),'utf8'),ctx);
const core=ctx.QBLiveSession,url='data:image/png;base64,'+'A'.repeat(500000),parts=core.split(url);
assert.equal(parts.length,3);assert.equal(core.join(parts,3),url);assert.throws(()=>core.join(parts,2));assert.throws(()=>core.split('javascript:alert(1)'));assert.throws(()=>core.split('data:image/svg+xml;base64,AAAA'));assert.throws(()=>core.split('data:image/png;base64,'+'A'.repeat(3000000)));
const session={id:'dm-user',dmUid:'dm-user',members:['player-user'],active:true,epoch:'epoch-one',campaignId:'campaign-one',publisher:'this-tab',expiresAt:{toMillis:()=>Date.now()+3600000}};
assert(core.active(session));assert(!core.active({...session,active:false}));assert(!core.active(session,Date.now()+7200000));assert(core.member(session,'player-user'));assert(!core.member(session,'stranger'));
let writes=[],batches=[],rootDoc={...session,map:null},rendered=0;
Object.assign(ctx,{sharedCloud:{user:{uid:'dm-user',displayName:'DM'},api:{store:{},db:{
 doc:(...args)=>args,collection:(...args)=>args,serverTimestamp:()=>123,
 setDoc:async(ref,data)=>writes.push({ref,data}),
 writeBatch:()=>{let batch=[];return {set:(ref,data)=>batch.push({ref,data}),delete:ref=>batch.push({delete:ref}),commit:async()=>batches.push(batch)};},
 runTransaction:async(store,fn)=>fn({get:async()=>({data:()=>rootDoc}),update:(ref,next)=>{rootDoc={...rootDoc,...next};}})
}}},S:{role:'dm',campaigns:{current:'campaign-one'}},playerPublisherId:'this-tab',render:()=>rendered++,toast(){},sharedError:e=>e.message,document:{getElementById:()=>null},esc:s=>s});
vm.runInContext(fs.readFileSync(path.join(root,'src/ui/live-session.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);ctx.session=session;ctx.imageUrl=url;
run('liveCloud.session=session;liveCloud.selected=session.id;liveCloud.wanted={id:session.id,epoch:session.epoch,publisher:session.publisher,key:"map-one",spot:{title:"Player map",url:imageUrl}};');
(async()=>{
 await run('liveUpload()');assert.equal(batches[0].length,3);assert.equal(rootDoc.map.count,3);assert.equal(rootDoc.map.title,'Player map');
 assert(batches[0][0].ref.includes('runs')&&batches[0][0].ref.includes('epoch-one'),'assets belong to this session generation');
 assert(!JSON.stringify(batches).includes('privateNotes'));
 run('liveCloud.session={...session,publisher:"other-tab"};liveCloud.wanted={id:session.id,epoch:session.epoch,publisher:session.publisher,key:"stale-map",spot:{title:"Wrong map",url:imageUrl}};');
 await run('liveUpload()');assert.equal(rootDoc.map.title,'Player map','superseded tab cannot replace live map');
 run('liveCloud.session={...session,epoch:"epoch-two"};');await run('liveUpload()');assert.equal(rootDoc.map.title,'Player map','old run cannot write to a new session');
 run('liveCloud.session=session;');await run('liveSend("Quinn: 1d20+7 = 21", "roll")');
 assert.equal(writes[0].data.authorUid,'dm-user');assert.equal(writes[0].data.kind,'roll');assert(writes[0].ref[0].includes('epoch-one'));
 run('sharedCloud.user={uid:"stranger"};');await assert.rejects(()=>run('liveSend("forged")'),/active/);assert.equal(writes.length,1);
 run('sharedCloud.user={uid:"player-user",displayName:"Player"};liveCloud.session={...session,active:false};');await assert.rejects(()=>run('liveSend("ended")'),/active/);
 run('liveCloud.session=session;liveCloud.mapUrl=imageUrl;liveCloud.mapKey="old-map";liveClear();');assert.equal(run('liveCloud.mapUrl'),'');assert.equal(run('liveCloud.messages.length'),0);
 // DM controls: the player never gets session controls, and a hidden map can be shown again.
 const clock={toMillis:()=>Date.now()+3600000,toDate:()=>new Date()},shown=[];
 Object.assign(ctx,{sceneMapContext:()=>({token:'scene-a',beat:{id:'a'}}),SceneMaps:{reference:()=>null},sceneMapsPause(){},publishPlayer(){shown.push(ctx.playerSpotlight);},window:{scrollTo(){}}});
 ctx.playerSpotlight={type:'image',title:'Vault',url};ctx.clock=clock;
 run('sharedCloud.user={uid:"dm-user",displayName:"DM"};liveCloud.session={...session,expiresAt:clock,map:{id:"m",title:"Vault",count:1}};');
 assert(run('liveBar()').includes('live-hide'));assert(run('liveBar()').includes('live-end'));assert(!run('livePanel()').includes('live-end'),'map and session controls live on Session only');
 await run('liveActions()["live-hide"]()');assert.equal(ctx.playerSpotlight,null);
 run('liveCloud.session={...liveCloud.session,map:null};');assert(run('liveBar()').includes('Show map: Vault'),'a hidden map offers to come back');
 await run('liveActions()["live-show"]()');assert.equal(ctx.playerSpotlight.title,'Vault');assert.equal(shown.at(-1).title,'Vault');
 run('sharedCloud.user={uid:"player-user",displayName:"P"};liveCloud.session={...session,expiresAt:clock,map:null};');const player=run('livePanel()');assert(!player.includes('live-hide')&&!player.includes('live-end')&&!player.includes('live-show'),'players get no session controls');assert(player.includes('player-dice'));
 console.log('PASS: DM live bar, reversible Hide map and no session controls for players.');
 // My heroes: synced marks, and removing a connection as DM or as player.
 const removed=[],confirm=(t,x,go)=>go(),hero=(id,link)=>({id,build:{name:id},story:{},cloudLink:link});
 const cloud=vm.createContext({console,S:{role:'player',myHeroes:[],party:[],campaigns:{list:[]}},esc:x=>String(x),render(){},toast(){},clConfirm:confirm,save(){},cmSheet:()=>null});
 vm.runInContext(fs.readFileSync(path.join(root,'src/app/shared-heroes.js'),'utf8'),cloud);vm.runInContext(fs.readFileSync(path.join(root,'src/ui/shared-heroes.js'),'utf8')+';globalThis.cloudKit={sharedCloud,heroSyncMark,sharedConnections,sharedUnlink,sharedHeroActions};',cloud);
 const kit=cloud.cloudKit,sheetJson=JSON.stringify({build:{name:'Toxik'}});
 kit.sharedCloud.user={uid:'player-one'};kit.sharedCloud.api={store:{},db:{doc:(...a)=>a.at(-1),deleteDoc:async id=>removed.push(id)}};
 kit.sharedCloud.docs.set('a',{id:'a',dmUid:'dm-account',playerUid:'player-one',campaignName:'Night Shift',sheetJson,revision:1});
 const toxik=hero('Toxik',{id:'a',uid:'player-one',revision:1,baseJson:sheetJson});cloud.S.myHeroes.push(toxik,{id:'plain',build:{name:'Solo'}});
 assert(kit.heroSyncMark(toxik).includes('>Synced<')&&kit.heroSyncMark(toxik).includes('with your DM'));assert.equal(kit.heroSyncMark(cloud.S.myHeroes[1]),'','a local hero has no mark');
 assert(kit.sharedConnections().includes('Toxik')&&kit.sharedConnections().includes('Stop syncing'));
 kit.sharedUnlink('a');assert.equal(toxik.cloudLink,undefined);assert.deepEqual([...cloud.S.cloudSettings.hidden],['a']);assert.equal(removed.length,0,'a player cannot delete the connection');
 kit.sharedHeroActions()['shared-show']({id:'a'});assert.equal(toxik.cloudLink.id,'a','syncing again relinks the kept hero instead of adding a copy');assert.equal(cloud.S.myHeroes.length,2);
 kit.sharedCloud.user={uid:'dm-account'};cloud.S.party.push(hero('Camilla',{id:'a',uid:'dm-account'}));assert(kit.sharedConnections().includes('Disconnect player'));
 await kit.sharedUnlink('a');await new Promise(r=>setImmediate(r));assert.deepEqual(removed,['a']);assert.equal(cloud.S.party[0].cloudLink,undefined);assert.equal(toxik.cloudLink,undefined);assert(!kit.sharedCloud.docs.has('a'));
 console.log('PASS: synced marks on My heroes; players stop syncing and can resume; DMs disconnect a player for both sides.');
 console.log('PASS: bounded raster chunks, complete map assembly, session expiry/membership, map publisher and generation guards, authenticated roll chat and clear-on-end.');
})().catch(e=>{console.error(e);process.exitCode=1;});
