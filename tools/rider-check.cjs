// On-hit bonus riders: Toxik and reusable combat-only homebrew features.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.argv[2]||path.resolve(__dirname,'..');
const context=vm.createContext({crypto:require('node:crypto').webcrypto});
for(const name of ['attacks','combat-rules'])
  vm.runInContext(fs.readFileSync(path.join(root,'src/app',name+'.js'),'utf8'),context);
const R=context.Stakes,A=context.QBAttacks;
const hero=()=>({id:'toxik',name:'Toxik',cls:'Artificer',subclass:'Armorer',level:5,
  prof:3,abil:{STR:10,DEX:16,CON:14,INT:18,WIS:12,CHA:8},
  hp:43,hpNow:43,ac:17,stamina:3,hitDice:{die:8,left:5},
  attacks:[{name:'Lightning Launcher',bonus:7,damage:'1d6+4',count:2},
           {name:'Tesla-Faltschwert',bonus:6,damage:'1d8+3',count:2}]});
function state(){
  const s={party:[hero()],bestiary:[],combat:{round:1,acted:{},foes:[{
    id:'e',name:'Guard',type:'humanoid',hpMax:100,hpNow:100,acNum:15,status:'fighting',
    attacks:[{name:'Club',bonus:4,damage:'1d6+2'}],turn:['Club'],breaks:false}],log:[]}};
  const d=R.init(s).draft;Object.assign(d,{actor:'toxik',mode:'hero',action:'attack',
    target:'e',attackNames:['Lightning Launcher','Lightning Launcher'],stakes:'',intent:''});
  return s;
}
let s=state(),p=R.prepare(s,R.init(s).draft,[12,12]);
assert.equal(p.riderIndex,0);
assert(p.riderDamage>=1&&p.riderDamage<=6);
assert.deepEqual(Array.from(R.riderCandidates(s,p)),[0,1]);
const bonus=p.riderDamage;
R.damage(s,0,8);R.damage(s,1,8);R.apply(s);
assert.equal(s.combat.foes[0].hpNow,100-16-bonus,'one bonus die, not two');
assert.equal(R.init(s).riderUsed['toxik:armorer-lightning-launcher'],true);
assert(R.undo(s),'Undo restores combat state');
assert.equal(s.combat.foes[0].hpNow,100);
assert.equal(!!R.init(s).riderUsed['toxik:armorer-lightning-launcher'],false);
console.log('PASS: Toxik launcher gives exactly one 1d6 on hit; Undo restores availability.');

s=state();p=R.prepare(s,R.init(s).draft,[12,20]);
R.selectRider(s,1);
assert.equal(p.riderIndex,1);assert(p.riderDamage>=2&&p.riderDamage<=12);
R.damage(s,0,8);R.damage(s,1,8);
const critBonus=p.riderDamage;R.apply(s);
assert.equal(s.combat.foes[0].hpNow,100-16-critBonus,'critical doubles rider dice');
console.log('PASS: choose which hit receives the rider; critical hit doubles dice.');

s=state();p=R.prepare(s,R.init(s).draft,[7,12]);  // graze, hit
assert.equal(p.rolls[0].band,'mixed');
assert.equal(p.riderIndex,1,'a graze cannot trigger an on-hit rider');
R.damage(s,0,8);R.damage(s,1,8);
const grazeBonus=p.riderDamage;R.apply(s);
assert.equal(s.combat.foes[0].hpNow,100-4-8-grazeBonus);
console.log('PASS: graze causes half base damage, but does not consume on-hit bonus.');

s=state();p=R.prepare(s,R.init(s).draft,[6,12]); // graze initially
assert.equal(p.riderIndex,1);
R.push(s,0,2);  // now first roll becomes hit
assert.equal(p.rolls[0].band,'success');
assert.deepEqual(Array.from(R.riderCandidates(s,p)),[0,1]);
R.selectRider(s,0);R.damage(s,0,8);R.damage(s,1,8);
const pushedBonus=p.riderDamage;R.apply(s);
assert.equal(s.combat.foes[0].hpNow,100-16-pushedBonus);
assert.equal(s.party[0].stamina,2);
console.log('PASS: Stamina Push updates on-hit eligibility without adding another bonus.');

s=state();p=R.prepare(s,R.init(s).draft,[12,12]);
R.damage(s,0,8);R.damage(s,1,8);R.apply(s);
R.init(s).acted={}; // simulate another eligible action on the same turn
p=R.prepare(s,R.init(s).draft,[12,12]);
assert.equal(p.riderIndex,-1);
assert.equal(R.riderCandidates(s,p).length,0,'limited rider already used this turn');
R.damage(s,0,8);R.damage(s,1,8);R.apply(s);
R.nextRound(s);
p=R.prepare(s,R.init(s).draft,[12,12]);
assert.equal(p.riderIndex,0,'new round resets the once-per-turn rider');
console.log('PASS: rider limit persists for the turn, then resets on the next round.');

s=state();s.party[0].cls='Ranger';s.party[0].subclass='';
s.party[0].attacks=[{name:'Ash Needle',bonus:7,damage:'1d8+4',count:2}];
s.party[0].combatRiders=[{attack:'Ash Needle',id:'ash-needle',name:'Ash flare',dice:'2d4',trigger:'hit',limit:'turn'}];
R.init(s).draft.attackNames=['Ash Needle','Ash Needle'];
p=R.prepare(s,R.init(s).draft,[12,12]);
assert.equal(p.rolls[0].rider.id,'ash-needle');
assert(p.riderDamage>=2&&p.riderDamage<=8);
s.party[0].combatRiders[0].dice='999d999';
assert.equal(A.heroAttackSequence(s.party[0],['Ash Needle'])[0].rider,null,'unsafe dice rejected');
console.log('PASS: reusable custom rider metadata and bounded dice input.');
