// HP combat data (build step 1): stat-block numbers, attacks and Multiattack, breaking shares, hero attacks and defaults.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');const root=process.argv[2]||path.resolve(__dirname,'..');
require(path.join(root,'src/app/attacks.js'));const A=globalThis.QBAttacks; // the package is ESM, so the file is read through its global

/* stat blocks */
const act=(name,text)=>({name,text});
const drow=A.fromStatBlock({hp:'91 (14d8 + 28)',ac:'15 (studded leather)',cr:'6',kind:'humanoid (elf)',actions:[act('Multiattack','The drow makes two attacks, one of which may be with her hand crossbow.'),act('Dagger','Melee or Ranged Weapon Attack: +7 to hit, reach 5 ft. Hit: 6 (1d4 + 4) piercing damage plus 17 (5d6) poison damage.'),act('Hand Crossbow','Ranged Weapon Attack: +7 to hit, range 30/120 ft. Hit: 7 (1d6 + 4) piercing damage.')]});
assert.deepEqual([drow.hpMax,drow.acNum,drow.crNum,drow.breaks],[91,15,6,true]);
assert.deepEqual(drow.attacks[0],{name:'Dagger',bonus:7,damage:'1d4+4+5d6'});assert.deepEqual(drow.turn,['Dagger','Dagger']);
const wolf=A.fromStatBlock({hp:'97',ac:'12',cr:'7',kind:'humanoid',actions:[act('Multiattack (Hybrid Form Only)','The werewolf makes three attacks; one with its Bite and two with its Claws.'),act('Bite (Wolf Form Only)','Melee Weapon Attack: +7 to hit. Hit: 11 (2d6 + 4) piercing damage.'),act('Claws','Melee Weapon Attack: +7 to hit. Hit: 13 (2d8 + 4) slashing damage.')]});
assert.deepEqual(wolf.turn,['Bite (Wolf Form Only)','Claws','Claws']);
const spawn=A.fromStatBlock({hp:'85',ac:'14',cr:'4',kind:'aberration',actions:[act('Multiattack','The void spawn makes two Arm Scythe attacks.'),act('Tentacles','Melee Weapon Attack: +5 to hit. Hit: 14 (2d10 + 3) bludgeoning damage.'),act('Arm Scythe','Melee Weapon Attack: +5 to hit. Hit: 12 (2d8 + 3) slashing damage.')]});
assert.deepEqual(spawn.turn,['Arm Scythe','Arm Scythe']);assert.equal(spawn.breaks,false);
assert.deepEqual(A.fromStatBlock({hp:'1 (1d4 - 1)',ac:'10',cr:'0',kind:'beast',actions:[act('Bite','Melee Weapon Attack: +0 to hit. Hit: 1 piercing damage.')]}).attacks[0],{name:'Bite',bonus:0,damage:'1'});
const blank=A.fromStatBlock({hp:'',ac:'',cr:'?',kind:'',actions:[]});assert.deepEqual([blank.hpMax,blank.acNum,blank.crNum,blank.attacks.length],[null,null,null,0]); // unreadable stays empty: the DM is asked
assert.deepEqual(A.parseCardLine('Shortbow: 80/320, +4, 1d6+2p'),{name:'Shortbow',bonus:4,damage:'1d6+2'});assert.equal(A.parseCardLine('Darkvision 60’, Perception +8'),null);
console.log('PASS: stat blocks give HP, AC, CR and attacks; Multiattack picks the right attacks; unreadable numbers stay empty; card attack lines parse.');

/* breaking shares (RULESET: 30/25/20/15% by CR compared with party level) */
assert.deepEqual([[0.25,4],[2,4],[4,4],[6,4],[0.5,8],[8,8],[12,8]].map(([c,l])=>A.breakShare(c,l)),[0.30,0.25,0.20,0.15,0.30,0.20,0.15]);
console.log('PASS: breaking points hold out longer for enemies that are tough for the party (30% → 15%).');

/* hero attacks */
const hero=(cls,level,abil)=>({cls,level,abil});
assert.deepEqual(A.heroAttack(hero('Fighter',1,{STR:17})),{name:'Greatsword',bonus:5,damage:'2d6+3',count:1,sneak:false});
assert.equal(A.heroAttack(hero('Fighter',5,{STR:19})).count,2);assert.equal(A.heroAttack(hero('Fighter',11,{STR:20})).count,3);assert.equal(A.heroAttack(hero('Paladin',11,{STR:20})).count,2);
assert.equal(A.heroAttack(hero('Rogue',5,{DEX:19})).damage,'1d8+4+3d6');assert.equal(A.heroAttack(hero('Wizard',5,{INT:19})).damage,'2d10');assert.equal(A.heroAttack(hero('Wizard',17,{INT:20})).damage,'4d10');
assert.equal(A.heroAttack(hero('Wizard',1,{INT:17})).bonus,5); // always proficient
console.log('PASS: hero attacks: always proficient, Extra Attack by level, cantrip dice at 5/11/17, Sneak Attack by level.');

