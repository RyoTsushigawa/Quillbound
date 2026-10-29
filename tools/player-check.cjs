const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||require('node:path').resolve(__dirname,'..');
const core=fs.readFileSync(root+'/src/app/player-core.js','utf8');
const context=vm.createContext({});vm.runInContext(core,context);const Feed=context.PlayerFeed;
const secret='PRIVATE-SENTINEL-947';
const state={beats:[{id:'b',title:'Secret final boss',summary:secret,branches:[secret],player:{visible:true,title:'At the docks',text:'A ship is missing.'}}],hooks:[{id:'h',text:secret}],npcs:[{id:'n',name:'Kind stranger',role:secret,secret,wants:secret,knows:secret,player:{visible:true,title:'Stranger',text:'You met them at the inn.'}}],items:[{id:'i',desc:secret,player:{visible:false,title:'Unrevealed item',text:secret}}],party:[{name:'Hero',cls:'Fighter',left:secret,want:secret,conds:['Winded']}],combat:{name:secret,goal:secret,round:2,momentum:3,foes:[{name:'Bandit',status:'fighting',marks:['Disarmed'],hp:secret,moves:[secret],intent:secret}],log:[secret],pending:{secret}},playerSettings:{party:false,combat:false}};
let snapshot=Feed.snapshot(state,null);
assert.equal(snapshot.cards.length,2);assert.equal(snapshot.party.length,0);assert.equal(snapshot.combat,null);
assert(!JSON.stringify(snapshot).includes(secret));assert(!JSON.stringify(snapshot).includes('Secret final boss'));
state.playerSettings={party:true,combat:true};snapshot=Feed.snapshot(state,null);
assert.equal(snapshot.party[0].name,'Hero');assert.equal(snapshot.combat.foes[0].name,'Bandit');assert(!JSON.stringify(snapshot).includes(secret));
assert.equal(Feed.snapshot(state,{type:'image',url:'javascript:alert(1)'}).spotlight,null);
assert(!Feed.view({...snapshot,cards:[{kind:'npcs',title:'<script>bad()</script>',text:'<img onerror=bad()>"'}]}).includes('<script>'));
console.log('PASS: private fields excluded; reveals opt in; combat/party allowlist; image URL validation; HTML escaping.');
// HP combat: heroes show exact HP and stamina; enemies only a state, never their numbers.
const hpState={party:[{id:'p',name:'Hero',hp:20,hpNow:7,prof:2,stamina:0}],combat:{round:1,foes:[{id:'a',name:'Bandit',status:'fighting',hpMax:30,hpNow:30,acNum:17,attacks:[{name:'Scimitar',bonus:9,damage:'4d6+77'}]},{id:'b',name:'Ogre',status:'fighting',hpMax:59,hpNow:29,breakHp:12},{id:'c',name:'Cultist',status:'fighting',hpMax:9,hpNow:2,breakHp:3},{id:'d',name:'Guard',status:'fighting',hpMax:11,hpNow:9}],lite:{zones:{},positions:{},conditions:{},breaking:{},broke:{}}},playerSettings:{combat:true}};
const hpSnap=Feed.snapshot(hpState,null),hpJson=JSON.stringify(hpSnap.combat.foes);
assert.deepEqual(hpSnap.combat.heroes[0].hp+'/'+hpSnap.combat.heroes[0].hpMax+'/'+hpSnap.combat.heroes[0].stamina,'7/20/0');
assert.deepEqual(hpSnap.combat.foes.map(f=>f.state),['fresh','bloodied','wavering','hurt']);
for(const leak of ['hpMax','hpNow','acNum','attacks','breakHp','"30"','"59"','4d6+77','"17"'])assert(!hpJson.includes(leak),'enemy numbers stay private: '+leak);
assert(Feed.view(hpSnap).includes('HP 7 / 20')&&Feed.view(hpSnap).includes('Winded')&&Feed.view(hpSnap).includes('Wavering'));
console.log('PASS: player screen shows hero HP and stamina; enemies show only Fresh / Hurt / Bloodied / Wavering / Down, with no numbers.');
// Run the actual app with a tiny DOM and a paired player context. No DM storage in player context.
const nodes=new Map();const node=()=>({innerHTML:'',textContent:'',setAttribute(){},addEventListener(){},classList:{add(){},remove(){}}});
const document={querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},querySelectorAll:()=>[],addEventListener(){},getElementById:s=>{if(!nodes.has('#'+s))nodes.set('#'+s,node());return nodes.get('#'+s);}};
const channels=[];class BroadcastChannel{constructor(name){this.name=name;channels.push(this);}postMessage(data){for(const c of channels)if(c!==this&&c.name===this.name)c.onmessage?.({data:structuredClone(data)});}close(){channels.splice(channels.indexOf(this),1);}}
let stored;const dm=vm.createContext({document,localStorage:{getItem:()=>null,setItem:(k,v)=>{stored=v;}},crypto:require('node:crypto').webcrypto,BroadcastChannel,console,setTimeout:()=>0,clearTimeout(){},URL,window:null});dm.window=dm;dm.addEventListener=()=>{};
vm.runInContext(fs.readFileSync(root+'/src/app/encounter-design.js','utf8'),dm);vm.runInContext(core,dm);vm.runInContext(fs.readFileSync(root+'/src/app/srd-monsters.js','utf8'),dm);vm.runInContext(fs.readFileSync(root+'/src/app/attacks.js','utf8'),dm);for(const n of ['srd-heroes','srd-spells','hero-rules','homebrew'])vm.runInContext(fs.readFileSync(root+'/src/app/'+n+'.js','utf8'),dm);vm.runInContext(fs.readFileSync(root+'/src/app/combat-rules.js','utf8'),dm);vm.runInContext(fs.readFileSync(root+'/src/app/conditions.js','utf8'),dm);
const html=fs.readFileSync(root+'/index.html','utf8');const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim()&&!s.includes('import * as QB'));
assert.equal(scripts.length,1);require('./ui-scripts.cjs').loadUi(html,dm);vm.runInContext(scripts[0],dm);
vm.runInContext("S.tab='desk';render();",dm);assert(nodes.get('#view').innerHTML.includes('Reveal…'));assert(stored);
const playerNodes=new Map();const pd={getElementById:id=>{if(!playerNodes.has(id))playerNodes.set(id,node());return playerNodes.get(id);},documentElement:{}};
const token=vm.runInContext('S.playerSettings.token',dm);const player=vm.createContext({document:pd,location:{hash:'#'+token},BroadcastChannel,setInterval(){},window:{addEventListener(){}}});vm.runInContext(core,player);vm.runInContext(fs.readFileSync(root+'/src/app/player-screen.js','utf8'),player);
assert(playerNodes.get('player-view').innerHTML.includes('The adventure awaits'));
vm.runInContext("S.npcs[0].secret='PRIVATE-SENTINEL-947';S.npcs[0].player={visible:true,title:'A familiar face',text:'Ask about the missing ship'};render();",dm);
assert(playerNodes.get('player-view').innerHTML.includes('A familiar face'));assert(!playerNodes.get('player-view').innerHTML.includes(secret));
vm.runInContext('S.npcs[0].player.visible=false;render();',dm);assert(!playerNodes.get('player-view').innerHTML.includes('A familiar face'));
console.log('PASS: full app initializes; DM desk repaired; paired player receives updates and hides revoked cards without reading DM storage.');
