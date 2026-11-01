// Exercise the real UI actions, rendering, browser save and hero-file round trip.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),plain=x=>JSON.parse(JSON.stringify(x));
const nodes=new Map(),events={},storage=new Map();
const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',hidden:false,dataset:{},setAttribute(){},classList:{add(){},remove(){}}});return nodes.get(s);};
const tabs=['home','create','heroes','campaigns','import','desk','homebrew','combat'].map(v=>({dataset:{v},setAttribute(){}}));
let exported='';
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:s=>s==='.tab'?tabs:[],getElementById:id=>node('#'+id),addEventListener(k,f){(events[k]??=[]).push(f);}},crypto:require('node:crypto').webcrypto,TextEncoder,
  BroadcastChannel:class{postMessage(){}close(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:null,console,setTimeout:()=>0,clearTimeout(){},URL,navigator:{}});
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};
for(const n of ['player-core','srd-monsters','attacks','srd-heroes','phb-feats','srd-spells','hero-rules','homebrew','table-homebrew','sheet-export','combat-rules','conditions','encounter-design'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',n+'.js'),'utf8'),ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');require('./ui-scripts.cjs').loadUi(html,ctx);
vm.runInContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(x=>x.includes('const ACT=')),ctx);
const run=c=>vm.runInContext(c,ctx),snapshot=()=>plain(run('S.creator.build'));
ctx.saveFile=(name,text)=>{exported=text;};run('saveFile=globalThis.saveFile;');
function input(bind,value){for(const f of events.input||[])f({target:{dataset:{bind,rerender:''},type:'select-one',value}});}
function bard(){run(`S.role='player';S.tab='create';S.creator=crNew();S.creator.build.level=5;ACT['cr-quick']({v:'bard'});S.creator.build.name='Camilla';S.creator.step='review';render();`);}
function exportSaved(){run(`ACT['cm-send']({id:S.myHeroes.at(-1).id});`);return JSON.parse(exported);}

// A newly completed Bard: custom background boosts, a split ASI and Lore/Expertise choices.
bard();
input('creator.boostUI.plus2','CHA');input('creator.boostUI.plus1','INT');
input('creator.asiUI.4.mode','1-1');input('creator.asiUI.4.a','CHA');input('creator.asiUI.4.b','DEX');
run(`S.creator.build.featPicks.lore=['perception','investigation','history'];S.creator.build.expertise=['insight','religion'];render();`);
assert.equal(run('crSheet(S.creator).open.length'),0);
const initial=snapshot(),numbers=plain(run('crSheet(S.creator).scores'));
run(`ACT['cr-savehero']();render();`);
assert.deepEqual(plain(run('S.myHeroes.at(-1).build')),initial,'first save keeps all choices');
const freshFile=exportSaved();assert.deepEqual(freshFile.hero.build,initial,'fresh export keeps all choices');
run(`S=load();render();`);assert.deepEqual(plain(run('S.myHeroes.at(-1).build')),initial,'browser reload keeps all choices');

// Reopening must not erase choices merely by displaying the review or other steps.
run(`ACT['cm-edit']({id:S.myHeroes.at(-1).id});render();`);
assert.deepEqual(snapshot(),initial,'opening Edit and rendering preserves the completed build');
assert.equal(run('crSheet(S.creator).open.length'),0,'a saved hero remains complete');
assert.deepEqual(plain(run('crSheet(S.creator).scores')),numbers,'reopening retains final ability scores');
assert.deepEqual(plain(run('S.creator.boostUI')),{mode:'2-1',plus2:'CHA',plus1:'INT'});
assert.deepEqual(plain(run('S.creator.asiUI[4]')),{feat:'ability-score-improvement',mode:'1-1',a:'CHA',b:'DEX'});
for(const step of ['class','abilities','background','skills','review'])run(`S.creator.step='${step}';render();`);
assert.deepEqual(snapshot(),initial,'navigating steps does not erase choices');
run(`S.creator.build.name='Camilla revised';ACT['cr-savehero']();render();`);
const edited=exportSaved();assert.deepEqual({...edited.hero.build,name:initial.name},initial,'edit-save-export keeps untouched choices');

// A JSON received from another browser has no temporary UI fields at all.
run(`S.myHeroes=[];S.creator=crNew();`);
const parsed=ctx.QBCampaigns.parseHero(JSON.stringify(freshFile),b=>run('QBHeroRules').derive(b));
assert(!parsed.error);ctx.received=parsed.hero;
run(`S.myHeroes=[{id:received.id,build:received.build,story:received.story}];ACT['cm-edit']({id:received.id});render();`);
assert.deepEqual(snapshot(),initial,'imported JSON can be opened for editing without losing choices');
run(`S.creator.build.name='Camilla imported';ACT['cr-savehero']();render();`);
assert.deepEqual({...exportSaved().hero.build,name:initial.name},initial,'import-edit-save-export retains the player’s choices');

