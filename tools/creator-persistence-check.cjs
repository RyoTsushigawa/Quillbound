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
for(const mode of ['triple','feat','elemental']){
  bard();
  if(mode==='triple')run(`S.creator.boostUI.mode='1-1-1';render();`);
  else {input('creator.asiUI.4.feat',mode==='elemental'?'elemental-adept':'war-caster');input('creator.asiUI.4.a','CHA');if(mode==='elemental'){run(`S.creator.step='class';render();`);input('creator.build.featureChoices.level-4.damageType','Lightning');}}
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
// Unsupported details in old files must be requested, not invented or taken from class spells.
bard();run(`delete S.creator.build.featureChoices;S.creator.asiUI[4]={feat:'elemental-adept',a:'CHA'};render();`);
assert(run(`crSheet(S.creator).open.some(x=>/Elemental Adept damage type/.test(x.label))`));
assert(run(`crSheet(S.creator).open.some(x=>/Magic Initiate two cantrips/.test(x.label))`));
run(`S.creator.step='class';render();`);assert(node('#view').innerHTML.includes('Elemental Adept damage type'));
input('creator.build.featureChoices.level-4.damageType','Cold');
run(`S.creator.step='spells';render();`);assert(node('#view').innerHTML.includes('Two extra cantrips'));
const classSpells=plain(run('S.creator.build.spells'));
input('creator.build.featureChoices.background.ability','INT');
run(`ACT['cr-feat-cantrip']({source:'background',v:'sacred-flame'});ACT['cr-feat-cantrip']({source:'background',v:'guidance'});render();`);
input('creator.build.featureChoices.background.spell','cure-wounds');
assert.deepEqual(plain(run('S.creator.build.spells')),classSpells,'bonus spells do not consume or overwrite class selections');
assert.equal(run('crSheet(S.creator).open.length'),0);
assert.equal(run(`crSheet(S.creator).attacks.find(a=>a.name==='Sacred Flame (Magic Initiate)').bonus`),2,'feat cantrip uses chosen INT, not Bard CHA');
run(`S.creator.tab='spells';render();`);assert(node('#view').innerHTML.includes('Cure Wounds'));
const extra=snapshot();run(`ACT['cr-savehero']();render();ACT['cm-edit']({id:S.myHeroes.at(-1).id});render();`);
assert.deepEqual(snapshot(),extra,'damage type and all bonus-spell choices survive edit');
const printed=ctx.QBSheet.html(run('crSheet(S.creator)'),{lang:'en'});
assert(printed.includes('Damage type: Cold')&&printed.includes('Sacred Flame')&&printed.includes('Cure Wounds'),'printed sheet includes actual feat choices');
run(`ACT['cr-savehero']();render();`);assert.deepEqual(exportSaved().hero.build,extra,'feat choices survive JSON export');
// Only two distinct, on-list cantrips and a level-1 spell are accepted.
run(`ACT['cm-edit']({id:S.myHeroes.at(-1).id});render();S.creator.build.featureChoices.background.cantrips=['fire-bolt','fire-bolt'];`);
assert(run(`crSheet(S.creator).open.some(x=>/two cantrips/.test(x.label))`));
run(`S.creator.build.featureChoices.background=JSON.parse(${JSON.stringify(JSON.stringify(extra.featureChoices.background))});S.creator.build.featureChoices.background.spell='fireball';`);
assert(run(`crSheet(S.creator).open.some(x=>/level-1 spell/.test(x.label))`));
// A noncaster with Magic Initiate still gets the Spells step and an independent casting ability.
run(`S.creator=crNew();S.creator.build=QBHeroRules.quickBuild('fighter','Feat-only caster',1);S.creator.build.background='acolyte';S.creator.build.featureChoices={background:{feat:'magic-initiate',list:'cleric',ability:'WIS',cantrips:['guidance','sacred-flame'],spell:'cure-wounds'}};S.creator.step='spells';render();`);
assert(run(`crSteps(crSheet(S.creator)).some(([k])=>k==='spells')`));assert(node('#view').innerHTML.includes('Two extra cantrips'));
// Optional local-only user export: never commit the file or print its story.
if(process.argv[2]){
  const file=fs.readFileSync(process.argv[2],'utf8');
  const parsed=ctx.QBCampaigns.parseHero(file,run('cmSheet'));
  assert(!parsed.error,parsed.error);
  ctx.localHero=parsed.hero;
  const before=plain(parsed.hero.build),scores=plain(run('cmSheet(localHero.build).scores'));
  run(`S.myHeroes=[{id:localHero.id,build:localHero.build,story:localHero.story}];S.creator=crNew();ACT['cm-edit']({id:localHero.id});render();`);
  assert.deepEqual(snapshot(),before,'user export: opening and rendering preserves every build field');
  assert.deepEqual(plain(run('crSheet(S.creator).scores')),scores,'user export: final scores are unchanged');
  assert.equal(run('crSheet(S.creator).open.length'),run('QBHeroRules.featChoiceChecks(S.creator.build).length'),'user export: only the previously unsupported feat details need completion');
  run(`ACT['cr-savehero']();render();`);
  assert.deepEqual(exportSaved().hero.build,before,'user export: edit/save/export is lossless');
  console.log('PASS: supplied local hero JSON retains existing choices; previously unsupported feat details are explicitly requested without guessing them.');
  console.log(JSON.stringify({boost:before.boost,levelChoices:before.asi,lore:before.featPicks?.lore,expertise:before.expertise,finalScores:scores}));
}
console.log('PASS: fresh Bard save/reload/export, imported and local edit round trips, split ASI, feat +1, all-three background boosts, Lore skills, Expertise, and deliberate changes.');
