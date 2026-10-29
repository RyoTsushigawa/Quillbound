// Homebrew backgrounds: the 2024 structure checks, the creator only offering approved homebrew, the hero's own copy,
// and export/import that never replaces anything without a decision.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'..');
const nodes=new Map(),node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',setAttribute(){},classList:{add(){},remove(){}}});return nodes.get(s);};
let captured='',handlers={};
const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id),addEventListener(){}},crypto:require('node:crypto').webcrypto,BroadcastChannel:class{postMessage(){}close(){}},localStorage:{getItem:()=>null,setItem(){}},window:null,console,setTimeout:()=>0,clearTimeout(){},URL});ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};
for(const n of ['player-core','srd-monsters','attacks','srd-heroes','srd-spells','hero-rules','homebrew','combat-rules','conditions','encounter-design'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',n+'.js'),'utf8'),ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');vm.runInContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(x=>x.includes('const ACT=')),ctx);
assert([...html.matchAll(/<script src="src\/app\/([\w-]+)\.js"><\/script>/g)].map(m=>m[1]).includes('homebrew'),'index.html loads homebrew.js');
const B=ctx.QBHomebrew,R=ctx.QBHeroRules,plain=x=>JSON.parse(JSON.stringify(x)),run=c=>vm.runInContext(c,ctx);

/* structure checks */
const keeper={...B.newBackground(),name:'Lighthouse Keeper',desc:'You kept the light burning through storms.',abilities:['WIS','CON','INT'],feat:'alert',skills:['perception','survival'],tool:"Navigator's Tools",kit:{items:[{id:'clothes-travelers',count:1}],gp:45}};
assert(B.fits(keeper),plain(B.checkBackground(keeper)).filter(c=>!c.ok).map(c=>c.label).join(', '));assert.equal(B.kitValue(keeper.kit),50);
const fails=b=>plain(B.checkBackground(b)).filter(c=>!c.ok).map(c=>c.label);
assert.deepEqual(fails(B.newBackground()),['A name','Three abilities it can raise','One origin feat','Two skills','One tool']);
assert(fails({...keeper,name:'Sage'}).includes('A name of its own'));assert(fails({...keeper,feat:'grappler'}).includes('One origin feat'));
assert(fails({...keeper,kit:{items:[{id:'shortbow',count:1},{id:'longsword',count:1}],gp:50}}).some(l=>/kit worth/.test(l)),'a 90 GP kit is flagged');
assert(fails({...keeper,abilities:['WIS','CON']}).includes('Three abilities it can raise'));
for(const b of ctx.QBHERO.backgrounds){const v=B.kitValue(b.equipment.choices[0]);assert(v>=B.KIT_MIN&&v<=B.KIT_MAX,b.name+' kit '+v);}
console.log('PASS: homebrew backgrounds follow the 2024 structure part by part: three abilities, an origin feat, two skills, one tool, a 40–60 GP kit (all SRD kits fit).');

/* into the creator and the sheet */
R.setHomebrew(B.forCreator({backgrounds:[keeper]},{}));assert(!R.data().backgrounds.some(b=>b.id===keeper.id),'unapproved homebrew is not offered');
R.setHomebrew(B.forCreator({backgrounds:[{...keeper,approved:true}]},{}));const offered=plain(R.data().backgrounds.find(b=>b.id===keeper.id));assert(offered&&offered.homebrew);
const build={name:'Mara',species:'human',speciesSkill:'insight',speciesFeat:'skilled',featPicks:{skilled:['history','arcana','religion']},cls:'cleric',level:1,abilities:{method:'array',base:{WIS:15,CON:14,STR:13,DEX:12,INT:10,CHA:8}},background:keeper.id,boost:{WIS:2,CON:1},skills:['medicine','persuasion'],gear:{cls:0,bg:0},hp:{method:'average'}};
let s=plain(R.derive(build));assert.equal(s.background,'Lighthouse Keeper');assert.deepEqual([s.scores.WIS,s.scores.CON],[17,15]);assert(s.skills.perception.prof&&s.skills.survival.prof);
assert.equal(s.initiative,s.mods.DEX+2,'Alert adds proficiency to initiative');assert(s.gear.items.some(i=>i.id==='clothes-travelers')&&s.gear.gp>=45);
R.setHomebrew(B.forCreator({backgrounds:[]},{hbData:{backgrounds:[offered]}}));assert.equal(plain(R.derive(build)).background,'Lighthouse Keeper','a hero being built keeps its homebrew even after it is deleted');
R.setHomebrew(null);
console.log('PASS: only approved homebrew reaches the creator; a homebrew background raises abilities, gives its skills, feat and kit on the sheet; a build keeps its copy.');