// A legal user change must still replace the old choice, including clearing it.
run(`ACT['cm-edit']({id:S.myHeroes.at(-1).id});render();`);
input('creator.asiUI.4.feat','');assert(!run('S.creator.build.asi[4]'),'clearing a level choice stays cleared');
input('creator.asiUI.4.feat','ability-score-improvement');input('creator.asiUI.4.mode','2');input('creator.asiUI.4.a','CHA');
assert.deepEqual(plain(run('S.creator.build.asi[4].plus')),{CHA:2});

// Cover the other background arrangement and a feat’s single +1, including later levels.
for(const mode of ['triple','feat']){
  bard();
  if(mode==='triple')run(`S.creator.boostUI.mode='1-1-1';render();`);
  else {input('creator.asiUI.4.feat','war-caster');input('creator.asiUI.4.a','CHA');}
  const before=snapshot();run(`ACT['cr-savehero']();render();ACT['cm-edit']({id:S.myHeroes.at(-1).id});render();`);
  assert.deepEqual(snapshot(),before,mode+' choices survive reopening');
}
// Several class-level selections must remain distinct, not become one repeated ASI.
run(`S.creator=crNew();S.creator.build.level=12;ACT['cr-quick']({v:'bard'});S.creator.build.name='High-level Bard';S.creator.step='class';render();`);
input('creator.asiUI.4.mode','1-1');input('creator.asiUI.4.a','CHA');input('creator.asiUI.4.b','DEX');
input('creator.asiUI.8.feat','war-caster');input('creator.asiUI.8.a','CHA');
input('creator.asiUI.12.feat','ability-score-improvement');input('creator.asiUI.12.a','CON');
const higher=snapshot();run(`ACT['cr-savehero']();render();ACT['cm-edit']({id:S.myHeroes.at(-1).id});render();`);
assert.deepEqual(snapshot(),higher,'each level retains its own choice and ability increases');
console.log('PASS: fresh Bard save/reload/export, imported and local edit round trips, split ASI, feat +1, all-three background boosts, Lore skills, Expertise, and deliberate changes.');
run(`S.creator=crNew();S.creator.build.level=5;ACT['cr-quick']({v:'rogue'});S.creator.build.background='criminal';S.creator.build.skills=['acrobatics','deception','sleight-of-hand','stealth'];S.creator.build.expertise=['sleight-of-hand','stealth'];S.creator.step='skills';`);
let skillView=run('crStepBody(S.creator,crSheet(S.creator))');assert.equal((skillView.split('<h3>Expertise</h3>')[0].match(/checked disabled/g)||[]).length,2);assert(skillView.includes('Choose 2 of 4 skills'));assert.equal(run("crSheet(S.creator).skills.stealth.expert"),true);assert.equal(run("crSheet(S.creator).open.find(x=>x.label==='Rogue skills').left"),2);
run(`ACT['cr-toggle']({k:'skills',v:'investigation',max:4});ACT['cr-toggle']({k:'skills',v:'perception',max:4});`);assert.equal(run('S.creator.build.skills.length'),4);assert.equal(run("crSheet(S.creator).open.some(x=>x.label==='Rogue skills')"),false);assert.equal(run('crSheet(S.creator).skills.stealth.expert'),true);
console.log('PASS: granted background skills are disabled, excluded from class choices, remain trained and retain Expertise.');
run(`openDialog=()=>({querySelector:()=>({}),close(){}});`);
bard();run(`S.role='dm';S.creator.build.name='DM-created hero';`);
const partyBefore=run('S.party.length'),mineBefore=run('(S.myHeroes||[]).length');
run(`ACT['cr-add']();render();`);assert.equal(run('S.party.length'),partyBefore+1);assert.equal(run('S.myHeroes.length'),mineBefore+1);assert.equal(run('S.myHeroes.at(-1).build.name'),'DM-created hero');
run(`ACT['cm-edit']({id:S.myHeroes.at(-1).id});S.creator.build.name='Edited DM hero';ACT['cr-savehero']();render();`);assert.equal(run('S.party.length'),partyBefore+1);assert.equal(run('S.myHeroes.length'),mineBefore+1);assert.equal(run('S.myHeroes.at(-1).build.name'),'Edited DM hero');
run(`S.myHeroes=S.myHeroes.filter(h=>h.id!==S.party.at(-1).myHeroId);ACT['cm-save-party']();render();`);assert.equal(run('cmUnsavedParty().length'),0);const recovered=run('S.myHeroes.length');run(`ACT['cm-save-party']();render();S=load();`);assert.equal(run('S.myHeroes.length'),recovered);
console.log('PASS: DM Add to party also saves My heroes; editing updates without adding a party copy; explicit party recovery is persistent and repeat-safe.');
// Existing saved sheets can retain unfinished edits as an explicit draft.
run(`ACT['cm-edit']({id:S.myHeroes.at(-1).id});S.creator.build.name='Saved unfinished draft';S.creator.build.skills=[];ACT['cr-savehero']();render();S=load();`);
assert.equal(run('S.myHeroes.at(-1).build.name'),'Saved unfinished draft');assert.equal(run('S.myHeroes.at(-1).build.skills.length'),0);assert(run('vHeroes()').includes('Draft ·'));
// Adventure editing is scoped, preserves combat resources, and never adds a second party hero.
bard();run(`S.role='dm';S.combat=null;S.creator.build.name='Adventure hero';ACT['cr-add']();render();S.party.at(-1).hpNow=7;S.party.at(-1).stamina=1;S.party.at(-1).ac=27;S.party.at(-1).conds=['Poisoned'];ACT['adventure-hero-edit']({id:S.party.at(-1).id});S.creator.build.name='Adventure revised';`);
const partyCount=run('S.party.length'),savedName=run('S.myHeroes.at(-1).build.name');run(`ACT['adventure-hero-save']();render();`);assert.equal(run('S.party.length'),partyCount);assert.equal(run('S.party.at(-1).name'),'Adventure revised');assert.equal(run('S.party.at(-1).hpNow'),7);assert.equal(run('S.party.at(-1).ac'),27);assert.equal(run('S.party.at(-1).stamina'),1);assert.equal(run('S.myHeroes.at(-1).build.name'),savedName);
// The export contains only one hero; applying it requires a click and retains a previous version.
run(`ACT['adventure-hero-export']({id:S.party.at(-1).id});`);const updateFile=exported;assert.equal(JSON.parse(updateFile).format,'quillbound-hero');assert(!updateFile.includes('campaigns'));assert(!updateFile.includes('hpNow'));
run(`openDialog=(title,body)=>globalThis.updateDialog={isConnected:true,body,nodes:{},querySelector(id){return this.nodes[id]??={};},close(){this.isConnected=false;}};`);
ctx.updateFile=updateFile;run(`S.role='player';adventureUpdateReview(globalThis.updateFile,S.myHeroes.at(-1).id);`);assert.equal(run('S.myHeroes.at(-1).build.name'),savedName);run(`globalThis.updateDialog.querySelector('#adventure-update-apply').onclick();`);assert.equal(run('S.myHeroes.at(-1).build.name'),'Adventure revised');assert.equal(run('S.myHeroes.at(-1).previousVersion.build.name'),savedName);
run(`clConfirm=(title,text,run)=>run();ACT['hero-restore-previous']({id:S.myHeroes.at(-1).id});render();`);assert.equal(run('S.myHeroes.at(-1).build.name'),savedName);
run(`S.role='dm';S.combat={};ACT['cm-delmember']({id:S.party.at(-1).id});`);assert.equal(run('S.party.length'),partyCount);run(`S.combat=null;ACT['cm-delmember']({id:S.party.at(-1).id});render();S=load();`);assert.equal(run('S.party.length'),partyCount-1);assert(run('S.myHeroes.some(h=>h.build.name===\'Adventure hero\')'));
console.log('PASS: saved draft edits, scoped adventure editing, resource preservation, reviewed player update/restore and adventure-only removal.');
// The four reported fields survive save, browser reload and re-opening Edit.
run(`ACT['cm-edit']({id:S.myHeroes.at(-1).id});S.creator.step='equipment';ACT['cr-bg']({v:'criminal'});S.creator.build.gear.extra=[{id:'longbow',count:1,how:'grant'}];S.creator.build.training=['longbow'];S.creator.story={want:'Keep the violin',left:'A friend',fear:'An empty gallery'};crSheet(S.creator);`);
const fourFields=snapshot(),fourStory=plain(run('S.creator.story'));assert(run('vCreate()').includes('save changes before leaving'));run(`ACT['cr-savehero']();render();S=load();ACT['cm-edit']({id:S.myHeroes.at(-1).id});render();`);assert.deepEqual(snapshot(),fourFields);assert.deepEqual(plain(run('S.creator.story')),fourStory);
run(`S.creator.story.want='Saved through navigation';ACT.tab({v:'heroes'});`);assert.equal(run('S.tab'),'create');run(`globalThis.updateDialog.querySelector('#hero-leave-save').onclick();S=load();`);assert.equal(run('S.tab'),'heroes');assert.equal(run('S.myHeroes.at(-1).story.want'),'Saved through navigation');
console.log('PASS: equipment/background/training/story round trip and unsaved-navigation Save & continue.');
