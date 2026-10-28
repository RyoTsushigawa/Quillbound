const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'..');
const file=process.argv[3]||path.join(root,'src/app/combat-rules.js');
let queue=[],calls=0;
const context=vm.createContext({crypto:{getRandomValues(a){calls++;a[0]=queue.shift()??0;return a;}}});
vm.runInContext(fs.readFileSync(file,'utf8'),context);const R=context.Stakes;
const hero=(id,name)=>({id,name,cls:'Fighter',abil:{STR:16,DEX:12,CON:14,INT:10,WIS:10,CHA:10},prof:2,trained:['STR','CON'],conds:[null,null,null,null]});
function state(){return {party:[hero('p1','Hero One'),hero('p2','Hero Two')],combat:{round:1,acted:{},foes:[{id:'f',name:'Knight',slots:4,status:'fighting',marks:[],moves:['Secret attack'],goal:'Secret goal'}],log:[]},dramaSettings:{enabled:false,heightened:false}};} // core rules only: no random dramatic moments
function draft(s,extra={}){const l=R.init(s);Object.assign(l.draft,{actor:'p1',action:'attack',target:'f',mode:'hero',ability:'STR',trained:true,intent:'',effect:'condition',condition:'Disarmed',destination:'objective'},extra);return l.draft;}
assert.equal(R.grade(1,100),'disaster');assert.equal(R.grade(20,-100),'crit');assert.equal(R.grade(10,15),'success');assert.equal(R.grade(7,8),'mixed');assert.equal(R.grade(2,7),'setback');
queue=Array.from({length:20},(_,i)=>i);assert.deepEqual(Array.from({length:20},()=>R.d20()),Array.from({length:20},(_,i)=>i+1));
queue=[4294967295,4294967280,19];calls=0;assert.equal(R.d20(),20);assert.equal(calls,3);assert.equal(4294967280%20,0);
console.log('PASS: every die face maps equally; high-range values rejected; natural 1/20 override any bonus without weighted outcomes.');
let s=state(),l=R.init(s);R.prepare(s,draft(s),10);assert.equal(l.wounds.f,0);R.apply(s);assert.equal(l.wounds.f,1);assert(l.acted.p1);R.undo(s);l=R.init(s);assert.equal(l.wounds.f,0);assert(!l.acted.p1);assert.equal(l.pending,null);
R.prepare(s,draft(s),20);assert.equal(l.pending.band,'crit');assert.equal(l.pending.reward,'extra-wound');R.apply(s);assert.equal(l.wounds.f,2);
s=state();l=R.init(s);R.prepare(s,draft(s),1);l.pending.consequence='wound';R.apply(s);assert.equal(l.wounds.p1,2);assert.equal(l.wounds.f,0);
s=state();l=R.init(s);R.prepare(s,draft(s),3);assert.equal(l.pending.band,'mixed');R.apply(s);assert.equal(l.wounds.f,1);assert(l.conditions.p1.includes('Exposed'));
console.log('PASS: no mutation before confirmation; attack, critical reward, natural-1 reversal, mixed outcome, and full Undo.');
s=state();l=R.init(s);R.prepare(s,draft(s,{action:'help',target:'p2'}),15);R.apply(s);assert(l.openings.p2);R.prepare(s,draft(s,{actor:'p2'}),1,20);assert.equal(l.pending.die,20);assert.equal(l.pending.dice.length,2);assert(l.openings.p2);R.apply(s);assert(!l.openings.p2);
s=state();l=R.init(s);R.prepare(s,draft(s,{action:'defend',target:'p2'}),15);R.apply(s);assert(l.protected.p2);R.prepare(s,draft(s,{mode:'enemy',actor:'f',target:'p2',ability:'DEX',trained:false,threat:'Sword strike'}),1);R.apply(s);assert.equal(l.wounds.p2,1);assert(!l.protected.p2);assert(l.acted.f);assert(!l.acted.p2);
R.undo(s);l=R.init(s);assert(l.protected.p2);assert.equal(l.wounds.p2,0);assert(!l.acted.f);
console.log('PASS: Help grants conventional advantage; protection absorbs one wound; enemy defense uses enemy spotlight; Undo restores consumed benefits.');
s=state();l=R.init(s);R.prepare(s,draft(s,{action:'improvise',intent:'Pin the sword under a chair',condition:'Sword pinned'}),15);R.apply(s);assert(l.conditions.f.includes('Sword pinned'));assert.equal(l.wounds.f,0);
R.nextRound(s);assert(!l.acted.p1);R.move(s,'p1','objective');assert.equal(l.positions.p1,'objective');R.undo(s);l=R.init(s);assert.equal(l.positions.p1,'cover');
assert.throws(()=>R.prepare(s,draft(s),2.5),/whole number/);assert.throws(()=>R.prepare(s,draft(s,{target:'missing'}),10),/valid target/);assert.throws(()=>R.prepare(s,draft(s,{action:'improvise',intent:''}),10),/before rolling/);
R.prepare(s,draft(s),10);assert.throws(()=>R.nextRound(s),/current roll/);assert.throws(()=>R.move(s,'p1','center'),/Finish this roll/);
console.log('PASS: creative conditions matter without damage; rounds and positions undo correctly; invalid rolls/targets/unfinished actions are blocked.');
s=state();s.combat.foes[0].breakAt=2;s.combat.foes[0].breaking='Flees when badly hurt';l=R.init(s);R.prepare(s,draft(s),15);R.apply(s);assert(!l.breaking.f);
l.acted={};R.prepare(s,draft(s),15);R.apply(s);assert(l.breaking.f);assert(/breaking point/.test(s.combat.log[0].text));assert.equal(s.combat.foes[0].status,'fighting');
R.resolveBreak(s,'f','surrendered');assert.equal(s.combat.foes[0].status,'surrendered');assert(!l.breaking.f);assert(l.broke.f);
R.undo(s);l=R.init(s);assert(l.breaking.f);assert.equal(s.combat.foes[0].status,'fighting');
R.resolveBreak(s,'f','fighting');l.acted={};R.prepare(s,draft(s),15);R.apply(s);assert(!l.breaking.f);assert.equal(l.wounds.f,3);
s=state();l=R.init(s);R.prepare(s,draft(s,{stakes:'I lose my footing'}),5);assert.equal(l.pending.consequenceText,'I lose my footing');R.apply(s);assert(s.combat.log[0].text.includes('At risk: I lose my footing'));assert.equal(l.draft.stakes,'');
console.log('PASS: breaking point asks once, the DM decides (flee/surrender/deal/fight on), Undo restores it; the at-risk sentence carries into the consequence and the log.');