/* export and import */
const hb={backgrounds:[{...keeper,approved:true}]};const out=JSON.parse(B.exportJson(hb));assert.equal(out.format,'quillbound-homebrew');assert.equal(out.backgrounds[0].approved,false,'exports carry no approvals');
assert.match(B.parseImport('not json',hb).error,/not readable/);assert.match(B.parseImport('{"format":"other"}',hb).error,/not a Quillbound/);
const twin={...keeper,id:'other-id',desc:'Imported version'},fresh={...keeper,id:'new-id',name:'Ferryman'},file=JSON.stringify({format:'quillbound-homebrew',version:1,backgrounds:[twin,fresh]});
const parsed=plain(B.parseImport(file,hb));assert.deepEqual(parsed.clashes,['other-id'],'same name counts as a clash');assert(parsed.items.every(b=>!b.approved));
let r=plain(B.applyImport(hb,parsed,{}));assert.deepEqual(r.done,{added:1,replaced:0,skipped:1});assert.equal(r.hb.backgrounds.length,2,'nothing replaced without a decision');
r=plain(B.applyImport(hb,parsed,{'other-id':'copy'}));assert(r.hb.backgrounds.some(b=>b.name==='Lighthouse Keeper (imported)'));
r=plain(B.applyImport(hb,parsed,{'other-id':'replace'}));assert.equal(r.hb.backgrounds.find(b=>b.name==='Lighthouse Keeper').desc,'Imported version');assert.equal(r.hb.backgrounds.find(b=>b.name==='Lighthouse Keeper').id,keeper.id,'replacing keeps your id');
console.log('PASS: export carries no approvals; import reads only Quillbound files, flags name clashes and skips, copies or replaces only on a decision; imports start unapproved.');

/* species: building blocks, the SRD band, and the "Die Nachtschicht" vampire */
assert.deepEqual(plain(B.srdSpeciesScores()).map(s=>s.name+' '+s.score),['Dragonborn 6','Dwarf 7','Elf 8','Gnome 5','Goliath 5','Halfling 5','Human 4','Orc 6','Tiefling 6'],'the weights place every SRD species at 4–8');
const vampire={...B.newSpecies(),name:'Vampire',desc:'Undead nightwalkers with a heartbeat of borrowed time.',size:'Medium',speed:30,traits:[
  {block:'darkvision',range:'120'},{block:'climb'},{block:'minor',name:'Camera Gap',desc:'No reflection in ordinary mirrors or cameras.'},
  {block:'custom',name:'Mist Step',desc:'Teleport 9 m through a small visible gap; 3 times per long rest.',weight:'2'},{block:'flight',name:'Bat Form',desc:'For 10 minutes, once per short rest: fly 9 m; no attacks or spells.'},
  {block:'custom',name:'Vampiric Charm',desc:'Once per short rest: Wisdom save DC 14 or trusting for 10 minutes.',weight:'1'},
  {block:'natural',name:'Claws',dice:'1d6',type:'Slashing',finesse:true},{block:'natural',name:'Bite',dice:'1d6',type:'Piercing',finesse:false},
  {block:'drawback',name:'Sunlight',desc:'2d6 radiant damage each round in direct sunlight.',weight:'2'},{block:'drawback',name:'Running Water',desc:'Wisdom save DC 13 to cross it willingly.',weight:'1'}]};
