// Stakes combat engine, HP + stamina rules (prototypes/stakes-v2/RULESET.md). The wound-rule version is in docs/archive.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'..');
const real=require('node:crypto').webcrypto;let queue=[],calls=0;
// Queued values feed the dice when a test needs exact faces; otherwise real randomness.
const context=vm.createContext({crypto:{getRandomValues(a){calls++;if(queue.length)a[0]=queue.shift();else real.getRandomValues(a);return a;},randomUUID:()=>real.randomUUID()}});
for(const f of ['attacks','combat-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),context);const R=context.Stakes;
const hero=(id,name,extra={})=>({id,name,cls:'Fighter',level:1,abil:{STR:16,DEX:12,CON:14,INT:10,WIS:10,CHA:10},prof:2,trained:['STR','CON'],hp:12,hpNow:12,ac:16,stamina:2,hitDice:{die:10,left:1},attack:{name:'Greatsword',ability:'STR',dice:'2d6',kind:'weapon'},conds:[null,null,null,null],...extra});
const knight=(extra={})=>({id:'f',name:'Knight',type:'Medium humanoid',status:'fighting',hpMax:30,acNum:15,crNum:1,attacks:[{name:'Longsword',bonus:4,damage:'1d8+2'},{name:'Shield bash',bonus:4,damage:'1d4+2'}],turn:['Longsword','Shield bash'],breaks:true,...extra});
function state(foes=[knight()]){return {party:[hero('p1','Hero One'),hero('p2','Hero Two')],bestiary:[],combat:{round:1,acted:{},foes,log:[]}};}
function draft(s,extra={}){const l=R.init(s);Object.assign(l.draft,{actor:'p1',action:'attack',target:'f',mode:'hero',ability:'STR',trained:true,intent:'',stakes:'',effect:'condition',condition:'Disarmed',destination:'objective',enemyEffect:'damage'},extra);return l.draft;}
const foe=s=>s.combat.foes.find(f=>f.id==='f'),me=s=>s.party[0];

/* fair dice */
queue=Array.from({length:20},(_,i)=>i);assert.deepEqual(Array.from({length:20},()=>R.d20()),Array.from({length:20},(_,i)=>i+1));
queue=[4294967295,4294967280,19];calls=0;assert.equal(R.d20(),20);assert.equal(calls,3); // values in the uneven top range are thrown away
queue=[4294967295];calls=0;assert.equal(R.die(4),4);assert.equal(calls,1);assert.equal(4294967296%4,0); // a d4 never needs to reject
queue=[4294967292,5];calls=0;assert.equal(R.die(6),6);assert.equal(calls,2);
console.log('PASS: d20, d4 and damage dice are uniform (rejection sampling); natural 1/20 are never weighted.');

/* bands */
assert.deepEqual(['crit','disaster','success','mixed','mixed','setback'],[R.attackBand(20,0,30),R.attackBand(1,40,5),R.attackBand(10,15,15),R.attackBand(10,14,15),R.attackBand(5,10,15),R.attackBand(5,9,15)]);
for(let ac=8;ac<=22;ac++)for(let atk=-1;atk<=12;atk++){ // the hero's defense roll is exactly 5e's chance to be hit
  let hit5e=0,hitHero=0;for(let e=1;e<=20;e++)if(e===20||(e!==1&&e+atk>=ac))hit5e++;
  for(let d=1;d<=20;d++){const b=R.defenseBand(d,d+ac-10,atk);if(b==='setback'||b==='disaster')hitHero++;}
  assert.equal(hitHero,hit5e,`AC ${ac} vs +${atk}`);}
console.log('PASS: attacks hit at AC and graze up to 5 below; defense (beat 11 + bonus) matches 5e’s hit chance for every AC and bonus.');

/* hero attacks */
let s=state(),l=R.init(s);
R.prepare(s,draft(s),[10]);assert.equal(l.pending.rolls[0].total,15);assert.equal(l.pending.rolls[0].band,'success'); // +3 STR +2 always proficient vs AC 15
assert(l.pending.rolls[0].damage>=2,'attack damage is rolled automatically');R.damage(s,0,8);assert.equal(foe(s).hpNow,30);R.apply(s);assert.equal(foe(s).hpNow,22);assert.equal(me(s).hpNow,12);
assert(R.undo(s));assert.equal(foe(s).hpNow,30);
s=state();l=R.init(s);R.prepare(s,draft(s),[6]);let r=l.pending.rolls[0];assert.equal(r.band,'mixed');R.damage(s,0,9);const back=r.strike.damage;R.apply(s);
assert.equal(foe(s).hpNow,26,'a graze deals half');assert.equal(me(s).hpNow,12-back,'the target strikes back');
s=state();l=R.init(s);R.prepare(s,draft(s),[1]);r=l.pending.rolls[0];assert.equal(r.band,'disaster');R.apply(s);assert.equal(me(s).hpNow,Math.max(0,12-r.strike.damage));
s=state();l=R.init(s);R.prepare(s,draft(s,{stakes:'I end up in the open'}),[2]);l.pending.rolls[0].strike.reach=false;l.pending.consequence='position';R.apply(s);
assert.equal(me(s).hpNow,12);assert(l.conditions.p1.includes('Exposed'),'out of reach: another consequence instead');
s=state([knight({hpNow:5})]);l=R.init(s);R.prepare(s,draft(s),[8]);R.damage(s,0,12);R.apply(s);assert.equal(foe(s).status,'down');assert.equal(me(s).hpNow,12,'a graze that drops the target draws no strike-back');
s=state();s.party[0]={...hero('p1','Hero One'),level:5,abil:{STR:18,DEX:12,CON:14,INT:10,WIS:10,CHA:10},prof:3};l=R.init(s);
assert.equal(R.rollsNeeded(s,draft(s)),2);assert.throws(()=>R.prepare(s,draft(s),[10]),/2 d20s/);R.prepare(s,draft(s),[15,15]);assert.equal(l.pending.rolls.length,2);
console.log('PASS: one roll per attack (Extra Attack); damage auto-rolls and can be overridden; grazes deal half and draw a strike-back; out of reach uses another consequence; Undo restores HP.');

/* stamina */
s=state();l=R.init(s);R.prepare(s,draft(s),[8]);r=l.pending.rolls[0];assert.equal(r.band,'mixed');assert.equal(R.pushInfo(s,0).pay,'stamina');
R.push(s,0,4);assert.equal(r.total,17);assert.equal(r.band,'success');assert.throws(()=>R.push(s,0,1),/already/);R.damage(s,0,6);R.apply(s);
assert.equal(me(s).stamina,1);assert.equal(me(s).hpNow,12,'a pushed hit draws no strike-back');assert(s.combat.log[0].text.includes('+d4 4'));
s=state();l=R.init(s);R.prepare(s,draft(s),[8]);R.push(s,0,1);l.pending=null;assert.equal(me(s).stamina,2,'cancel refunds the push');
s=state();s.party[0].stamina=0;l=R.init(s);R.prepare(s,draft(s),[3]);assert.equal(R.pushInfo(s,0).pay,'hitdie');R.push(s,0,2);assert.equal(l.pending.rolls[0].band,'mixed','the push turns the miss into a graze');R.damage(s,0,6);R.apply(s);assert.equal(me(s).hitDice.left,0);assert(s.combat.log[0].text.includes('overexert'));
s=state();s.party[0].stamina=0;s.party[0].hitDice.left=0;l=R.init(s);R.prepare(s,draft(s),[3]);assert.equal(R.pushInfo(s,0).ok,false);
s=state();l=R.init(s);R.prepare(s,draft(s),[20]);assert.throws(()=>R.push(s,0,1),/natural/);l.pending=null;R.prepare(s,draft(s),[15]);assert.throws(()=>R.push(s,0,1),/succeeds/);
console.log('PASS: push adds 1d4 to your own roll, costs stamina only on confirm, then a Hit Die when Winded (overexert); naturals and successes cannot be pushed.');

/* enemy moves */
s=state();l=R.init(s);const d=draft(s,{mode:'enemy',actor:'f',target:'p1',threat:'The knight attacks'});assert.equal(R.rollsNeeded(s,d),2);
R.prepare(s,d,[10,9]);assert.deepEqual(l.pending.rolls.map(x=>[x.total,x.band]),[[16,'success'],[15,'setback']]); // AC 16: d20+6 must reach 16 (beat 15 vs +4)
const dmg=l.pending.rolls[1].damage;assert(dmg>=3&&dmg<=6);R.apply(s);assert.equal(me(s).hpNow,12-dmg);
s=state();l=R.init(s);R.prepare(s,draft(s,{mode:'enemy',actor:'f',target:'p1'}),[1,20]);assert.equal(l.pending.rolls[0].band,'disaster');assert(l.pending.rolls[0].damage>=4);
s=state();l=R.init(s);R.prepare(s,draft(s,{mode:'enemy',actor:'f',target:'p1',enemyEffect:'position',enemyOutcome:'Shoved into the open',destination:'center'}),[2]);R.apply(s);assert.equal(me(s).hpNow,12);assert.equal(l.positions.p1,'center');
s=state([knight({hpMax:null,acNum:null,attacks:[],turn:[]})]);l=R.init(s);assert.deepEqual([...R.needs(s,foe(s))],['hit points','armor class','an attack']);
assert.throws(()=>R.prepare(s,draft(s),[10]),/needs hit points/);R.setStats(s,'f',{hpMax:20,acNum:13,attack:{name:'Club',bonus:3,damage:'1d6+1'}});assert.equal(R.needs(s,foe(s)).length,0);assert.equal(foe(s).hpNow,20);
s=state([{id:'a',name:'Bandit 1',status:'fighting',group:'g',ref:'b'},{id:'b',name:'Bandit 2',status:'down',group:'g',ref:'b'},{id:'c',name:'Bandit 3',status:'fighting',group:'g',ref:'b'}]);s.bestiary=[{id:'b',name:'Bandit'}];R.init(s);
R.setStats(s,'a',{hpMax:11,acNum:12,attack:{name:'Scimitar',bonus:3,damage:'1d6+1'}});assert.deepEqual([...s.combat.foes.map(f=>f.hpNow)],[11,0,11],'the whole group gets the numbers');assert.equal(s.bestiary[0].hpMax,11,'and the bestiary, for the next fight');
console.log('PASS: enemy moves roll defense per attack and deal stat-block damage; non-damage moves still work; enemies without numbers ask the DM once for the whole group.');

/* Defend and Help */
s=state();l=R.init(s);R.prepare(s,draft(s,{actor:'p2',action:'defend',target:'p1',ability:'DEX'}),[15]);R.apply(s);assert(l.protected.p1);
const ed=draft(s,{mode:'enemy',actor:'f',target:'p1'});assert(Array.isArray(R.rollFor(s,ed)[0]));assert.throws(()=>R.prepare(s,ed,[10,[3,4]]),/first roll/);
R.prepare(s,ed,[[3,18],18]);assert.equal(l.pending.rolls[0].die,18);R.apply(s);assert(!l.protected.p1,'cover is spent on the defense roll');
s=state();l=R.init(s);l.openings.p1=true;R.prepare(s,draft(s),[[4,16]]);assert.equal(l.pending.rolls[0].die,16);R.damage(s,0,5);R.apply(s);assert(!l.openings.p1);
console.log('PASS: Defend gives an opening on the next defense roll; Help gives an opening on the next roll; both are spent when used.');

/* breaking points */
s=state();l=R.init(s);assert.equal(foe(s).breakHp,6); // CR 1 vs party level 1 → 20% of 30
R.prepare(s,draft(s),[15]);R.damage(s,0,24);R.apply(s);assert(l.breaking.f);R.resolveBreak(s,'f','fled');assert.equal(foe(s).status,'fled');assert(R.undo(s));assert(l.breaking.f||s.combat.lite.breaking.f);
const member=(i,hp=10)=>({...knight(),id:'m'+i,name:'Drow '+i,hpMax:10,hpNow:hp,crNum:0.25,group:'g',groupName:'Drow'});
s=state([member(1,0),member(2),member(3),member(4)]);s.combat.foes[0].status='down';l=R.init(s);R.prepare(s,draft(s,{target:'m2'}),[15]);R.damage(s,0,10);R.apply(s);
assert(l.breaking.g,'half the group down');R.resolveBreak(s,'g','surrendered');assert.deepEqual(s.combat.foes.map(f=>f.status),['down','down','surrendered','surrendered']);
console.log('PASS: breaking points by threat (30%→15% HP) and for groups at half down; the DM decides; Undo restores.');

/* dying, rests */
s=state();l=R.init(s);me(s).hpNow=3;R.hurt(s,'p1',5);assert.equal(me(s).hpNow,0);assert.deepEqual({...me(s).dying},{s:0,f:0});assert(!R.active(s,me(s)));
R.deathSave(s,'p1',1);assert.equal(me(s).dying.f,2);R.deathSave(s,'p1',12);assert.equal(me(s).dying.s,1);R.deathSave(s,'p1',20);assert.equal(me(s).hpNow,1);assert.equal(me(s).dying,null);
R.hurt(s,'p1',1);R.hurt(s,'p1',1);R.hurt(s,'p1',1);R.hurt(s,'p1',1);assert(me(s).dead,'damage while dying fails death saves');
s=state();R.init(s);me(s).hpNow=2;R.hurt(s,'p1',14);assert(me(s).dead,'massive damage kills outright');
s=state();s.combat=null;Object.assign(s.party[0],{hpNow:3,stamina:0});Object.assign(s.party[0].hitDice,{left:1});assert.throws(()=>{const t=state();R.init(t);R.longRest(t);},/End the fight/);
R.shortRest(s,{p1:1});assert(s.party[0].hpNow>=5&&s.party[0].hitDice.left===0);R.longRest(s);assert.deepEqual([s.party[0].hpNow,s.party[0].hitDice.left,s.party[0].stamina],[12,1,2]);
console.log('PASS: 0 HP means dying with fair death saves (20 revives, 1 counts twice, damage fails, massive damage kills); short rests spend Hit Dice; long rests restore all.');

/* other actions keep the Stakes bands; their failures can call a strike */
s=state();l=R.init(s);R.prepare(s,draft(s,{action:'move',ability:'DEX',destination:'objective'}),[9]);assert.equal(l.pending.band,'mixed');l.pending.consequence='strike';l.pending.striker='f';l.pending.strikeDamage=4;R.apply(s);
assert.equal(me(s).hpNow,8);assert.equal(l.positions.p1,'objective');
s=state();l=R.init(s);R.prepare(s,draft(s,{action:'improvise',effect:'context',contextEvent:'trapped',intent:'Pin the sword arm'}),[15]);R.apply(s);assert(l.conditions.f.includes('Pinned'));
s=state();l=R.init(s);R.prepare(s,draft(s,{action:'improvise',effect:'damage',intent:'Drop the chandelier'}),[16]);assert.throws(()=>R.apply(s),/damage/);R.damage(s,0,7);R.apply(s);assert.equal(foe(s).hpNow,23);
s=state();R.init(s);const before=s.publicRolls?.length||0;R.prepare(s,draft(s),[12]);R.damage(s,0,3);R.apply(s);R.undo(s);assert.equal(s.publicRolls.length,before+1,'public dice survive Undo');
console.log('PASS: Help, Move, Improvise and Defend keep the Stakes bands (15+ / 8–14 / 7−); a failure can call an enemy strike; context conditions and public dice still work.');

/* converting a wound-rule fight */
s={party:[hero('p1','Hero One'),hero('p2','Hero Two',{stamina:0})],bestiary:[{id:'b1',name:'Smuggler Lookout',hp:'11 (2d8+2)',ac:'12',cr:'1/4',type:'Medium humanoid'},{id:'b2',name:'Knight',hpMax:52,acNum:18,crNum:3,attacks:[{name:'Longsword',bonus:5,damage:'1d8+3'}],turn:['Longsword']}],
  combat:{round:2,acted:{},log:[],foes:[{id:'mob',name:'Smuggler Lookout mob 1',mob:true,size:4,slots:4,status:'fighting'},{id:'k',name:'Knight',ref:'b2',slots:4,status:'fighting'}],
  lite:{version:2,draft:{actor:'p1',action:'attack',target:'k',mode:'hero',enemyEffect:'wound'},zones:{cover:'Cover',center:'Open',objective:'Goal'},positions:{mob:'center'},wounds:{p1:2,p2:0,mob:1,k:1},conditions:{mob:['Distracted']},protected:{},openings:{},acted:{},history:[{x:1}],pending:null,lastRoll:null,dramaUsed:{},dramaTried:{}}},dramaSettings:{enabled:true}};
l=R.init(s);assert.equal(l.version,3);assert.equal(s.party[0].hpNow,6);assert.equal(s.party[1].stamina,2);assert.equal(l.history.length,0);assert(!('wounds' in l)&&!s.dramaSettings);
const lookouts=s.combat.foes.filter(f=>f.group==='mob');assert.equal(lookouts.length,4);assert.deepEqual([...lookouts.map(f=>f.hpNow)],[0,11,11,11]);assert(lookouts.every(f=>l.conditions[f.id].includes('Distracted')&&l.positions[f.id]==='center'));
assert.equal(s.combat.foes.find(f=>f.id==='k').hpNow,39);assert.equal(l.draft.enemyEffect,'damage');assert(s.combat.log[0].text.includes('converted'));
console.log('PASS: wound-rule fights convert by share (heroes, enemies, mobs into members with stat-block HP); stamina starts full; Undo history starts fresh.');


/* Strike-back balance: once per Attack action, not once per failed attack roll. */
s=state([knight({hpMax:100,hpNow:100})]);s.party[0]=hero('p1','Extra Attacker',{level:5,prof:3,hp:90,hpNow:90});l=R.init(s);
R.prepare(s,draft(s),[7,1]);assert.equal(R.attackResponseIndex(s,l.pending),0);
const firstCounter=l.pending.rolls[0].strike.damage;
R.damage(s,0,8);R.apply(s);assert.equal(me(s).hpNow,90-firstCounter,'second miss/natural 1 cannot retaliate again');
assert.equal((s.combat.log[0].text.match(/strikes back/g)||[]).length,1);
assert(R.undo(s));assert.equal(me(s).hpNow,90,'Undo restores strike-back HP');
s=state([knight({hpMax:100,hpNow:100})]);s.party[0]=hero('p1','Extra Attacker',{level:5,prof:3,hp:90,hpNow:90});l=R.init(s);
R.prepare(s,draft(s),[15,1]);R.damage(s,0,8);assert.equal(R.attackResponseIndex(s,l.pending),1);
R.apply(s);assert.equal((s.combat.log[0].text.match(/strikes back/g)||[]).length,1,'natural 1 can be first eligible counter');
s=state([knight({hpMax:5,hpNow:5})]);s.party[0]=hero('p1','Extra Attacker',{level:5,prof:3,hp:90,hpNow:90});l=R.init(s);
R.prepare(s,draft(s),[15,1]);R.damage(s,0,8);assert.equal(R.attackResponseIndex(s,l.pending),-1,'defeated enemies cannot respond');
R.apply(s);assert.equal(me(s).hpNow,90);
console.log('PASS: one strike-back per Attack action, natural 1, fallen targets and Undo.');
