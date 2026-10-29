// Player mode, My heroes, hero files and the Adventure manager (campaigns): src/app/campaigns.js and src/ui/campaigns.js.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const nodes=new Map(),node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',hidden:false,dataset:{},setAttribute(){},classList:{add(){},remove(){}}});return nodes.get(s);};
const tabs=['home','create','heroes','campaigns','import','desk','homebrew','combat'].map(v=>({dataset:{v},hidden:false,setAttribute(){}}));
let toastText='',saved={};
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:s=>s==='.tab'?tabs:[],getElementById:id=>node('#'+id),addEventListener(){}},crypto:require('node:crypto').webcrypto,TextEncoder,
  BroadcastChannel:class{postMessage(){}close(){}},localStorage:{getItem:()=>null,setItem(){}},window:null,console,setTimeout:()=>0,clearTimeout(){},URL,navigator:{}});ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};
for(const n of ['player-core','srd-monsters','attacks','srd-heroes','phb-feats','srd-spells','hero-rules','homebrew','table-homebrew','sheet-export','combat-rules','conditions','encounter-design'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',n+'.js'),'utf8'),ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');require('./ui-scripts.cjs').loadUi(html,ctx);vm.runInContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(x=>x.includes('const ACT=')),ctx);
const run=c=>vm.runInContext(c,ctx),C=ctx.QBCampaigns,view=()=>node('#view').innerHTML,shown=()=>tabs.filter(t=>!t.hidden).map(t=>t.dataset.v);
ctx.saveFile=(name,text)=>{saved={name,text};};ctx.toast=t=>{toastText=t;};run('saveFile=globalThis.saveFile;toast=globalThis.toast;clConfirm=(a,b,go)=>go();'); // confirmations accepted at once

(async()=>{
/* a new browser is a player's: only Start, Create a hero and My heroes */
assert.equal(run('S.role'),'player');assert.deepEqual(shown(),['home','create','heroes']);assert(view().includes('Welcome, adventurer'));
run("S.tab='desk';render();");assert.equal(run('S.tab'),'home','a player can’t open the DM desk');
/* a player builds Toxik (a Vampire Artificer from the shipped homebrew), saves him and sends him to the DM */
run(`S.tab='create';S.creator=crNew();render();ACT['cr-species']({v:'hb-sp-night-shift-vampire'});render();ACT['cr-class']({v:'hb-cl-night-shift-artificer'});render();ACT['cr-quick']({v:'hb-cl-night-shift-artificer'});
  S.creator.build.level=5;ACT['cr-quick']({v:'hb-cl-night-shift-artificer'});S.creator.build.name='Toxik';S.creator.story.want='Proof that the machine works';S.creator.step='review';render();`);
assert(view().includes('Save to My heroes')&&!view().includes('Add to party'),'players save heroes; only the DM adds them to a party');
run(`ACT['cr-savehero']();render();`);assert.equal(run('S.myHeroes.length'),1);assert.equal(run('S.tab'),'heroes');assert(view().includes('Toxik')&&view().includes('Send to DM'));
const id=run('S.myHeroes[0].id');run(`ACT['cm-send']({id:'${id}'})`);assert.match(saved.name,/^toxik\.quillbound-hero\.json$/);
const file=JSON.parse(saved.text);assert.equal(file.format,'quillbound-hero');assert(file.hero.build.hbData.species[0].name==='Vampire'&&file.hero.build.hbData.classes[0].name==='Artificer','the file carries the homebrew it uses');
/* editing and saving again updates the same hero */
run(`ACT['cm-edit']({id:'${id}'});S.creator.build.name='Toxik';ACT['cr-savehero']();`);assert.equal(run('S.myHeroes.length'),1,'an edit replaces the hero, it doesn’t copy it');

/* the DM: a passphrase opens DM mode on this device */
await C.setLock(run('S'),'nightshift');assert(await C.unlock(run('S'),'nightshift'));assert(!(await C.unlock(run('S'),'wrong')));
await assert.rejects(C.setLock({},'abc'),/at least 4/);
run(`S.role='dm';S.tab='campaigns';render();`);assert.deepEqual(shown(),tabs.map(t=>t.dataset.v));assert(view().includes('Adventure manager'));

/* a new campaign starts empty; the first one keeps everything; switching back restores it */
const before=run('S.party.length'),beats=run('S.beats.length');
run(`QBCampaigns.create(S,'The Night Shift');render();`);assert.equal(run('S.party.length'),0);assert.equal(run('S.beats.length'),0);assert.equal(run('S.combat'),null);
assert.equal(run('S.myHeroes.length'),1,'shared data stays: My heroes');assert(run('S.dmLock.hash'),'and the DM lock');
/* the hero file joins the party: sheet numbers, homebrew attacks, story leads */
run(`cmImportHeroes([${JSON.stringify(saved.text)}])`);assert.equal(run('S.party.length'),1);const p=run('JSON.parse(JSON.stringify(S.party[0]))');
assert.equal(p.name,'Toxik');assert.equal(p.fromPlayer,id);assert(p.attacks.some(a=>a.name==='Lightning Launcher')&&p.attacks.some(a=>a.name==='Claws'),'class and species attacks reach combat');assert(run("S.hooks.some(h=>/Toxik wants/.test(h.text))"));
run(`S.party[0].hpNow=5;cmImportHeroes([${JSON.stringify(saved.text)}])`);assert.equal(run('S.party.length'),1,'sent again: replaced');assert.equal(run('S.party[0].hpNow'),5,'and current HP kept');
run(`cmImportHeroes(['{"format":"something-else"}','not json'])`);assert(/not a Quillbound hero/.test(toastText));assert.equal(run('S.party.length'),1);
/* a homebrew hero still works in a browser without that homebrew */
const parsed=C.parseHero(saved.text,b=>{ctx.QBHeroRules.setHomebrew(ctx.QBHomebrew.forCreator({},b));return ctx.QBHeroRules.derive(b);});assert(!parsed.error&&parsed.sheet.cls==='Artificer');
const night=run('S.campaigns.current');run(`QBCampaigns.switchTo(S,S.campaigns.list[0].id)`);assert.equal(run('S.party.length'),before);assert.equal(run('S.beats.length'),beats,'the first campaign is back as it was');
run(`QBCampaigns.switchTo(S,'${night}')`);assert.equal(run('S.party[0].name'),'Toxik');
/* back up and restore */
run(`ACT['cm-export']()`);const back=C.parseCampaign(saved.text);assert.equal(back.name,'The Night Shift');assert.equal(back.data.party[0].name,'Toxik');assert(!('myHeroes' in back.data)&&!('dmLock' in back.data),'a backup holds only the campaign');
run(`QBCampaigns.importCampaign(S,${JSON.stringify(back)})`);assert.equal(run('S.campaigns.list.length'),3);assert.equal(run('S.party[0].name'),'Toxik');
assert.throws(()=>run(`QBCampaigns.remove(S,S.campaigns.current)`),/Switch to another/);
/* reset keeps the lock, the heroes and the other campaigns */
run(`ACT.reset()`);assert(run('S.dmLock&&S.myHeroes.length===1&&S.campaigns.list.length===3'));
/* locking returns to player mode */
run(`ACT['cm-lock']();render();`);assert.equal(run('S.role'),'player');assert.deepEqual(shown(),['home','create','heroes']);
console.log('PASS: player mode by default (DM tabs hidden); players save heroes and send hero files with their homebrew; the DM’s passphrase opens DM mode; campaigns switch, back up and restore without mixing data; hero files join (and update) the party with their attacks and story.');
})().catch(e=>{console.error(e);process.exit(1);});
