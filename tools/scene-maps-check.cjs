const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), crypto = require('node:crypto').webcrypto;
const ctx = vm.createContext({ crypto, Uint8Array, console });
vm.runInContext(fs.readFileSync(path.join(root, 'src/app/scene-maps.js'), 'utf8'), ctx);
const M = ctx.SceneMaps, key = 'a'.repeat(64), other = 'b'.repeat(64), url = 'data:image/png;base64,YQ==';
const link = (k = key, name = 'Gallery_PLAYER.png') => ({ key: k, fileName: name, title: 'Gallery', auto: true, reviewed: true });
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
(async () => {
  assert(M.reference(link()));
  assert.equal(M.reference({ ...link(), reviewed: false }), null);
  assert.equal(M.reference({ ...link(), key: 'not-a-hash' }), null);
  for (const file of ['Gallery_GM.png', 'Gallery-DM.png', 'NUR_SL/map.jpg', 'Room_SL.jpg', 'spielleitung.png']) {
    assert(M.dmFile({path:file})); assert.equal(M.reference(link(key, file)), null);
  }
  assert.equal(M.imageUrl('https://example.com/private-map.png'), false);
  assert.equal(M.imageUrl('data:image/svg+xml;base64,YQ=='), false);
  assert.equal(M.imageUrl('javascript:alert(1)'), false);
  const library = { products: [{ i: 3, name:'Museum', groups: [{kind:'book',files:[{path:'book.png',previewable:true}]}, {kind:'map',files:[
    {path:'a_PLAYER.png',previewable:true}, {path:'a_GM.png',previewable:true}, {path:'a.png',previewable:true,tags:{audience:'dm'}},
    {path:'duplicate.png',previewable:true,copyOf:'a_PLAYER.png'}, {path:'a.pdf',previewable:false}
  ]}] }] };
  assert.equal(M.candidates(library).length, 1); assert.equal(M.candidates(library)[0].pi, 3);
  assert.equal(M.suggested({summary:'KARTE: a_PLAYER.png'},library).pi,3);
  assert.equal(M.suggested({summary:'KARTE: a_GM.png'},library),null);
  assert.equal(M.suggested({summary:'KARTE: ../NUR_SL/a_PLAYER.png'},library),null);
  assert.equal(M.suggested({summary:'KARTE: a.png'},library),null);
  assert.equal(M.suggested({summary:'KARTE: a_PLAYER.png'},{products:[...library.products,...library.products]}),null,'ambiguous filenames never auto-link');
  const bytes = new Blob(['same approved file']); assert.equal(await M.fingerprint(bytes), require('node:crypto').createHash('sha256').update('same approved file').digest('hex'));
  await assert.rejects(M.assets.put({key,url:'https://wrong'}), /readable/);
  await assert.rejects(M.assets.get(key), /cannot save/);

  let shown = [], cleared = 0, missing = [], reads = 0, active = 'A', read = deferred();
  const c = M.controller({getImage:()=>{reads++;return read.promise;},show:v=>shown.push(v),clear:()=>cleared++,missing:r=>missing.push(r),current:t=>active===t});
  const first = c.activate('A',link()); active='B'; const second=c.activate('B',link(other));
  read.resolve({url}); await Promise.all([first,second]);
  assert.equal(shown.length,1,'rapid scene changes publish only the latest map');
  assert.equal(cleared,2); assert.equal(shown[0].title,'Gallery');
  await c.activate('B',link(other));assert.equal(reads,2,'ordinary renders do not override a manual handout');
  active='C';read=deferred();const paused=c.activate('C',link());c.pause();read.resolve({url});await paused;assert.equal(shown.length,1,'clear/manual display cancels pending automatic maps');
  active='D';read=deferred();const failed=c.activate('D',link());read.reject(Error('missing'));await failed;assert.equal(missing.length,1);
  c.retryMissing();read=deferred();const recovered=c.activate('D',link());read.resolve({url});await recovered;assert.equal(shown.length,2,'library import retries missing references');
  active='E';await c.activate('E',{...link(),auto:false});assert.equal(shown.length,2,'manual-only links never auto-show');
  active='F';await c.activate('F',null);assert.equal(shown.length,2,'unlinked scenes clear the old map without guessing');
  active='G';read=deferred();const switched=c.activate('G',link());active='other campaign';read.resolve({url});await switched;assert.equal(shown.length,2,'campaign changes cannot leak a pending map');
  active='H';read=deferred();const bad=c.activate('H',link());read.resolve({url:'https://example.com/map'});await bad;assert.equal(shown.length,2,'only re-encoded image data can be shared');

  // Exercise the actual UI integration, with a persistent asset store and exact library-file hashes.
  const images=new Map(), calls=[];M.assets.get=async k=>images.get(k);M.assets.put=async image=>images.set(image.key,image);
  ctx.S={role:'dm',campaigns:{current:'one'},beats:[{id:'scene',status:'active',summary:'PRIVATE-SOLUTION',playerMap:link()}],importer:{lib:null}};
  ctx.window=ctx;ctx.playerSpotlight=null;ctx.publishPlayer=()=>calls.push(ctx.playerSpotlight);ctx.toast=()=>{};ctx.esc=x=>String(x).replace(/</g,'&lt;');
  vm.runInContext(fs.readFileSync(path.join(root,'src/ui/scene-maps.js'),'utf8'),ctx);
  images.set(key,{key,url});await vm.runInContext('sceneMapsSync()',ctx);
  assert.equal(ctx.playerSpotlight.url,url);assert(!JSON.stringify(ctx.playerSpotlight).includes('PRIVATE'));
  const persisted=JSON.parse(JSON.stringify(ctx.S));assert.equal(persisted.beats[0].playerMap.key,key);assert(!JSON.stringify(persisted).includes('base64'),'campaign backup keeps references, not large images');
  ctx.playerSpotlight={type:'text',title:'Manual handout'};vm.runInContext('sceneMapsPause();sceneMapsSync()',ctx);await new Promise(r=>setImmediate(r));assert.equal(ctx.playerSpotlight.type,'text');
  ctx.S.campaigns.current='two';ctx.S.beats=[];vm.runInContext('sceneMapsSync()',ctx);assert.equal(ctx.playerSpotlight,null,'changing campaign clears the previous table’s spotlight');
  const exactKey=await M.fingerprint(bytes);ctx.S.beats=[{id:'new',status:'active',playerMap:link(exactKey,'a_PLAYER.png')}];ctx.S.importer.lib=library;
  M.pixels=async()=>url;ctx.QB={blobFor:async()=>({blob:bytes,dm:false})};
  await vm.runInContext('sceneMapsSync()',ctx);assert.equal(ctx.playerSpotlight.url,url);assert(images.has(exactKey),'an identical imported image reconnects a backup');
  images.clear();ctx.S.beats[0].playerMap.key=other;await vm.runInContext('sceneMapsSync()',ctx);assert.equal(ctx.playerSpotlight,null,'a changed file with the same name is not silently approved');
  ctx.S.beats=[{id:'legacy',title:'Old campaign',summary:'KARTE: a_PLAYER.png',status:'active'},{id:'off',title:'Manually unlinked',summary:'KARTE: a_PLAYER.png',playerMapAutoOff:true}];
  await vm.runInContext('sceneMapsAutoLink()',ctx);assert.equal(ctx.S.beats[0].playerMap.key,exactKey);assert.equal(ctx.S.beats[0].playerMap.auto,true);assert(!ctx.S.beats[1].playerMap,'manual unlink remains respected');assert(images.has(exactKey));
  ctx.S.beats.push({id:'later',title:'Added after reading',summary:'MAP: a_PLAYER.png'});await vm.runInContext('sceneMapsAutoLink()',ctx);assert.equal(ctx.S.beats[2].playerMap.key,exactKey,'new scenes added to an existing desk also auto-link');
  console.log('PASS: scene-map approval, GM exclusion, hash reconnect, persistent references, missing files, scene/campaign races and manual-display overrides.');
})().catch(error=>{console.error(error);process.exitCode=1;});