assert.equal(B.speciesScore(vampire),8);assert(B.speciesFits(vampire),plain(B.checkSpecies(vampire)).filter(c=>!c.ok).map(c=>c.detail).join(' '));
assert(plain(B.checkSpecies({...vampire,traits:[...vampire.traits,{block:'toughness'}]})).some(c=>!c.ok&&/stronger than every SRD species/.test(c.detail)),'over the band is flagged');
assert(plain(B.checkSpecies({...vampire,traits:[...vampire.traits,{block:'resistance'}]})).some(c=>!c.ok&&/fill in damage/.test(c.detail)),'an unfinished trait is flagged');
R.setHomebrew(B.forCreator({species:[{...vampire,approved:true}]},{}));
const quinnV=plain(R.derive({name:'Quinn',species:vampire.id,cls:'rogue',level:5,abilities:{method:'set',base:{STR:14,DEX:15,CON:13,INT:13,WIS:12,CHA:8}},background:'criminal',boost:{DEX:1,CON:1,INT:1},asi:{4:{feat:'ability-score-improvement',plus:{DEX:2}}},
  skills:['investigation','perception','acrobatics','insight'],expertise:['sleight-of-hand','investigation'],mastery:['shortsword','shortbow'],gear:{cls:0,bg:1,extra:[{id:'studded-leather-armor',count:1,how:'buy'}]},hp:{method:'average'}}));
const claw=quinnV.attacks.find(a=>a.name==='Claws'),bite=quinnV.attacks.find(a=>a.name==='Bite');
assert.equal(`${claw.bonus} ${claw.damage}`,'7 1d6+4+3d6','Claws +7, 1d6+4 with Sneak Attack, as on Quinn’s sheet');assert.equal(`${bite.bonus} ${bite.damage}`,'5 1d6+2','Bite +5, 1d6+2, as on Quinn’s sheet');
assert.equal(quinnV.ac,16);assert.equal(quinnV.hp.max,38);assert(quinnV.senses.includes('Darkvision (120 ft.)'));assert(quinnV.features.some(f=>f.name==='Sunlight'));assert.deepEqual(quinnV.open,[]);
R.setHomebrew(null);
const both=plain(B.parseImport(B.exportJson({backgrounds:[keeper],species:[vampire]}),{backgrounds:[],species:[]}));assert.deepEqual(both.items.map(x=>x.kind),['background','species']);assert.equal(B.speciesScore(both.items[1]),8,'species survive export and import');
console.log('PASS: homebrew species: weights place all 9 SRD species at 4–8; the Nachtschicht vampire scores 8; Quinn as a vampire gets Claws +7 (1d6+4, Sneak Attack) and Bite +5 (1d6+2) as on the sheet; export/import keeps species.');

/* classes: structure, the comparison with the 12 SRD classes, Toxik's Artificer, the fight test */
const art={...B.newClass(),id:'hb-cl-artificer',name:'Artificer',desc:'Inventors who channel magic through tools and machines.',hitDie:8,primary:['INT'],saves:['CON','INT'],
  skills:{choose:2,from:['arcana','history','investigation','medicine','nature','perception','sleight-of-hand']},armor:['light','medium','shields'],weapons:['simple'],
  caster:'half',spellAbility:'INT',spellList:'wizard',cantrips:'2',extraAttack:true,expertise:[{level:'1',count:'1'}],
  attacks:[{level:'3',name:'Lightning Launcher',dice:'1d6',ability:'INT',type:'Lightning'}],features:[{level:'1',name:"Tinker's Magic",desc:'Make small objects from scraps.'}],
  subclass:{name:'Armorer',summary:'Wear arcane armor that becomes your weapon.',training:['heavy'],features:[{level:'3',name:'Arcane Armor',desc:'Your armor becomes a conduit.'}]},
  kit:{items:[{id:'studded-leather-armor',count:1},{id:'dagger',count:2},{id:'tinkers-tools',count:1},{id:'dungeoneers-pack',count:1}],gp:15}};