// Narrative consequences must not silently deal damage.
for(const effect of ['goal','condition','position']) {
 s=state();l=R.init(s);const p=R.prepare(s,draft(s,{mode:'enemy',actor:'f',target:'p1',enemyEffect:effect,enemyOutcome:'The alarm sounds',enemyCondition:'Pinned',destination:'objective'}),3);
 R.apply(s);assert.equal(l.wounds.p1,0);assert(l.acted.f);assert(s.combat.log[0].text.includes('The alarm sounds'));
 if(effect==='condition')assert(l.conditions.p1.includes('Pinned'));
 if(effect==='position')assert.equal(l.positions.p1,'objective');
 R.undo(s);l=R.init(s);assert(!l.acted.f);assert(!l.conditions.p1.includes('Pinned'));assert.equal(l.positions.p1,'cover');
}
s=state();l=R.init(s);R.prepare(s,draft(s,{stakes:'The alarm sounds'}),3);assert.equal(l.pending.consequence,'goal');R.apply(s);assert(!l.conditions.p1.includes('Exposed'));assert(s.combat.log[0].text.includes('Consequence: The alarm sounds'));
s=state();l=R.init(s);assert.throws(()=>R.prepare(s,draft(s,{mode:'enemy',actor:'f',target:'p1',enemyEffect:'goal',enemyOutcome:''}),3),/before rolling/);
console.log('PASS: declared stakes are selected; non-damage enemy consequences validate, apply and undo without wounds.');

s=state();l=R.init(s);R.prepare(s,draft(s,{mode:'enemy',actor:'f',target:'p1',action:'improvise',intent:'',enemyEffect:'goal',enemyOutcome:'The door closes'}),3);R.apply(s);assert(s.combat.log[0].text.includes('The door closes'));console.log('PASS: switching from a creative hero action to an enemy move needs no hidden hero-only fields.');

// Context rules use declared physical outcomes, never inferred prose.
for(const [event,label] of [['trapped','Pinned'],['disarmed','Disarmed'],['knockedDown','Knocked down']]){
 s=state();l=R.init(s);R.prepare(s,draft(s,{action:'improvise',effect:'context',contextEvent:event,intent:'PRIVATE cause'}),15);assert.equal(l.conditions.f.length,0);assert.equal(R.contextPreview(l.pending).add,label);R.apply(s);assert(l.conditions.f.includes(label));assert.equal(l.wounds.f,0);R.undo(s);assert.equal(R.init(s).conditions.f.length,0);
 s=state();l=R.init(s);R.prepare(s,draft(s,{action:'improvise',effect:'context',contextEvent:event,intent:'Attempt'}),2);R.apply(s);assert(!l.conditions.f.includes(label));
}
for(const [event,label] of [['freed','Pinned'],['recoveredWeapon','Disarmed'],['stoodUp','Knocked down']]){
 s=state();l=R.init(s);R.condition(s,'p2',label);R.condition(s,'p2','Separated and pinned');R.prepare(s,draft(s,{action:'improvise',target:'p2',effect:'context',contextEvent:event,intent:'Help the ally'}),15);R.apply(s);assert(!l.conditions.p2.includes(label));assert(l.conditions.p2.includes('Separated and pinned'));R.undo(s);assert(R.init(s).conditions.p2.includes(label));
}
s=state();l=R.init(s);R.prepare(s,draft(s,{mode:'enemy',actor:'f',target:'p1',enemyEffect:'context',contextEvent:'trapped',enemyOutcome:'A net catches the hero'}),3);R.apply(s);assert(l.conditions.p1.includes('Pinned'));assert.equal(l.wounds.p1,0);
for(const accepted of [false,true]){s=state();l=R.init(s);R.condition(s,'p1','Exposed');R.prepare(s,draft(s,{action:'move',destination:'cover'}),15);l.pending.clearExposure=accepted;R.apply(s);assert.equal(l.conditions.p1.includes('Exposed'),!accepted);}
s=state();l=R.init(s);R.condition(s,'p1','Exposed');R.prepare(s,draft(s,{action:'move',destination:'cover'}),8);l.pending.clearExposure=true;R.apply(s);assert.equal(l.positions.p1,'center');assert(l.conditions.p1.includes('Exposed'));
console.log('PASS: context conditions apply only on landed outcomes, preserve unrelated restraints, undo, and respect DM judgment and final position.');
