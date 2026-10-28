const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');const root=process.argv[2]||path.resolve(__dirname,'..');const stage=process.argv[3];let queue=[],calls=0;
const ctx=vm.createContext({crypto:{getRandomValues(a){calls++;a[0]=queue.shift()??99;return a;}}});
for(const n of ['combat-rules.js','conditions.js'])vm.runInContext(fs.readFileSync(stage&&n!=='combat-rules.js'?path.join(stage,n):path.join(root,'src/app',n),'utf8'),ctx);const R=ctx.Stakes;
const pc=id=>({id,name:id,cls:'Fighter',abil:{STR:16,DEX:12,CON:14,INT:8,WIS:10,CHA:10},prof:2,trained:['STR','CON'],conds:[null,null,null,null]});
function state(){return{party:[pc('hero'),pc('ally')],combat:{round:1,acted:{},foes:[{id:'enemy',name:'Enemy',status:'fighting',slots:4,marks:[]}],log:[]}};}
function roll(s,extra={},die=15){const l=R.init(s),d={...l.draft,actor:'hero',target:'enemy',ability:'CHA',trained:false,...extra};return R.prepare(s,d,die);}
let s=state(),l=R.init(s);l.wounds.hero=3;queue=[0];roll(s,{mode:'enemy',actor:'enemy',target:'hero'},1);R.apply(s);assert.equal(l.wounds.hero,3);assert(l.dramaUsed.hero);assert.equal(l.lastDrama.title,'LAST STAND');assert.equal(l.lastRoll.die,1);assert.equal(l.lastRoll.band,'disaster');R.undo(s);assert(!s.combat.lite.dramaUsed.hero);assert.equal(s.publicRolls.length,1);
s=state();l=R.init(s);l.wounds.enemy=3;queue=[0];roll(s);R.apply(s);assert.equal(l.wounds.enemy,3);assert.equal(s.combat.foes[0].status,'fighting');assert(l.dramaUsed.enemy);
console.log('PASS: random Last Stand works equally for heroes and enemies; natural 1 is unchanged; Undo restores state but not public dice history.');
s=state();l=R.init(s);l.wounds.hero=2;R.condition(s,'hero','Pinned');queue=[0];roll(s);R.apply(s);assert.equal(l.wounds.hero,1);assert(l.conditions.hero.includes('Pinned'));assert(l.conditions.hero.includes('Second wind'));assert(l.dramaUsed.hero);R.nextRound(s);queue=[0];roll(s);R.apply(s);assert.equal(l.wounds.hero,1);
function chanceAt(heightened){const s=state(),l=R.init(s);s.dramaSettings.heightened=heightened;l.wounds.enemy=3;queue=[24];roll(s);R.apply(s);return l.dramaUsed.enemy===true;}
assert(!chanceAt(false));assert(chanceAt(true));
s=state();l=R.init(s);s.dramaSettings.enabled=false;l.wounds.enemy=3;queue=[0];roll(s);R.apply(s);assert.equal(s.combat.foes[0].status,'down');assert(!l.dramaUsed.enemy);
console.log('PASS: automatic Power Through heals while preserving physical hindrances; one successful moment per combatant; 10%/25% thresholds and disabling are respected.');
s=state();const p=roll(s,{action:'move',destination:'objective',ability:'CHA',trained:true},10);assert.equal(p.ability,'DEX');assert.equal(p.trained,false);assert.equal(p.bonus,1);assert.equal(s.publicRolls[0].die,10);s.combat.lite.pending=null;
const n=s.publicRolls.length;queue=[19];const secret=R.secret(s,'PRIVATE SECRET',3);assert.equal(secret.die,20);assert.equal(s.publicRolls.length,n);
R.condition(s,'enemy','Entangled in cables',{description:'Cannot cross the room while tethered.',clears:'Cut or untangle the cables.'});assert.equal(R.describe(s,'enemy','Entangled in cables').clears,'Cut or untangle the cables.');assert(R.describe(s,'enemy','Disarmed').description.includes('weapon'));
vm.runInContext(fs.readFileSync(path.join(root,'src/app/player-core.js'),'utf8'),ctx);const publicData=ctx.PlayerFeed.snapshot(s,null);assert(!JSON.stringify(publicData).includes('PRIVATE SECRET'));if(!stage)assert.equal(publicData.rolls.length,n);
console.log('PASS: actions read ability/training automatically; public player dice and private DM dice are separate; standard and custom condition descriptions work.');
queue=Array.from({length:100},(_,i)=>i);assert.deepEqual(Array.from({length:100},()=>R.dramaChance()),Array.from({length:100},(_,i)=>i+1));queue=[4294967295,4294967200,99];calls=0;assert.equal(R.dramaChance(),100);assert.equal(calls,3);
console.log('PASS: independent percentile checks use equal chances and never modify the fair d20 generator.');
