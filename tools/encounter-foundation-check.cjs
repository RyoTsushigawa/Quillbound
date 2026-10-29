// Common encounter foundations: thug, group and multiattack boss use the same engine.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'..');
const ctx=vm.createContext({crypto:require('node:crypto').webcrypto});
for (const name of ['attacks','combat-rules'])
  vm.runInContext(fs.readFileSync(path.join(root,'src/app',name+'.js'),'utf8'),ctx);
const R=ctx.Stakes;
const hero=(id,ac=16)=>({id,name:id,cls:'Fighter',level:5,prof:3,abil:{STR:18,DEX:14,CON:14,INT:10,WIS:10,CHA:10},hp:30,hpNow:30,ac,stamina:3,hitDice:{die:10,left:5},
  attacks:[{name:'Longsword',bonus:7,damage:'1d8+4',count:2}]});
const thug=(id,hp=20)=>({id,name:id,crNum:0.125,status:'fighting',acNum:12,hpMax:hp,hpNow:hp,breaks:false,
  attacks:[{name:'Club',bonus:3,damage:'1d4+1'}],turn:['Club']});
const boss=()=>({id:'boss',name:'Veteran captain',crNum:6,status:'fighting',acNum:17,hpMax:140,hpNow:140,breaks:false,
  attacks:[{name:'Slash',bonus:6,damage:'1d8+3'},{name:'Shield',bonus:6,damage:'1d6+3'}],
  turn:['Slash','Shield','Slash']});
function state(foes=[thug('thug')]) {
  return {party:[hero('h1'),hero('h2',14)],bestiary:[],combat:{round:1,foes,log:[],acted:{}}};
}
function draft(s,patch) {
  const d=R.init(s).draft;
  Object.assign(d,{actor:'h1',target:'thug',mode:'hero',action:'attack',attackNames:['Longsword','Longsword'],targets:[],stakes:'',intent:''},patch);
  return d;
}
{
  const s=state(),d=draft(s,{mode:'enemy',actor:'thug',target:'h1'});
  assert.equal(R.rollsNeeded(s,d),1,'ordinary thug takes one attack without extra targeting');
  const p=R.prepare(s,d,[5]);assert.equal(p.rolls[0].target,'h1');
  p.rolls[0].damage=3;R.apply(s);
  assert.equal(s.party[0].hpNow,27);
  assert.equal(s.party[1].hpNow,30);
  assert(R.undo(s));assert.equal(s.party[0].hpNow,30);
  console.log('PASS: single thug needs no extra controls; damage and Undo work.');
}
{
  const s=state([thug('t1'),thug('t2'),thug('t3')]);
  for(const id of ['t1','t2','t3']) {
    const d=draft(s,{mode:'enemy',actor:id,target:'h1'});
    assert.equal(R.rollsNeeded(s,d),1);
    const p=R.prepare(s,d,[5]);p.rolls[0].damage=2;R.apply(s);
    assert.equal(R.init(s).acted[id],true);
  }
  assert.equal(s.party[0].hpNow,24);
  R.nextRound(s);assert.equal(Object.keys(R.init(s).acted).length,0);
  console.log('PASS: group of ordinary thugs retains individual turns and action economy.');
}
{
  const s=state([boss()]),d=draft(s,{mode:'enemy',actor:'boss',target:'h1',targets:[null,'h2','h1']});
  assert.equal(R.rollsNeeded(s,d),3,'boss uses declared multiattack');
  assert.throws(()=>R.prepare(s,{...d,targets:[null,'not-a-hero','h1']},[5,5,5]),/Attack 2/);
  const p=R.prepare(s,d,[5,5,5]);
  assert.deepEqual(Array.from(p.rolls,r=>r.target),['h1','h2','h1']);
  assert.deepEqual(Array.from(p.rolls,r=>r.bonus),[6,4,6],'each defense uses its hero AC');
  p.rolls.forEach((r,i)=>r.damage=3+i);
  R.apply(s);
  assert.equal(s.party[0].hpNow,22);
  assert.equal(s.party[1].hpNow,26);
  assert.equal(R.init(s).acted.boss,true,'one boss turn despite three attacks');
  assert(R.undo(s));
  assert.equal(s.party[0].hpNow,30);assert.equal(s.party[1].hpNow,30);
  console.log('PASS: boss splits multiattacks between heroes with correct AC, damage and Undo.');
}
{
  const s=state([boss()]);const l=R.init(s);l.protected.h2=true;
  const d=draft(s,{mode:'enemy',actor:'boss',target:'h1',targets:[null,'h2','h1']});
  const rolled=R.rollFor(s,d);
  assert.equal(rolled.length,3);assert.equal(Array.isArray(rolled[0]),false);
  assert.equal(Array.isArray(rolled[1]),true,'covered second defender gets an opening');
  assert.equal(Array.isArray(rolled[2]),false);
  const p=R.prepare(s,d,[5,[15,19],5]);assert.equal(p.rolls[1].band,'success');
  assert.deepEqual(Array.from(p.edgeTargets),['h2']);
  p.rolls[0].damage=3;p.rolls[2].damage=3;R.apply(s);
  assert.equal(!!R.init(s).protected.h2,false);
  assert.equal(s.party[1].hpNow,30,'protected hero successfully avoids their assigned strike');
  console.log('PASS: per-defender cover applies on the right roll and is consumed once.');
}
{
  const s=state([thug('t1'),thug('t2')]),d=draft(s,{target:'t1',targets:[null,'t2']});
  const p=R.prepare(s,d,[10,10]);
  assert.deepEqual(Array.from(p.rolls,r=>r.target),['t1','t2']);
  R.damage(s,0,5);R.damage(s,1,6);R.apply(s);
  assert.equal(s.combat.foes[0].hpNow,15);assert.equal(s.combat.foes[1].hpNow,14);
  assert(R.undo(s));assert.equal(s.combat.foes[0].hpNow,20);assert.equal(s.combat.foes[1].hpNow,20);
  console.log('PASS: Fighter splits Extra Attack across two thugs without extra actions.');
}
{
  const s=state([thug('t1'),thug('t2')]),d=draft(s,{target:'t1',targets:[null,'t2']});
  const p=R.prepare(s,d,[3,1]);
  assert.equal(p.rolls[0].band,'mixed');
  assert.equal(R.attackResponseIndex(s,p),0,'first eligible graze controls response');
  R.damage(s,0,8);const counter=p.rolls[0].strike.damage;
  R.apply(s);assert.equal(s.party[0].hpNow,30-counter,'one response across two targets');
  assert.equal((s.combat.log[0].text.match(/strikes back/g)||[]).length,1);
  console.log('PASS: multi-target Attack action still gets at most one strike-back.');
}
{
  const s=state([thug('t1',3),thug('t2')]),d=draft(s,{target:'t1',targets:[null,'t2']});
  const p=R.prepare(s,d,[3,1]);R.damage(s,0,8);
  assert.equal(R.attackResponseIndex(s,p),1,'dead first foe cannot respond; second living foe can');
  R.apply(s);assert.equal(s.combat.foes[0].hpNow,0);
  assert.equal((s.combat.log[0].text.match(/strikes back/g)||[]).length,1);
  console.log('PASS: defeated foes cannot counter; another surviving target can.');
}