assert.deepEqual(plain(B.checkClass(art)).filter(c=>!c.ok).map(c=>c.label),[]);
assert.deepEqual(plain(B.checkClass(B.newClass())).filter(c=>!c.ok).map(c=>c.label),['A name','One or two primary abilities','Two saving throws','Skill choices (2–4)','A subclass name']);
const power=plain(B.classPowerCheck(art));assert(power.ok,power.detail);assert.deepEqual(power.rows.map(r=>r.level),[1,5,11,17]);assert.equal(power.rows[1].mine.attack,'Lightning Launcher +7, 1d6+4 ×2');
const brute={...art,id:'hb-cl-brute',name:'Brute',hitDie:12,extraAttack:true,sneakFrom:'1',attacks:[{level:'1',name:'Smash',dice:'2d6',ability:'INT',type:'Bludgeoning'}]};
assert(!B.classPowerCheck(brute).ok,'a class stronger than every SRD class is flagged');assert(!B.classFits(brute));
assert.equal(plain(B.classToSrd({...art,sneakFrom:'0'})).levels[4].specific?.sneak_attack,undefined,'"0" from a form means no Sneak Attack');
R.setHomebrew({classes:[plain(B.classToSrd(art))]});
const toxik=plain(R.derive({name:'Toxik',species:vampire.id,cls:art.id,level:5,abilities:{method:'set',base:{STR:10,DEX:16,CON:14,INT:15,WIS:12,CHA:8}},background:'sage',boost:{INT:1,CON:1,WIS:1},
  skills:['arcana','investigation'],expertise:['investigation'],asi:{4:{feat:'ability-score-improvement',plus:{INT:2}}},training:['rapier'],gear:{cls:0,bg:1,extra:[{id:'half-plate-armor',count:1,how:'grant'},{id:'rapier',count:1,how:'grant'}]},hp:{method:'average'}}));
R.setHomebrew(null);
assert.equal(toxik.subclass,'Armorer');assert.equal(toxik.ac,17,'half plate 15 + DEX 2, as on Toxik’s sheet');assert.equal(toxik.scores.INT,18);
assert.equal(toxik.attacks.find(a=>a.name==='Lightning Launcher').bonus+' '+toxik.attacks.find(a=>a.name==='Lightning Launcher').damage,'7 1d6+4','Lightning Launcher +7, 1d6+4');
assert.equal(toxik.attacks.find(a=>a.name==='Rapier').bonus,6,'the folding sword (a rapier the DM granted) +6');assert.equal(toxik.skills.investigation.bonus,10);assert.equal(toxik.skills.arcana.bonus,7);
assert.deepEqual([toxik.spellcasting.dc,toxik.spellcasting.cantrips,toxik.spellcasting.slots.slice(0,2).join('/')],[15,3,'4/2'],'half caster: slots like a Paladin, cantrips 2 (+1 at 4)');
vm.runInContext(fs.readFileSync(path.join(root,'src/app/srd-monsters.js'),'utf8'),ctx);
const ft=plain(B.fightTest(art,5,40));assert.deepEqual(ft.rows.map(r=>r.name),['Artificer','Fighter','Rogue','Wizard']);assert(ft.rows.every(r=>r.cells.length===3&&r.cells.every(c=>c.rounds>0&&c.dropped>=0&&c.dropped<=100)));
const cls=plain(B.parseImport(B.exportJson({classes:[art]}),{classes:[]}));assert.equal(cls.items[0].kind,'class');assert.equal(plain(B.classToSrd(cls.items[0])).attacksFrom[0].name,'Lightning Launcher','classes survive export and import');
console.log('PASS: homebrew classes: structure checks; measured against the 12 SRD classes at levels 1/5/11/17 (an overpowered class is flagged); Toxik’s Artificer gives AC 17, Lightning Launcher +7 (1d6+4), Investigation +10 and half-caster slots; the fight test runs; export/import keeps classes.');

