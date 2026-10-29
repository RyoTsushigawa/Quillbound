const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),plain=x=>JSON.parse(JSON.stringify(x));
const nodes=new Map(),node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',dataset:{},setAttribute(){},classList:{add(){},remove(){}}});return nodes.get(s);};
const tabs=['home','create','heroes','campaigns','import','desk','homebrew','combat'].map(v=>({dataset:{v},setAttribute(){}}));
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:s=>s==='.tab'?tabs:[],getElementById:id=>node('#'+id),addEventListener(){}},crypto:require('node:crypto').webcrypto,TextEncoder,BroadcastChannel:class{postMessage(){}close(){}},localStorage:{getItem:()=>null,setItem(){}},window:null,console,setTimeout:()=>0,clearTimeout(){},URL,navigator:{}});
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};
for(const n of ['player-core','srd-monsters','attacks','srd-heroes','phb-feats','srd-spells','hero-rules','homebrew','table-homebrew','sheet-export','combat-rules','conditions','encounter-design','hero-import'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',n+'.js'),'utf8'),ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');require('./ui-scripts.cjs').loadUi(html,ctx);vm.runInContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(x=>x.includes('const ACT=')),ctx);
const run=c=>vm.runInContext(c,ctx),R=ctx.Stakes,E=ctx.EncounterDesign;
const hero=id=>({id,name:id,cls:'Artificer',level:5,prof:3,abil:{STR:10,DEX:14,CON:14,INT:18,WIS:12,CHA:10},trained:['INT','CON'],hp:38,hpNow:38,ac:16,stamina:3,hitDice:{die:8,left:5},attacks:[{name:'Tool',bonus:7,damage:'1d6+4',count:2}]});
const foe={id:'book',name:'Watchman',type:'construct',hpMax:30,acNum:13,crNum:1,breaks:false,attacks:[{name:'Blade',bonus:4,damage:'1d6+2'}],turn:['Blade']};
const enc={id:'test',name:'Free the exhibits',where:'Workshop',goal:'Protect the archive',zones:{cover:'Shelves',center:'Turntable',objective:'Control desk'},foes:[{ref:'book',n:1,zone:'objective',privatePlan:'SECRET plan',observableTell:'Its fingers click before it lunges.',publicName:'Clockwork keeper'}],design:{mode:'boss',clues:[{id:'clue',zone:'center',layers:[{dc:12,text:'A loose bolt.'}]}],discoveries:[],clocks:[{id:'clock',name:'SECRET clock',size:4,filled:1,outcome:'SECRET outcome',shared:false}],phases:[{id:'phase',name:'Phase two',when:'A clamp opens',change:'SECRET phase',triggered:false}],objectives:[
  {id:'hand',name:'Open clamp',description:'SECRET solution',zone:'center',abilities:['STR','DEX'],size:1,filled:0,requires:[],stakes:'A sleeve catches',success:'SECRET reward',shared:true,publicName:'Free the clamp'},
  {id:'heart',name:'Ground circuit',description:'SECRET wire',zone:'objective',abilities:['INT'],size:1,filled:0,requires:[]},
  {id:'end',name:'Revoke ownership',description:'SECRET final text',zone:'objective',abilities:['CHA'],size:1,filled:0,requires:['hand','heart'],automatic:true}
]}};
function fresh(){const s={party:[hero('h1'),hero('h2')],bestiary:[plain(foe)],playerSettings:{combat:true}};run('startCombat')(s,plain(enc));return s;}
function attempt(s,id,die=15,patch={}){E.chooseObjective(s,id,'h1');Object.assign(R.init(s).draft,patch);return R.prepare(s,R.init(s).draft,die);}
{
  const s=fresh(),l=R.init(s);assert.deepEqual(plain(l.zones),enc.zones);assert.equal(l.positions[s.combat.foes[0].id],'objective');assert.equal(s.combat.foes[0].privatePlan,'SECRET plan');assert.equal(s.combat.design.clocks[0].filled,1);assert.equal(s.combat.design.phases.length,1);
  assert.throws(()=>attempt(s,'hand'),/Reach Turntable/);assert.throws(()=>E.automaticObjective(s,'end','h1'),/First complete/);
  R.move(s,'h1','center');attempt(s,'hand',15);assert.equal(E.objective(s,'hand').filled,0,'preview is not progress');R.apply(s);
  assert.equal(E.objective(s,'hand').filled,1);assert(R.init(s).acted.h1);assert.equal(s.party[0].hpNow,38);assert.throws(()=>E.chooseObjective(s,'hand','h2'),/already complete/);
  assert(R.undo(s));assert.equal(E.objective(s,'hand').filled,0);assert(!R.init(s).acted.h1);
  assert.equal(enc.design.objectives[0].filled,0,'saved template is not mutated');
  run('startCombat')(s,plain(enc));assert.equal(s.combat.design.objectives[0].filled,0,'restart resets live objective progress');
}
{
  const s=fresh();R.move(s,'h1','objective');const p=attempt(s,'heart',4);assert.equal(p.band,'mixed','INT +4, not a hidden proficiency');R.apply(s);
  assert.equal(E.objective(s,'heart').filled,1,'mixed success advances and retains its consequence');assert(R.init(s).conditions.h1.includes('Exposed'));assert(R.undo(s));
  assert.equal(E.objective(s,'heart').filled,0);assert(!R.init(s).conditions.h1.includes('Exposed'));
}
{
  const s=fresh();R.move(s,'h1','objective');attempt(s,'heart',3);assert.equal(R.init(s).pending.band,'setback');R.push(s,0,4);assert.equal(R.init(s).pending.band,'mixed');
  assert.equal(s.party[0].stamina,3);R.init(s).pending=null;assert.equal(E.objective(s,'heart').filled,0);assert(!R.init(s).acted.h1);
  attempt(s,'heart',3);R.push(s,0,4);R.apply(s);assert.equal(s.party[0].stamina,2);assert.equal(E.objective(s,'heart').filled,1);assert(R.undo(s));assert.equal(s.party[0].stamina,3);assert.equal(E.objective(s,'heart').filled,0);
}
{
  const s=fresh();R.move(s,'h1','objective');attempt(s,'heart',1);R.apply(s);assert.equal(E.objective(s,'heart').filled,0,'natural 1 never advances');R.undo(s);
  const p=attempt(s,'heart',20);assert.equal(p.band,'crit');R.apply(s);assert.equal(E.objective(s,'heart').filled,1,'critical gives normal reward, not extra objective actions');
}
{
  const s=fresh();R.move(s,'h1','center');const p=attempt(s,'hand',5,{objectiveBonus:'10'});assert.equal(p.total,15,'full skill/tool/Expertise bonus may be entered explicitly');R.apply(s);assert.equal(E.objective(s,'hand').filled,1);
  R.nextRound(s);R.move(s,'h1','objective');assert.throws(()=>attempt(s,'heart',10,{objectiveBonus:'1.5'}),/whole-number/);assert.throws(()=>attempt(s,'heart',10,{objectiveBonus:'99'}),/whole-number/);
  const d=R.init(s).draft;Object.assign(d,{mode:'hero',action:'help',objectiveId:'',actor:'h1',target:'h2'});R.configure(s,d);assert.equal(d.ability,'INT','Artificer support actions use Intelligence');
}
{
  const s=fresh();R.move(s,'h1','objective');E.objective(s,'hand').filled=1;E.objective(s,'heart').filled=1;const rolls=s.publicRolls?.length||0;
  E.automaticObjective(s,'end','h1');assert.equal(E.objective(s,'end').filled,1);assert(R.init(s).acted.h1);assert.equal(s.publicRolls?.length||0,rolls,'certain task invents no die');assert(R.undo(s));assert.equal(E.objective(s,'end').filled,0);assert(!R.init(s).acted.h1);
  assert.throws(()=>E.automaticObjective(s,'heart','h1'),/already complete/);
}
{
  const s=fresh();R.move(s,'h1','objective');attempt(s,'heart');assert.throws(()=>E.adjustObjective(s,'hand',1),/current roll/);assert.throws(()=>R.manualAction(s,'h2','Spell at table'),/current roll/);
  E.objective(s,'heart').filled=1;assert.throws(()=>R.apply(s),/already complete/);assert(R.init(s).pending,'failed confirmation retains pending roll');
}
{
  const s=fresh(),snapshot=ctx.PlayerFeed.snapshot(s,null),text=JSON.stringify(snapshot);
  assert(!text.includes('SECRET'));assert.deepEqual(plain(snapshot.combat.objectives),[{name:'Free the clamp',filled:0,size:1}]);
  assert(ctx.PlayerFeed.view(snapshot).includes('Free the clamp'));s.playerSettings.combat=false;assert.equal(ctx.PlayerFeed.snapshot(s,null).combat,null);
  s.playerSettings.combat=true;E.objective(s,'hand').shared=false;assert.equal(ctx.PlayerFeed.snapshot(s,null).combat.objectives.length,0);
  R.manualAction(s,'h1','Saving-throw spell resolved with table dice; slot spent.');assert(R.init(s).acted.h1);assert.throws(()=>R.manualAction(s,'h1','Another spell'),/already acted/);assert(R.undo(s));assert(!R.init(s).acted.h1);
}
{
  const s=fresh();ctx.fixture=s;run(`S=fixture;S.role='dm';S.tab='combat';render();`);
  const view=node('#view').innerHTML;assert(view.includes('Ways to change the scene')&&view.includes('Attempt objective')&&view.includes('Record an action resolved at the table'));
  R.move(s,'h1','center');attempt(s,'hand');run('render()');assert(node('#view').innerHTML.includes('Confirm adds one progress'));
}
if(process.argv[2]){
  const file=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),parsed=ctx.QBCampaigns.parseCampaign(JSON.stringify(file));assert(!parsed.error);
  for(const encounter of parsed.data.encounters){
    const s=plain(parsed.data);run('startCombat')(s,encounter);
    assert.equal(s.combat.design.objectives.length,encounter.design.objectives.length);
    assert.deepEqual(plain(s.combat.lite.zones),plain(encounter.zones));
    for(const o of s.combat.design.objectives)for(const id of o.requires||[])assert(E.objective(s,id),'all prerequisites resolve');
    assert(s.combat.foes.every(f=>Number.isFinite(f.hpMax)&&Number.isFinite(f.acNum)&&f.attacks.length),'all prepared foes have complete numbers');
    const publicText=JSON.stringify(ctx.PlayerFeed.snapshot({...s,playerSettings:{combat:true}},null));
    for(const o of s.combat.design.objectives)if(o.description)assert(!publicText.includes(o.description),'private solution omitted from player feed');
  }
  console.log('PASS: Sunday campaign restores all four prepared encounters, complete enemies, zones, dependencies, and private objective notes.');
}
console.log('PASS: prepared zones/plans/clocks/phases, objective prerequisites/position/action limits, fair success bands, mixed consequences, Push/cancel/Undo, explicit check bonus, manual actions, restart, UI and private player-feed allowlist.');
