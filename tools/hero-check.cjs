// Hero rules (SRD 5.2): example builds against sheets worked out by hand from the 2024 rules.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'..');
const real=require('node:crypto').webcrypto;let queue=[],calls=0;
const ctx=vm.createContext({crypto:{getRandomValues(a){calls++;if(queue.length)a[0]=queue.shift();else real.getRandomValues(a);return a;}}});
for(const f of ['srd-heroes','srd-spells','hero-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),ctx);
const R=ctx.QBHeroRules,D=ctx.QBHERO;
const plain=x=>JSON.parse(JSON.stringify(x)); // values out of the sandbox, for deep comparisons
const sheet=b=>plain(R.derive(b));
const arr=(order)=>Object.fromEntries(order.map((k,i)=>[k,[15,14,13,12,10,8][i]]));

/* data */
assert.equal(D.classes.length,12);assert.equal(D.species.length,9);assert.equal(D.backgrounds.length,4);assert(D.classes.every(c=>c.levels.length===20));
assert(/SRD 5\.2/.test(D.attribution)&&/Creative Commons Attribution 4\.0/.test(D.attribution));assert.equal(ctx.QBSPELLS.length,339);
console.log('PASS: SRD 5.2 data: 12 classes × 20 levels, 9 species, 4 backgrounds, 339 spells, with the CC-BY attribution.');

/* fair dice */
queue=[4294967295,4294967292,0];calls=0;assert.equal(R.die(6),1);assert.equal(calls,3); // 2^32 mod 6 = 4: the top 4 values are thrown away
queue=[2,0,4,5];const roll=plain(R.rollAbilities())[0];assert.deepEqual(roll,[3,1,5,6]);assert.equal(R.rollTotal(roll),14,'4d6 drop the lowest');
console.log('PASS: ability rolls (4d6, drop the lowest) and hit-point rolls use fair, rejection-sampled dice.');

/* 1: Human Fighter 1, Soldier, chain mail, Defense */
const fighter={name:'Brannoc',species:'human',speciesSkill:'insight',speciesFeat:'skilled',featPicks:{skilled:['history','religion','arcana']},cls:'fighter',level:1,
  abilities:{method:'array',base:arr(['STR','CON','DEX','WIS','CHA','INT'])},background:'soldier',boost:{STR:2,CON:1},toolChoice:'Dice',skills:['perception','survival'],
  fightingStyle:'defense',mastery:['greatsword','flail','javelin'],gear:{cls:0,bg:0},hp:{method:'average'}};
let s=sheet(fighter);
assert.deepEqual([s.scores.STR,s.scores.CON,s.scores.DEX],[17,15,13]);assert.equal(s.hp.max,12);assert.equal(s.ac,17,'chain mail 16 + Defense 1');
assert.deepEqual(s.attacks.map(a=>`${a.name} ${a.bonus} ${a.damage} x${a.count}`),['Greatsword 5 2d6+3 x1','Flail 5 1d8+3 x1','Javelin 5 1d6+3 x1','Spear 5 1d6+3 x1','Shortbow 3 1d6+1 x1']);
assert.deepEqual([s.saves.STR.bonus,s.saves.CON.bonus,s.saves.DEX.bonus],[5,4,1]);assert.deepEqual([s.skills.athletics.bonus,s.skills.perception.bonus,s.skills.insight.bonus,s.passive],[5,3,3,13]);
assert.equal(s.speed,30);assert.deepEqual(s.open,[]);assert.deepEqual(s.warnings,[]);
console.log('PASS: Human Fighter 1: STR 17, HP 12, AC 17 (chain mail + Defense), Greatsword +5 for 2d6+3, saves, skills, passive Perception 13; nothing left open.');

/* 2: High Elf Wizard 5, Sage, INT raised at 4 */
const wizard={name:'Wren',species:'elf',sub:'elven-lineage-high-elf',keenSense:'perception',cls:'wizard',level:5,abilities:{method:'array',base:arr(['INT','CON','DEX','WIS','CHA','STR'])},
  background:'sage',boost:{INT:2,CON:1},skills:['arcana','investigation'],asi:{4:{feat:'ability-score-improvement',plus:{INT:2}}},gear:{cls:0,bg:0},hp:{method:'average'},
  spells:{cantrips:['fire-bolt','light','mage-hand','prestidigitation'],prepared:['magic-missile','shield','sleep','detect-magic','mage-armor','misty-step','scorching-ray','fireball','burning-hands']}};
s=sheet(wizard);
assert.equal(s.scores.INT,19);assert.equal(s.hp.max,32,'6+2, then 4 × (4+2)');assert.equal(s.ac,11);assert.equal(s.prof,3);
assert.deepEqual([s.spellcasting.dc,s.spellcasting.attack,s.spellcasting.cantrips,s.spellcasting.prepared,s.spellcasting.slots.slice(0,3).join('/')],[15,7,4,9,'4/3/2']);
assert.deepEqual(s.attacks.filter(a=>a.kind==='cantrip').map(a=>`${a.name} ${a.bonus} ${a.damage}`),['Fire Bolt 7 2d10']);
assert.equal(s.skills.perception.bonus,4);assert.equal(s.subclass,'Evoker');assert(s.senses.some(x=>/60/.test(x)));assert.deepEqual(s.open,[]);
console.log('PASS: High Elf Wizard 5: INT 19, HP 32, spell save DC 15, spell attack +7, 4 cantrips, 9 prepared, slots 4/3/2, Fire Bolt 2d10, Evoker.');

/* 3: Dwarf Barbarian 3: Unarmored Defense, Dwarven Toughness */
s=sheet({name:'Grum',species:'dwarf',cls:'barbarian',level:3,abilities:{method:'array',base:arr(['STR','CON','DEX','WIS','CHA','INT'])},background:'soldier',boost:{STR:2,CON:1},toolChoice:'Dice',
  skills:['athletics','survival'],mastery:['greataxe','handaxe'],gear:{cls:0,bg:1},hp:{method:'average'}});
assert.equal(s.hp.max,35,'12+2, 2 × (7+2), +3 Dwarven Toughness');assert.equal(s.ac,13,'10 + DEX 1 + CON 2');assert.equal(s.acFrom,'Unarmored Defense (Dex + Con)');
assert.equal(s.attacks[0].name+' '+s.attacks[0].bonus+' '+s.attacks[0].damage,'Greataxe 5 1d12+3');assert.equal(s.subclass,'Path of the Berserker');
console.log('PASS: Dwarf Barbarian 3: HP 35 with Dwarven Toughness, AC 13 from Unarmored Defense, Greataxe +5 for 1d12+3, Berserker.');

/* 4: Halfling Rogue 5, Criminal: finesse, Sneak Attack, expertise */
s=sheet({name:'Ilsa',species:'halfling',cls:'rogue',level:5,abilities:{method:'pointbuy',base:{DEX:15,CON:14,WIS:13,INT:12,CHA:10,STR:8}},background:'criminal',boost:{DEX:2,CON:1},
  skills:['acrobatics','perception','deception','insight'],expertise:['stealth','perception'],asi:{4:{feat:'ability-score-improvement',plus:{DEX:2}}},mastery:['shortsword','shortbow'],gear:{cls:0,bg:0},hp:{method:'average'}});
assert.equal(s.scores.DEX,19);assert.equal(s.hp.max,38,'8+2, 4 × (5+2)');assert.equal(s.ac,15,'leather 11 + DEX 4');
const ss=s.attacks.find(a=>a.name==='Shortsword');assert.equal(`${ss.bonus} ${ss.damage}`,'7 1d6+4+3d6');assert.equal(s.skills.stealth.bonus,10,'expertise: DEX 4 + 2 × 3');assert.equal(s.passive,17);
assert.deepEqual(plain(R.abilityChecks({abilities:{method:'pointbuy',base:{STR:15,DEX:15,CON:15,INT:15,WIS:8,CHA:8}}})),['Point buy: 36 of 27 points spent.']);
console.log('PASS: Halfling Rogue 5: point buy, DEX 19, HP 38, AC 15, Shortsword +7 for 1d6+4 plus 3d6 Sneak Attack, Stealth +10 with expertise; point buy over 27 is flagged.');

/* 5: attacks per action, Monk, hit points by roll, set values */
const f11=sheet({...fighter,level:11}),f20=sheet({...fighter,level:20});assert.equal(f11.attacks[0].count,3);assert.equal(f20.attacks[0].count,4);
assert.deepEqual(plain(R.asiLevels({...fighter,level:11})),[4,6,8],'Fighter improvements up to level 11');assert.deepEqual(plain(R.asiLevels({...fighter,level:20})),[4,6,8,12,14,16,19]);
assert.deepEqual(f11.open.filter(o=>/^Level \d+:/.test(o.label)).map(o=>o.label.slice(0,8)),['Level 4:','Level 6:','Level 8:'],'each improvement is an open choice until made');
const monkBuild={name:'Sun',species:'human',cls:'monk',level:1,abilities:{method:'set',base:{STR:10,DEX:16,CON:14,INT:8,WIS:15,CHA:10}},background:'acolyte',boost:{WIS:1,INT:1,CHA:1},gear:{cls:0,bg:1},hp:{method:'average'}},monk=sheet(monkBuild);
assert.equal(monk.scores.WIS,16);assert.equal(monk.ac,16,'10 + DEX 3 + WIS 3 (15 raised to 16 by the Acolyte background)');assert(monk.attacks.some(a=>a.name==='Unarmed Strike'&&a.damage==='1d6+3'&&a.bonus===5));
const rolled=sheet({...fighter,level:3,hp:{method:'roll',rolls:{2:1,3:10}}});assert.equal(rolled.hp.max,12+(1+2)+(10+2));
assert(sheet({...fighter,level:3,hp:{method:'roll',rolls:{2:7}}}).warnings.some(w=>/level 3/.test(w)),'a missing roll is flagged');
assert(sheet({...monkBuild,abilities:{method:'set',base:{STR:2,DEX:16,CON:14,INT:8,WIS:15,CHA:10}}}).warnings.some(w=>/3 to 20/.test(w)));
const lore={name:'Camilla',species:'orc',cls:'bard',level:5,abilities:{method:'set',base:{STR:8,DEX:16,CON:14,INT:13,WIS:11,CHA:15}},background:'acolyte',boost:{CHA:1,INT:1,WIS:1},skills:['persuasion','deception','perception'],expertise:['persuasion','insight'],asi:{4:{feat:'ability-score-improvement',plus:{CHA:2}}},gear:{cls:0,bg:1},hp:{method:'average'}};
assert(sheet(lore).open.some(o=>o.label==='College of Lore: three skills'),'Lore bards choose three bonus skills at level 3');
const lore2=sheet({...lore,featPicks:{lore:['investigation','arcana','history']}});assert.equal(lore2.skills.investigation.bonus,5);assert(!lore2.open.some(o=>/Lore/.test(o.label)));assert(!sheet({...lore,level:2}).open.some(o=>/Lore/.test(o.label)));
// Extra gear and DM-granted training, checked against the "Die Nachtschicht" sheets (Quinn AC 16, Camilla AC 15 and Longbow +6, 1d8+3)
const quinn={name:'Quinn',species:'orc',cls:'rogue',level:5,abilities:{method:'set',base:{STR:14,DEX:15,CON:13,INT:13,WIS:12,CHA:8}},background:'criminal',boost:{DEX:1,CON:1,INT:1},asi:{4:{feat:'ability-score-improvement',plus:{DEX:2}}},
  skills:['investigation','perception','acrobatics','insight'],expertise:['sleight-of-hand','investigation'],mastery:['shortsword','shortbow'],gear:{cls:0,bg:1,extra:[{id:'studded-leather-armor',count:1,how:'buy'}]},hp:{method:'average'}};
const q=sheet(quinn);assert.equal(q.ac,16,'studded leather 12 + DEX 4');assert.equal(q.gear.spent,45);assert(q.gear.gp>=0);assert(q.tools.includes("Thieves' Tools"));assert.deepEqual(q.warnings,[]);
assert(sheet({...quinn,gear:{cls:0,bg:0,extra:[{id:'plate-armor',count:1,how:'buy'}]}}).warnings.some(w=>/GP short/.test(w)),'overspending is flagged');
const cam=sheet({...lore,featPicks:{lore:['investigation','arcana','history']},training:['longbow'],gear:{cls:0,bg:1,extra:[{id:'studded-leather-armor',count:1,how:'buy'},{id:'longbow',count:1,how:'grant'},{id:'arrows',count:20,how:'buy'}]}});
assert.equal(cam.ac,15);const bow=cam.attacks.find(a=>a.name==='Longbow');assert.equal(`${bow.bonus} ${bow.damage}`,'6 1d8+3','trained by the DM: +6');assert(cam.features.some(f=>f.name==='Training granted by the DM'));
assert.equal(R.priceOf('arrows',20),1);assert.equal(sheet({...lore,gear:{cls:0,bg:1,extra:[{id:'longbow',count:1,how:'grant'}]}}).attacks.find(a=>a.name==='Longbow').note,'not proficient','without the training the longbow is untrained');
console.log('PASS: extra gear (bought with kit gold, or granted by the DM) and DM-granted training: Quinn AC 16 and Camilla AC 15 with Longbow +6 for 1d8+3, as on their sheets; overspending is flagged.');
console.log('PASS: Extra Attack (2 at 5, 3 at 11, 4 at 20), Monk Unarmored Defense and Martial Arts, logged HP rolls, set values checked 3–20.');

/* 6: every class at every level derives without errors; Quick build leaves only the choices a player must make */
for(const c of D.classes){const q=R.quickBuild(c.id,'Quick');for(let lv=1;lv<=20;lv++){const x=sheet({...q,level:lv});assert(x.hp.max>0&&x.ac>=10,c.id+' '+lv);}
  const open=sheet(q).open.map(o=>o.label);assert(!open.some(l=>/Ability scores|Background ability|skills$/.test(l)),c.id+': '+open.join('; '));}
for(const sp of D.species){const q=sheet(R.quickBuild('wizard','Keep',3,{species:sp.id}));assert.equal(q.species,sp.name,'Quick build keeps the chosen species');assert.deepEqual(q.open.map(o=>o.label),[],sp.id+': nothing open');}
for(const c of D.classes)for(const lv of [1,5,11,20]){const q=sheet(R.quickBuild(c.id,'Quick',lv));assert.deepEqual(q.open.map(o=>o.label),[],`${c.id} ${lv}: Quick build leaves nothing open`);assert.deepEqual(q.warnings,[],`${c.id} ${lv}`);}
console.log('PASS: all 12 classes derive at levels 1–20; Quick build leaves no choice open at levels 1, 5, 11 and 20 (spells, masteries, improvements, styles included).');

/* 7: background increases and the Stakes fields */
assert.match(R.boostCheck({background:'sage',boost:{STR:2,INT:1}}),/can only raise/);assert.match(R.boostCheck({background:'sage',boost:{INT:2,WIS:2}}),/by 2 and another by 1/);assert.equal(R.boostCheck({background:'sage',boost:{INT:1,WIS:1,CON:1}}),'');
const hero=plain(R.toHero(fighter,undefined,{id:'p1',hpNow:5}));
assert.deepEqual([hero.hp,hero.hpNow,hero.ac,hero.prof,hero.hitDice.die,hero.stamina,hero.attacks[0].name],[12,5,17,2,10,2,'Greatsword']);assert.equal(hero.build.cls,'fighter');
console.log('PASS: background increases follow the 2024 rule (+2/+1 or +1/+1/+1 from its three abilities); a hero record keeps current HP and gets the sheet’s numbers.');

/* the 2024 Player's Handbook feats (summaries): the full list, prerequisites, and the ones that change numbers */
{const c2=vm.createContext({crypto:require('crypto').webcrypto});for(const f of ['srd-heroes','phb-feats','hero-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),c2);
const F=c2.QBHERO.feats,R2=c2.QBHeroRules,count=t=>F.filter(f=>f.type===t).length,by=id=>F.find(f=>f.id===id);
assert.deepEqual([count('origin'),count('fighting-style'),count('general'),count('epic-boon')],[10,10,43,12],'every 2024 feat outside the playtest');
assert(F.filter(f=>f.type==='general').every(f=>f.minLevel===4),'every general feat is Level 4+');assert.equal(new Set(F.map(f=>f.id)).size,F.length,'no feat twice');
const b={name:'T',species:'human',speciesFeat:'tough',cls:'wizard',level:8,abilities:{method:'set',base:{STR:8,DEX:12,CON:14,INT:15,WIS:12,CHA:10}},background:'sage',boost:{INT:2,CON:1},asi:{4:{feat:'resilient',plus:{CON:1}},8:{feat:'moderately-armored',plus:{DEX:1}}},hp:{method:'average'}};
const s=plain(R2.derive(b)),s0=plain(R2.derive({...b,speciesFeat:'skilled',asi:{}}));
assert.equal(s.hp.max-s0.hp.max,16+8,'Tough +2 per level, and Resilient’s +1 Constitution');assert(s.saves.CON.prof&&!s0.saves.CON.prof,'Resilient: Constitution saves');
assert(R2.proficientWith(b,'scale-mail')&&!R2.proficientWith({...b,asi:{}},'scale-mail'),'Moderately Armored: medium armor');
assert.deepEqual(plain(R2.featBlockers({...b,abilities:{method:'set',base:{...b.abilities.base,DEX:10}}},by('sharpshooter'),4)),['needs Dexterity 13']);assert.deepEqual(plain(R2.featBlockers({...b,cls:'fighter'},by('war-caster'),4)),['needs the Spellcasting feature']);}
console.log('PASS: 2024 feats: all 75 outside the playtest, general ones at level 4; Tough, Boon of Fortitude, Resilient and the training feats change the sheet; prerequisites are enforced.');

/* the hero record's attack list: the contract combat reads (name, bonus, damage, count, plus type, save and kind) */
{const bard=plain(R.toHero(R.quickBuild('bard','Camilla',5),R.derive(R.quickBuild('bard','Camilla',5)),{id:'pb'}));
assert(bard.attacks.length>1&&bard.attacks.every(a=>typeof a.name==='string'&&Number.isFinite(a.bonus)&&typeof a.damage==='string'&&a.damage&&Number.isInteger(a.count)&&a.count>=1),'every attack keeps name, bonus, damage and count');
const vm2=bard.attacks.find(a=>a.name==='Vicious Mockery');assert(vm2&&vm2.save==='WIS'&&vm2.kind==='cantrip'&&vm2.type==='Psychic','a saving-throw cantrip says so');}
console.log('PASS: hero records keep the full attack list for combat (name, bonus, damage, count; type, save and kind too).');

/* the 2024 Player's Handbook backgrounds (src/app/phb-backgrounds.js): all 16, each builds a complete hero */
{const c3=vm.createContext({crypto:require('crypto').webcrypto});for(const f of ['srd-heroes','phb-feats','phb-backgrounds','hero-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),c3);
const H3=c3.QBHERO,R3=c3.QBHeroRules;assert.equal(H3.backgrounds.length,16,'4 SRD + 12 Player’s Handbook backgrounds');
for(const bg of H3.backgrounds){assert.equal(bg.abilities.length,3);assert.equal(bg.skills.length,2);assert(H3.feats.some(f=>f.id===bg.feat.id&&f.type==='origin'),bg.name+': an origin feat');if(bg.source==='phb-2024')assert(bg.equipment.choices[0].items.every(i=>H3.equipment[i.id]),bg.name+': kit items exist');
  const b={...R3.quickBuild('fighter','T',1),background:bg.id,boost:{[bg.abilities[0]]:2,[bg.abilities[1]]:1},toolChoice:''};R3.fillDefaults(b);assert.deepEqual(plain(R3.derive(b).open),[],bg.name+': nothing left open');}
const base={...R3.quickBuild('fighter','T',4),boost:{STR:2,CON:1}},farmer=R3.derive({...base,background:'farmer'}),soldier=R3.derive({...base,background:'soldier'});
assert.equal(farmer.scores.CON,soldier.scores.CON);assert.equal(farmer.hp.max-soldier.hp.max,8,'Farmer: Tough gives +2 HP per level');}
console.log('PASS: all 16 backgrounds of the 2024 rules (12 from the Player’s Handbook as summaries) build complete heroes; Farmer’s Tough adds its hit points.');

/* subclasses: four per class (the SRD one plus three from the Player's Handbook), chosen in the build; some calculate */
{const c4=vm.createContext({crypto:require('crypto').webcrypto});for(const f of ['srd-heroes','phb-feats','phb-backgrounds','phb-subclasses','srd-spells','hero-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),c4);
const H4=c4.QBHERO,R4=c4.QBHeroRules;assert(H4.classes.every(c=>c.subclasses.length===4&&c.subclasses[0].id===c.subclass.id),'4 subclasses each, the SRD one first');
assert(H4.classes.every(c=>c.subclasses.every(s=>s.features.length&&s.features.every(f=>f.level>=3&&f.level<=20&&f.name&&f.desc))),'every feature named, levelled and described');
assert.equal(R4.derive(R4.quickBuild('bard','L',6)).subclass,'College of Lore','no choice made: the SRD subclass, as before');
const ek={...R4.quickBuild('fighter','EK',7),subclass:'eldritch-knight'};R4.fillDefaults(ek);const s=plain(R4.derive(ek));
assert.equal(s.subclass,'Eldritch Knight');assert.deepEqual([s.spellcasting.ability,s.spellcasting.cantrips,s.spellcasting.prepared,s.spellcasting.slots.slice(0,3).join('/')],['INT',2,5,'4/2/0'],'Eldritch Knight casts like a third caster');assert.deepEqual(s.open,[]);
assert(s.features.some(f=>f.name==='War Magic')&&!s.features.some(f=>f.name==='Improved Critical'),'its own features, not the Champion’s');
const at={...R4.quickBuild('rogue','AT',10),subclass:'arcane-trickster'};R4.fillDefaults(at);assert.equal(R4.derive(at).spellcasting.cantrips,4,'Arcane Trickster: 3 cantrips, 4 at level 10');
const val={...R4.quickBuild('bard','V',6),subclass:'college-of-valor'};assert(R4.proficientWith(val,'longsword')&&R4.proficientWith(val,'scale-mail'),'Valor: martial weapons, medium armor');
val.gear={cls:1,bg:1,extra:[{id:'longsword',count:1,how:'grant'}]};assert.equal(R4.derive(val).attacks.find(a=>a.name==='Longsword').count,2,'Valor: Extra Attack at 6');
assert.equal(R4.derive({...val,level:5}).attacks.find(a=>a.name==='Longsword').count,1);}
console.log('PASS: subclasses: four per class (36 from the Player’s Handbook as summaries), chosen per hero (the SRD one by default); Eldritch Knight and Arcane Trickster cast spells, Valor gains training and Extra Attack.');

/* more backgrounds: 3 from the 2022 playtest (third ability added) and 11 classic ones converted; all in the 2024 structure */
{const c5=vm.createContext({crypto:require('crypto').webcrypto});for(const f of ['srd-heroes','phb-feats','phb-backgrounds','phb-subclasses','extra-backgrounds','hero-rules','homebrew'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),c5);
const H5=c5.QBHERO,R5=c5.QBHeroRules,B5=c5.QBHomebrew;assert.equal(H5.backgrounds.length,30);assert.equal(new Set(H5.backgrounds.map(b=>b.id)).size,30,'no background twice');
for(const bg of H5.backgrounds.filter(b=>['playtest','classic'].includes(b.source))){assert.equal(bg.abilities.length,3,bg.name);assert.equal(new Set(bg.abilities).size,3,bg.name);assert(H5.feats.some(f=>f.id===bg.feat.id&&f.type==='origin'),bg.name);
  assert(bg.equipment.choices[0].items.every(i=>H5.equipment[i.id]),bg.name+': kit items exist');const ch=bg.equipment.choices[0];if(bg.source==='classic')assert(B5.kitValue({items:ch.items,gp:ch.gp})>=40&&B5.kitValue({items:ch.items,gp:ch.gp})<=60,bg.name+': kit about 50 GP');
  const b={...R5.quickBuild('rogue','T',1),background:bg.id,boost:{[bg.abilities[0]]:1,[bg.abilities[1]]:1,[bg.abilities[2]]:1},toolChoice:'',expertise:[]};R5.fillDefaults(b);assert.deepEqual(plain(R5.derive(b).open),[],bg.name+': nothing left open');}}
console.log('PASS: 30 backgrounds: SRD, Player’s Handbook, 2022 playtest (with a third ability) and 11 classic ones converted to the 2024 structure; each builds a complete hero.');

/* fan-made subclasses (5.5 fan wiki), after the SRD and Player's Handbook ones */
{const c6=vm.createContext({crypto:require('crypto').webcrypto});for(const f of ['srd-heroes','phb-feats','phb-backgrounds','phb-subclasses','fan-subclasses','srd-spells','hero-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),c6);
const H6=c6.QBHERO,R6=c6.QBHeroRules,all=H6.classes.flatMap(c=>c.subclasses);assert.equal(all.filter(s=>s.source==='fan').length,29);assert.equal(new Set(all.map(s=>s.id)).size,all.length,'no subclass twice');
assert(all.every(s=>s.features.every(f=>f.level>=3&&f.level<=20&&f.name&&f.desc)));assert(H6.classes.every(c=>c.subclasses[0].source==='srd'));
const sw={...R6.quickBuild('bard','S',6),subclass:'college-of-swords',gear:{cls:1,bg:1,extra:[{id:'scimitar',count:1,how:'grant'}]}};assert(R6.proficientWith(sw,'scimitar')&&R6.proficientWith(sw,'scale-mail'),'Swords: scimitars and medium armor');assert.equal(R6.derive(sw).attacks.find(a=>a.name==='Scimitar').count,2,'Swords: Extra Attack at 6');
assert(R6.proficientWith({...R6.quickBuild('cleric','F',3),subclass:'forge-domain'},'plate-armor')&&!R6.proficientWith(R6.quickBuild('cleric','L',3),'plate-armor'),'Forge Domain: heavy armor');}
console.log('PASS: 29 fan-made subclasses (summaries) join the SRD and Player’s Handbook ones; College of Swords and the Forge and Order Domains change the sheet.');

/* the Aasimar (Player's Handbook species, summarised) */
{const c7=vm.createContext({crypto:require('crypto').webcrypto});for(const f of ['srd-heroes','phb-feats','phb-species','srd-spells','hero-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),c7);
const R7=c7.QBHeroRules,s=plain(R7.derive(R7.quickBuild('paladin','A',3,{species:'aasimar'})));assert.equal(c7.QBHERO.species.length,10,'9 SRD species + the Aasimar');assert.equal(s.species,'Aasimar');assert.deepEqual(s.open,[]);
assert.deepEqual(s.features.filter(f=>['Celestial Resistance','Healing Hands','Light Bearer','Celestial Revelation'].includes(f.name)).length,4);}
console.log('PASS: the Aasimar builds a complete hero with its traits.');

/* Player's Handbook spells beyond the free rules (src/app/phb-spells.js, loaded after the SRD list) */
{const c8=vm.createContext({crypto:require('crypto').webcrypto});for(const f of ['srd-heroes','srd-spells','phb-spells','hero-rules'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),c8);
const L=c8.QBSPELLS,R8=c8.QBHeroRules,extra=L.filter(s=>s.source==='phb-2024');assert.equal(extra.length,51);assert(!extra.some(s=>s.unchecked),'all confirmed by the DM');assert.equal(extra.find(s=>/^Jallarzi/.test(s.name)).damage[5],'2d10+2d10');assert(!L.some(s=>s.name==='Shadow Blade'),'Shadow Blade is a legacy spell');assert(extra.filter(s=>s.unchecked).every(s=>/check it against/.test(s.desc)));assert.equal(new Set(L.map(s=>s.id)).size,L.length,'no spell twice');
assert(extra.every(s=>s.level>=0&&s.level<=9&&s.classes.length&&s.time&&s.range&&s.duration&&s.desc&&(!s.damage||s.damageType)),'every field set');
const w={...R8.quickBuild('warlock','W',5)};w.spells.cantrips=['toll-the-dead','mind-sliver'];const at=plain(R8.derive(w).attacks).filter(a=>a.kind==='cantrip');
assert.deepEqual(at.map(a=>[a.name,a.save,a.damage]),[['Toll the Dead','WIS','2d8'],['Mind Sliver','INT','2d6']],'save cantrips scale at level 5');}
console.log('PASS: 51 Player’s Handbook spells (summaries; the ones entered from memory confirmed by the DM) join the 339 SRD spells; their attack cantrips calculate.');