/* feats: the 2024 structure, prerequisites the creator enforces, a +1 that works like Grappler's, export and import */
{const hide={...B.newFeat(),id:'hb-ft-hide',name:'Thick-Skinned',type:'general',minLevel:4,abilities:['STR','CON'],desc:'While you aren’t wearing heavy armor, you take 2 less bludgeoning damage from attacks.'};
assert.deepEqual(plain(B.checkFeat(hide)).filter(c=>!c.ok).map(c=>c.label),[]);
assert.deepEqual(plain(B.checkFeat(B.newFeat())).filter(c=>!c.ok).map(c=>c.label),['A name','A +1 to an ability','What it does']);
assert(!B.featFits({...hide,name:'Grappler'}),'an SRD name is taken');assert(!B.featFits({...hide,type:'origin'}),'origin feats have no +1');
const strict={...hide,id:'hb-ft-strict',name:'Iron Hide',abilities:['CON'],prereq:{...B.newPrereq(),feat:'hb-ft-hide',abilities:['CON'],score:15}};
assert(B.featFits(strict,[hide]),'a stricter feat that needs another feat');assert(!B.featFits({...strict,prereq:{...strict.prereq,score:12}},[hide]),'ability prerequisites are 13–17');
const c3={...strict,id:'c3',prereq:{...B.newPrereq(),feat:'hb-ft-strict'}},c4={...strict,id:'c4',prereq:{...B.newPrereq(),feat:'c3'}};
assert(B.featFits(c3,[hide,strict])&&!B.featFits(c4,[hide,strict,c3]),'feat chains stop at three');
assert(B.featAdvice(strict).some(x=>/same ability/.test(x)),'the guide’s tip on +1 and prerequisite on the same ability');
R.setHomebrew({feats:[hide,strict].map(f=>plain(B.featToSrd(f)))});
const base={name:'Brannoc',species:'human',cls:'fighter',level:8,abilities:{method:'set',base:{STR:15,DEX:12,CON:13,INT:8,WIS:10,CHA:10}},background:'soldier',boost:{STR:2,CON:1},hp:{method:'average'}};
const hideF=plain(R.data().feats.find(f=>f.id==='hb-ft-hide')),strictF=plain(R.data().feats.find(f=>f.id==='hb-ft-strict'));
assert(R.featAllowed(base,hideF,4)&&!R.featAllowed(base,strictF,4),'Iron Hide needs Thick-Skinned first');
const took={...base,asi:{4:{feat:'hb-ft-hide',plus:{CON:1}}}};assert.equal(plain(R.derive(took)).scores.CON,15,'its +1 raises CON');
assert(R.featAllowed(took,strictF,8)&&!R.featAllowed({...base,asi:{4:{feat:'hb-ft-hide',plus:{STR:1}}}},strictF,8),'and CON 15 from before level 8');
assert(plain(R.derive(took)).features.some(f=>f.name==='Thick-Skinned'),'the feat is on the sheet');R.setHomebrew(null);
const back=plain(B.parseImport(B.exportJson({feats:[strict]}),{feats:[]}));assert.equal(back.items[0].kind,'feat');assert.equal(back.items[0].prereq.score,15,'feats survive export and import');}
console.log('PASS: homebrew feats follow the 2024 structure (+1 for general feats and boons, none for origin), enforce prerequisites in the creator (ability 13–17 before that level, another feat, class, spellcasting), stop chains at three, and survive export/import.');
{const later={...B.newFeat(),id:'hb-ft-later',name:'Old Hand',type:'general',minLevel:8,abilities:['WIS'],desc:'Once per long rest you can reroll a failed Wisdom save.',prereq:{...B.newPrereq(),abilities:['WIS'],score:13}};
R.setHomebrew({feats:[plain(B.featToSrd(later))]});const f=plain(R.data().feats.find(x=>x.id==='hb-ft-later'));
const b={name:'X',species:'human',cls:'wizard',level:4,abilities:{method:'set',base:{STR:8,DEX:14,CON:14,INT:15,WIS:10,CHA:10}},background:'sage',boost:{INT:2,CON:1}};
assert.equal(f.minLevel,4,'every general feat is Level 4+, whatever the form said');assert.deepEqual(plain(R.featBlockers(b,f,4)),['needs Wisdom 13'],'future feats say what is missing');R.setHomebrew(null);}
console.log('PASS: a feat’s kind sets its level (general feats are Level 4+); future feats list what a hero still needs.');

