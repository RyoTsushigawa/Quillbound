// Encounter lifecycle and state transitions: ordinary enemies, groups and bosses.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'..');
const ctx=vm.createContext({crypto:require('node:crypto').webcrypto});
for(const f of ['attacks','combat-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),ctx);
const R=ctx.Stakes;
const hero=id=>({id,name:id,cls:'Fighter',level:5,prof:3,abil:{STR:18,DEX:14,CON:14,INT:10,WIS:10,CHA:10},hp:30,hpNow:30,ac:16,stamina:3,hitDice:{die:10,left:5},attacks:[{name:'Sword',bonus:7,damage:'1d8+4',count:2}]});
const foe=(id,hp=12)=>({id,name:id,type:'humanoid',status:'fighting',hpMax:hp,hpNow:hp,acNum:12,crNum:.25,breaks:false,attacks:[{name:'Club',bonus:4,damage:'1d6+1'}],turn:['Club']});
const state=(foes=[foe('thug')])=>({party:[hero('h1'),hero('h2')],bestiary:[],combat:{round:1,foes,log:[],acted:{}}});
let s=state();
assert.equal(R.encounterStatus(s).phase,'ongoing');
assert.equal(R.encounterStatus(s).ready,3);
R.setStatus(s,'thug','surrendered');
assert.equal(R.encounterStatus(s).phase,'cleared');
assert.equal(s.combat.foes[0].hpNow,12,'surrender does not pretend to damage the enemy');
assert(R.undo(s));assert.equal(R.encounterStatus(s).phase,'ongoing');
R.setStatus(s,'thug','down');assert.equal(s.combat.foes[0].hpNow,0);
assert(R.undo(s));R.setStatus(s,'thug','dead');assert.equal(s.combat.foes[0].hpNow,0);
R.setStatus(s,'thug','fighting');assert.equal(s.combat.foes[0].hpNow,1);
assert.equal(R.encounterStatus(s).phase,'ongoing');
assert.throws(()=>R.setStatus(s,'thug','invisible'),/valid enemy status/);
assert.throws(()=>R.setStatus(s,'h1','down'),/enemy token/);
console.log('PASS: surrendered foes retain HP, down/dead foes have 0 HP, explicit revive and Undo.');
s=state([foe('a'),foe('b'),foe('c')]);
R.setStatus(s,'a','fled');R.setStatus(s,'b','surrendered');R.setStatus(s,'c','bargained');
assert.equal(R.encounterStatus(s).phase,'cleared','fight ends without defeating enemies by HP');
assert.equal(R.encounterStatus(s).activeFoes,0);
R.setStatus(s,'b','fighting');assert.equal(R.encounterStatus(s).phase,'ongoing');
console.log('PASS: an ordinary three-thug group can flee, bargain and return without hidden HP changes.');
s=state([foe('boss',120)]);const l=R.init(s);
Object.assign(l.draft,{mode:'hero',actor:'h1',target:'boss',action:'attack',stakes:'',intent:''});
R.prepare(s,l.draft,[10,11]);
assert.equal(R.encounterStatus(s).phase,'resolving');
assert.throws(()=>R.setStatus(s,'boss','down'),/Finish or cancel/);
l.pending=null;
assert.equal(R.encounterStatus(s).phase,'ongoing');
R.setStatus(s,'boss','surrendered');
assert.equal(R.encounterStatus(s).phase,'cleared');
console.log('PASS: unresolved damage blocks status edits; cancelling restores encounter readiness.');
s=state([foe('boss',120)]);R.init(s);
for(let round=0;round<8;round++){
 const l=R.init(s);Object.assign(l.draft,{mode:'hero',actor:'h1',target:'boss',action:'attack',stakes:'',intent:''});
 const p=R.prepare(s,l.draft,[10,11]);R.damage(s,0,2);R.damage(s,1,2);R.apply(s);
 assert.equal(R.encounterStatus(s).activeFoes,1);
 assert.equal(R.encounterStatus(s).ready,2,'acting hero excluded, companion and boss remain');
 R.nextRound(s);
 assert.equal(R.encounterStatus(s).ready,3);
}
assert.equal(s.combat.round,9);
assert.equal(s.combat.foes[0].hpNow,120-32);
assert(R.undo(s));assert.equal(s.combat.round,8,'Undo round transition');
console.log('PASS: boss lasts eight rounds, retains HP and turn state, and round Undo works.');


// Large encounters should not silently merge turns, lose combatants or corrupt state.
s=state(Array.from({length:80},(_,i)=>foe('thug-'+i,12)));
assert.equal(R.encounterStatus(s).foes,80);
assert.equal(R.encounterStatus(s).ready,82);
for(let i=0;i<80;i++) R.setStatus(s,'thug-'+i,i%2?'surrendered':'fled');
assert.equal(R.encounterStatus(s).phase,'cleared');
assert.equal(R.encounterStatus(s).ready,2);
assert.equal(s.combat.foes.length,80);
assert(s.combat.foes.every(f=>f.hpNow===12));
for(let r=0;r<12;r++){R.nextRound(s);assert.equal(R.encounterStatus(s).foes,80);assert.equal(R.encounterStatus(s).ready,2);}
assert.equal(s.combat.round,13);
assert(R.undo(s));assert.equal(s.combat.round,12);
console.log('PASS: 80 separate foes preserve identity/HP through status updates and 12 rounds.');
