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
 console.log('PASS: bounded raster chunks, complete map assembly, session expiry/membership, map publisher and generation guards, authenticated roll chat and clear-on-end.');
})().catch(e=>{console.error(e);process.exitCode=1;});