/* the homebrew that ships with the app for The Night Shift */
vm.runInContext(fs.readFileSync(path.join(root,'src/app/table-homebrew.js'),'utf8'),ctx);const T=plain(ctx.QB_TABLE_HOMEBREW);
assert.deepEqual([T.species.map(s=>s.name),T.classes.map(c=>c.name)],[['Vampire'],['Artificer']],'Vampire is a species, Artificer a class');
assert(T.species.every(s=>B.speciesFits(s)&&B.speciesScore(s)===8)&&T.classes.every(c=>B.classFits(c)),'shipped homebrew passes its own checks');
{const A=T.classes[0];R.setHomebrew({classes:[plain(B.classToSrd(A))]});const at=lv=>plain(R.derive({...R.quickBuild(A.id,'Toxik',lv),species:'human'}));
assert.deepEqual([1,5,9,10,13,14].map(lv=>at(lv).spellcasting.cantrips),[2,2,2,3,3,4],'2025 Artificer: cantrips 2, 3 at level 10, 4 at level 14');
assert.deepEqual(at(5).spellcasting.slots.filter(Boolean),[4,2],'half-caster slots as in the 2025 table');
assert(["Thieves' Tools","Tinker's Tools","Smith's Tools"].every(n=>at(3).tools.includes(n))&&!at(2).tools.includes("Smith's Tools"),'class tools, and Smith’s Tools from the Armorer at level 3');
assert.equal(B.kitValue(A.kit),150,'the kit is worth the 150 GP the alternative offers');assert.equal(A.expertise.length,0,'no Expertise in the 2025 Artificer');
R.setHomebrew(null);}
console.log('PASS: the shipped Artificer follows the 2025 class: cantrips at 10 and 14, half-caster slots, class and Armorer tools, a 150 GP kit, no Expertise.');
console.log('PASS: the shipped Night Shift homebrew (Vampire species, Artificer class) passes the same checks as homebrew made on the screen.');

/* the screen, end to end */
ctx.capture=(title,body)=>{captured=title;handlers={};return {close(){},querySelector:k=>handlers[k]??={}};};run('openDialog=capture;');
run(`S=fresh();S.tab='homebrew';render();`);assert(node('#view').innerHTML.includes('No homebrew backgrounds yet'));
run(`ACT['hb-new']();Object.assign(S.hbEdit,{name:'Lighthouse Keeper',feat:'alert',tool:"Navigator's Tools"});for(const v of ['WIS','CON','INT'])ACT['hb-toggle']({k:'abilities',v,max:3});ACT['hb-toggle']({k:'abilities',v:'STR',max:3});
  for(const v of ['perception','survival'])ACT['hb-toggle']({k:'skills',v,max:2});ACT['hb-additem']({v:'clothes-travelers'});S.hbEdit.kit.gp='45';render();`);
assert(node('#view').innerHTML.includes('Fits the 2024 structure'));assert.equal(run('S.hbEdit.abilities.length'),3,'a fourth ability is refused');
run(`ACT['hb-save']();render();`);assert.equal(run('S.homebrew.backgrounds.length'),1);assert.equal(run('S.homebrew.backgrounds[0].kit.gp'),45);
const id=run('S.homebrew.backgrounds[0].id');
run(`S.creator=crNew();S.tab='create';S.creator.step='background';render();`);assert(!node('#view').innerHTML.includes('Lighthouse Keeper'),'unapproved: not in the creator');
run(`ACT['hb-approve']({v:'${id}'});S.tab='create';render();`);assert(node('#view').innerHTML.includes('Lighthouse Keeper')&&node('#view').innerHTML.includes('Homebrew'));
run(`ACT['cr-species']({v:'human'});ACT['cr-class']({v:'cleric'});ACT['cr-quick']({v:'cleric'});ACT['cr-bg']({v:'${id}'});S.creator.build.name='Mara';ACT['cr-add']();`);
const hero=plain(run('S.party[S.party.length-1]'));assert.equal(hero.name,'Mara');assert.equal(hero.build.hbData.backgrounds[0].name,'Lighthouse Keeper','the hero keeps its own copy');
run(`ACT['hb-del']({v:'${id}'});`);assert.match(captured,/Delete Lighthouse Keeper/);handlers['#cl-confirm'].onclick();assert.equal(run('S.homebrew.backgrounds.length'),0);
assert.equal(plain(run('S.party[S.party.length-1]')).build.hbData.backgrounds[0].name,'Lighthouse Keeper');
run(`S.homebrew.backgrounds.push({...QBHomebrew.newBackground(),name:'Half done'});`);const half=run('S.homebrew.backgrounds[0].id');run(`ACT['hb-approve']({v:'${half}'});`);assert.equal(run('S.homebrew.backgrounds[0].approved'),false,'an unfinished background cannot be approved');
console.log('PASS: the Homebrew screen builds, checks and saves a background; approval puts it into the creator; a hero made with it keeps its copy after the DM deletes it; unfinished work cannot be approved.');
