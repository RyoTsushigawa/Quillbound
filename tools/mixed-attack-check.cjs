// Attack-action interoperability for creator-built and homebrew heroes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'..');
const ctx=vm.createContext({crypto:require('node:crypto').webcrypto});
for(const f of ['attacks','combat-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),ctx);
const A=ctx.QBAttacks,R=ctx.Stakes;
const toxic=()=>({id:'toxic',name:'Toxic',cls:'Artificer',level:5,prof:3,abil:{STR:10,DEX:16,CON:14,INT:18,WIS:12,CHA:8},hp:43,hpNow:43,ac:17,stamina:3,hitDice:{die:8,left:5},attacks:[
  {name:'Lightning Launcher',bonus:7,damage:'1d6+4',count:2},
  {name:'Tesla-Faltschwert',bonus:6,damage:'1d8+3',count:2},
  {name:'Shock Burst',bonus:7,damage:'2d10',count:1}
]});
function setup(hp=100){const s={party:[toxic()],bestiary:[],combat:{round:1,acted:{},foes:[{id:'enemy',name:'Guard',type:'humanoid',status:'fighting',hpMax:hp,hpNow:hp,acNum:16,crNum:2,attacks:[{name:'Club',bonus:4,damage:'1d6+2'}],turn:['Club'],breaks:false}],log:[]}};const l=R.init(s);Object.assign(l.draft,{mode:'hero',actor:'toxic',target:'enemy',action:'attack',attackNames:['Lightning Launcher','Tesla-Faltschwert'],stakes:'',intent:''});return s;}
const seq=A.heroAttackSequence(toxic(),['Lightning Launcher','Tesla-Faltschwert']);
assert.deepEqual(Array.from(seq,x=>x.name),['Lightning Launcher','Tesla-Faltschwert']);
assert.deepEqual(Array.from(seq,x=>x.bonus),[7,6]);
assert.equal(A.heroAttackSequence(toxic(),['Shock Burst','Tesla-Faltschwert']).length,1,'one-roll spell cannot borrow Extra Attack');
assert.equal(A.heroAttackSequence(toxic(),['bogus','Tesla-Faltschwert'])[0].name,'Lightning Launcher','invalid name cannot invent attack');
let s=setup(),l=R.init(s);assert.equal(R.rollsNeeded(s,l.draft),2);
let p=R.prepare(s,l.draft,[10,10]);assert.deepEqual(Array.from(p.rolls,x=>x.attack),['Lightning Launcher','Tesla-Faltschwert']);
assert.deepEqual(Array.from(p.rolls,x=>x.bonus),[7,6]);
R.damage(s,0,7);R.damage(s,1,8);R.apply(s);assert.equal(s.combat.foes[0].hpNow,85);assert.equal(s.party[0].hpNow,43);
assert(R.undo(s),'Undo works');assert.equal(s.combat.foes[0].hpNow,100);
s=setup();l=R.init(s);p=R.prepare(s,l.draft,[7,1]);assert.equal(R.attackResponseIndex(s,p),0);
const counter=p.rolls[0].strike.damage;R.damage(s,0,8);R.apply(s);assert.equal(s.party[0].hpNow,43-counter,'only one response even with extra attack natural 1');
s=setup();l=R.init(s);l.draft.attackNames=['Shock Burst','Tesla-Faltschwert'];assert.equal(R.rollsNeeded(s,l.draft),1);p=R.prepare(s,l.draft,[10]);assert.equal(p.rolls[0].attack,'Shock Burst');assert.equal(p.rolls.length,1);
console.log('PASS: mixed-weapon attack bonuses and damage, cantrip count, invalid names, strike-back cap and Undo.');
