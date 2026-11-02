const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),ui=read('src/ui/campaign-invites.js'),campaigns=read('src/ui/campaigns.js');
new vm.Script(ui,{filename:'src/ui/campaign-invites.js'});
assert.match(html,/src\/ui\/campaign-invites\.js\?v=/,'invitation script must be loaded');
assert.match(html,/\.\.\.inviteActions\(\)/,'invitation actions must be registered');
assert.match(html,/inviteFromUrl\(\)/,'invitation URL handoff must be active');
assert.match(campaigns,/inviteButtons\(true\)/,'DM entry point missing');
assert.match(campaigns,/inviteButtons\(false\)/,'player entry point missing');
for(const action of ['invite-create','invite-join','invite-review','invite-revoke'])assert.ok(ui.includes("'"+action+"'"),'missing '+action+' handler');
assert.match(ui,/getRandomValues\(new Uint8Array\(16\)\)/,'invitation IDs must use cryptographic randomness');
assert.match(ui,/sharedHeroes/,'approval must reuse existing shared-hero sync');
const shared=vm.createContext({});vm.runInContext(read('src/app/shared-heroes.js'),shared);
const submitted={id:'mine',joinToken:'a'.repeat(32)},other={id:'other'};
assert.equal(shared.QBSharedHeroes.invitedHero([other,submitted],{id:'a'.repeat(32)+'-player'},'player'),submitted,'the approved doc must link the submitted hero');
assert.equal(shared.QBSharedHeroes.invitedHero([other,submitted],{id:'b'.repeat(32)+'-player'},'player'),null,'another invitation must not link it');
assert.equal(shared.QBSharedHeroes.invitedHero([{...submitted,cloudLink:{id:'x'}}],{id:'a'.repeat(32)+'-player'},'player'),null,'an already linked hero stays as it is');
console.log('PASS: invitation UI scripts, entry points, actions, sync wiring and linking the submitted hero.');

(async()=>{
 const store={name:'firestore'},docs=new Map(),messages=[];
 const token='a'.repeat(32),request=token+'/requests/player-user';
 docs.set(token,{dmUid:'dm-user'});docs.set(request,{playerUid:'player-user',sheetJson:'sheet'});
 const db={doc:(parent,...parts)=>{assert(parent===store||typeof parent==='string','Firestore document reference must use the initialized store');return parent===store?parts.join('/').replace('campaignInvites/',''):parent+'/'+parts.join('/');},collection:(parent,name)=>parent+'/'+name,getDoc:async ref=>({exists:()=>docs.has(ref),data:()=>docs.get(ref)}),setDoc:async(ref,data)=>docs.set(ref,data),deleteDoc:async ref=>docs.delete(ref),serverTimestamp:()=>1};
 const ctx=vm.createContext({console,sharedCloud:{user:{uid:'dm-user'},api:{db,store}},S:{role:'dm',campaigns:{current:'campaign'},party:[]},toast:m=>messages.push(m),sharedError:e=>e.message,QBCampaigns:{current:()=>({name:'Test'})},QBSharedHeroes:{read:()=>({build:{name:'Hero'},sheet:{},story:{want:''}})},cmSheet:()=>{},QBHeroRules:{toHero:()=>({name:'Hero'})},uid:()=> 'hero',heroDefaults:()=>{},render:()=>{}});
 vm.runInContext(ui,ctx);let closed=false;
 await ctx.inviteApprove({id:token,uid:'player-user'},{close:()=>closed=true});
 assert.equal(ctx.S.party.length,1, messages.join('; '));assert(docs.has('sharedHeroes/'+token+'-player-user'));assert(!docs.has(request));assert(closed);
 // A retry after interrupted request cleanup must not duplicate the party character.
 docs.set(request,{playerUid:'player-user',sheetJson:'sheet'});await ctx.inviteApprove({id:token,uid:'player-user'},{close:()=>{}});assert.equal(ctx.S.party.length,1);
 console.log('PASS: approval creates a shared character using the real API shape, adds the hero, removes the request and avoids duplicates on retry.');
})().catch(e=>{console.error(e);process.exitCode=1;});