/* SRD 5.1 lookup: exact names after removing numbers, sizes, plurals and card ordering; the book always wins */
require(path.join(root,'src/app/srd-monsters.js'));
assert(globalThis.QBSRD.monsters.length>=330&&/Creative Commons Attribution 4\.0/.test(globalThis.QBSRD.attribution));
for(const [n,srd] of [['Goblin 3','Goblin'],['Wolves','Wolf'],['Harpies','Harpy'],['Elf, Drow','Drow'],['Chimera, L','Chimera'],['Skeleton mob 1','Skeleton'],['Snow Ape (ape)','Ape']])assert.equal(A.srdMatch(n)?.statsFrom,'SRD 5.1: '+srd,n);
for(const n of ['Smuggler Lookout','Drow Commando','Happy Jack'])assert.equal(A.srdMatch(n),null,n+' is not an SRD monster');
const g=A.srdMatch('Goblin');assert.deepEqual([g.hpMax,g.acNum,g.crNum,g.attacks[0].bonus,g.attacks[0].damage],[7,15,0.25,4,'1d6+2']);
assert.deepEqual(Object.keys(A.fillFromSrd({name:'Goblin',hpMax:9,acNum:13,attacks:[{name:'Club',bonus:2,damage:'1d4'}]})),[],'a book stat block is never overwritten');
assert.equal(A.fillFromSrd({name:'Goblin',hpMax:9,acNum:null,attacks:[]}).hpMax,undefined);assert.equal(A.fillFromSrd({name:'Goblin',hpMax:9,acNum:null,attacks:[]}).acNum,15);
const sug=A.suggestFor(0.5);assert(sug.hpMax>0&&sug.acNum>0&&sug.from>10);assert.equal(A.suggestFor(null),null);
console.log('PASS: SRD 5.1 lookup by exact name (numbers, sizes, plurals, card order); fills only missing numbers; CR suggestions come from the SRD itself.');

/* app: hero defaults on new and old saves, enemy fields reach the fight */
const nodes=new Map();const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',setAttribute(){},classList:{add(){},remove(){}}});return nodes.get(s);};
let stored=null;const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id),addEventListener(){}},crypto:require('node:crypto').webcrypto,BroadcastChannel:class{postMessage(){}close(){}},localStorage:{getItem:()=>stored,setItem(){}},window:null,console,setTimeout:()=>0,clearTimeout(){},URL});ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};
for(const name of ['player-core','srd-monsters','attacks','srd-heroes','srd-spells','hero-rules','homebrew','combat-rules','conditions','encounter-design'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',name+'.js'),'utf8'),ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
// The checks load app scripts by name; the real page must load the same ones, in this order.
const tags=[...html.matchAll(/<script src="src\/app\/([\w-]+)\.js"><\/script>/g)].map(m=>m[1]);
assert.deepEqual(tags.filter(n=>['srd-monsters','attacks','combat-rules'].includes(n)),['srd-monsters','attacks','combat-rules'],'index.html loads the SRD data and attacks.js before the combat engine');
require('./ui-scripts.cjs').loadUi(html,ctx);vm.runInContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(x=>x.includes('const ACT=')),ctx);
const party=vm.runInContext('S.party',ctx);
for(const p of party){assert(p.hp>0&&p.hpNow===p.hp,p.name+' HP');assert.equal(p.hitDice.left,p.level);assert(p.hitDice.die>=6);assert.equal(p.stamina,2);assert(p.attack&&p.attack.name);}
stored=JSON.stringify({party:[{id:'old',name:'Old save',cls:'Cleric',anc:'Dwarf',level:2,prof:2,abil:{WIS:16,CON:14},hp:19,ac:18,conds:[null,null,null,null]}]});
const old=vm.runInContext('load().party[0]',ctx);assert.deepEqual([old.hp,old.hpNow,old.hitDice.die,old.hitDice.left,old.stamina,old.attack.name],[19,19,8,2,2,'Sacred Flame']);
vm.runInContext("S=fresh();S.bestiary.push({id:'oldfoe',name:'Old foe',type:'Medium humanoid',ac:'13 (leather)',hp:'22 (5d8)',cr:'1/2',tier:'Standard',slots:2});startCombat(S,{id:'x',name:'x',foes:[{ref:'oldfoe',n:2}]});",ctx);
const foe=vm.runInContext('S.combat.foes[0]',ctx);assert.deepEqual([foe.hpMax,foe.acNum,foe.crNum,foe.breaks,foe.ref],[22,13,0.5,true,'oldfoe']);
console.log('PASS: heroes get HP, Hit Dice, stamina and a starter attack (new and old saves, edited values kept); enemy HP, AC and CR reach the fight from old saves too.');
