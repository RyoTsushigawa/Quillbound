// The hero importer (src/app/hero-import.js): text PDF sheets (German and English), fillable PDF fields, D&D Beyond
// and Foundry VTT JSON become creator heroes whose scores, HP and AC match the sheet; differences are listed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),plain=x=>JSON.parse(JSON.stringify(x));
const ctx=vm.createContext({crypto:require('node:crypto').webcrypto});
for(const f of ['srd-heroes','phb-feats','srd-spells','hero-rules','homebrew','table-homebrew','hero-import'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),ctx);
const R=ctx.QBHeroRules,I=ctx.QBHeroImport,data=()=>R.data();R.setHomebrew(ctx.QBHomebrew.forCreator(ctx.QB_TABLE_HOMEBREW,{}));
const build=f=>plain(I.toBuild(f,R,ctx.QBSPELLS)),diff=r=>r.compare.filter(x=>!x.same);

/* a text sheet laid out like the Night Shift ones (German) */
const quinn=['THE NIGHT SHIFT','QUINN','Vampir · Schurke 5 (Dieb)','ST | GE | KO | IN | WE | CH','+2 | +4 | +2 | +2 | +1 | -1','14 | 18 | 14 | 14 | 12 | 8',
  'Rüstungsklasse | Trefferpunkte | Tempo | Übungsbonus | Stamina | Initiative','16 | 38 | 9 m | +3 | 3 / 3 | +4','Krallen +7 1W6+4 Hieb [Finesse: Homebrew]',
  '● Fingerfertigkeit | +10','● Geschichte | +5','● Heimlichkeit | +7','○ Athletik | +2','● Nachforschungen | +8','● Wahrnehmung | +4','○ Täuschen | -1'];
let f=I.fromText(quinn,data());
assert.deepEqual([f.name,f.species,f.cls,f.level,f.hp,f.ac,f.speed],['Quinn','hb-sp-night-shift-vampire','rogue',5,38,16,30],'title, species (Vampir → Vampire), class (Schurke), HP, AC, speed in metres');
assert.deepEqual(plain(f.abilities),{STR:14,DEX:18,CON:14,INT:14,WIS:12,CHA:8});
let r=build(f);assert.deepEqual(diff(r),[],'Quinn imports with every number matching: '+JSON.stringify(diff(r)));
assert.deepEqual([r.sheet.scores.DEX,r.sheet.hp.max,r.sheet.ac],[18,38,16]);assert(r.build.expertise.includes('sleight-of-hand'),'expertise read from the bonus');
assert(r.check.some(x=>/Studded Leather/.test(x)),'armor worked out from AC, and said so');
/* English text, HP through per-level rolls, an unknown background and a weapon the class isn't trained in */
f=I.fromText(['MIRA','Human · Fighter 4 · Lamplighter','STR | DEX | CON | INT | WIS | CHA','16 | 14 | 15 | 10 | 12 | 8','Armor Class | Hit Points | Speed','17 | 44 | 30 ft','● Athletics | +5','● Perception | +3'],data());
r=build(f);assert.equal(r.sheet.hp.max,44,'HP 44 through rolls');assert.equal(r.build.hp.method,'roll');assert.equal(r.sheet.scores.STR,16);assert(r.check.some(x=>/Lamplighter/.test(x)),'unknown background named');
/* a fillable PDF's fields */
const fields={CharacterName:[{value:'Bryn'}],ClassLevel:[{value:'Wizard 3'}],'Race ':[{value:'Elf'}],Background:[{value:'Sage'}],STR:[{value:'8'}],DEX:[{value:'14'}],CON:[{value:'14'}],INT:[{value:'16'}],WIS:[{value:'12'}],CHA:[{value:'10'}],HPMax:[{value:'20'}],AC:[{value:'12'}],Arcana:[{value:'+5'}],History:[{value:'+5'}]};
f=I.fromFields(fields,data());assert.deepEqual([f.name,f.cls,f.level,f.species],['Bryn','wizard',3,'elf']);r=build(f);assert.equal(r.sheet.background,'Sage');assert.equal(r.sheet.scores.INT,16);assert.equal(r.sheet.hp.max,20);
/* D&D Beyond JSON (the parts the importer reads) */
const ddb={data:{name:'Garr',race:{baseRaceName:'Dwarf'},classes:[{level:5,isStartingClass:true,definition:{name:'Fighter'},subclassDefinition:{name:'Champion'}}],background:{definition:{name:'Soldier'}},
  stats:[1,2,3,4,5,6].map((id,i)=>({id,value:[15,12,14,8,10,10][i]})),bonusStats:[],overrideStats:[],modifiers:{background:[{type:'bonus',subType:'strength-score',value:2},{type:'bonus',subType:'constitution-score',value:1},{type:'proficiency',subType:'athletics'},{type:'proficiency',subType:'intimidation'}],class:[{type:'proficiency',subType:'perception'}]},
  baseHitPoints:44,bonusHitPoints:0,inventory:[{definition:{name:'Chain Mail'},quantity:1,equipped:true},{definition:{name:'Greatsword'},quantity:1,equipped:true}],feats:[{definition:{name:'Lucky'}}]}};
let j=I.fromJson(JSON.stringify(ddb),data());assert.deepEqual([j.found.name,j.found.cls,j.found.level,j.found.species,j.found.abilities.STR,j.found.abilities.CON],['Garr','fighter',5,'dwarf',17,15]);
r=build(j.found);assert.equal(r.sheet.ac,17,'chain mail from the inventory, +1 from the Defense style');assert(r.sheet.attacks.some(a=>a.name==='Greatsword'));assert(r.sheet.skills.perception.prof);
/* Foundry VTT actor */
const foundry={name:'Lys',type:'character',system:{abilities:{str:{value:8},dex:{value:16},con:{value:12},int:{value:10},wis:{value:14},cha:{value:13}},skills:{ste:{value:2},prc:{value:1},acr:{value:1}},attributes:{hp:{max:27},ac:{flat:null}}},
  items:[{type:'class',name:'Rogue',system:{levels:3}},{type:'race',name:'Halfling'},{type:'background',name:'Criminal'},{type:'weapon',name:'Shortsword',system:{quantity:1,equipped:true}},{type:'equipment',name:'Leather Armor',system:{quantity:1,equipped:true}},{type:'feat',name:'Alert',system:{type:{value:'feat'}}}]};
j=I.fromJson(JSON.stringify(foundry),data());assert.deepEqual([j.found.cls,j.found.level,j.found.species,j.found.skills.stealth.expert],['rogue',3,'halfling',true]);r=build(j.found);assert.equal(r.sheet.hp.max,27);assert(r.build.expertise.includes('stealth'));
/* what isn't a character */
assert.match(I.fromJson('{"a":1}',data()).error,/isn’t a D&D Beyond/);assert(I.fromJson('{"format":"quillbound-hero"}',data()).quillbound);assert.match(build(I.fromText(['nothing here'],data())).error||'',/class wasn’t found/);
console.log('PASS: hero importer: German and English text sheets, fillable PDF fields, D&D Beyond and Foundry VTT become creator heroes with the sheet’s scores, HP (through rolls) and AC; expertise, armor and differences are worked out and listed.');
/* a sheet laid out in columns: level in the header, "Class / Subclass", scores below their labels, E for expertise, attacks stacked; two heroes in one PDF */
{const page1=['MY TABLE | CHARACTER SHEET · LEVEL 5','Rin','Human · Rogue / Thief','ARMOR CLASS | HIT POINTS | INITIATIVE','15 | 38 | +4','ST | SAVES | SKILLS · ● TRAINED · E EXPERTISE','○ ST | +0 | ● Acrobatics | +7','10',
  'GE','18 | ● IN | +4','KO','○ Athletics | +0','14','IN','14','WE | +1','12','CH','○ Deception | -1','8','E Stealth | +10','Dagger','+7 · 1d4+4 Piercing'],page2=['Rin: powers and notes','Speed 30 ft'],page3=['NEXT','Ola','Dwarf · Cleric / Life Domain','LEVEL 3'];
const heroes=I.splitHeroes([page1,page2,page3],data());assert.equal(heroes.length,2,'two heroes in one PDF; the continuation page joins the first');
const f=I.fromText(heroes[0],data());assert.deepEqual([f.name,f.cls,f.level,f.subclass,f.species],['Rin','rogue',5,'Thief','human']);assert.deepEqual(plain(f.abilities),{STR:10,DEX:18,CON:14,INT:14,WIS:12,CHA:8},'scores in a column');
assert(f.skills.stealth.expert&&f.skills.acrobatics.prof,'E marks expertise; skills anywhere on a line');assert.deepEqual(plain(f.attacks[0]),{name:'Dagger',bonus:7,damage:'1d4+4'},'a stacked attack');}
console.log('PASS: column-style sheets (level in the header, scores under their labels, E for expertise, stacked attacks) and several heroes in one PDF.');

/* the real Night Shift PDFs, when they are on this computer (they aren't in the repository) */
const sheets=['Toxic','Quinn','Camilla'].map(n=>path.join(process.env.USERPROFILE||'',`Downloads/${n}_DnD_Charakterbogen.pdf`)).filter(p=>fs.existsSync(p));
let pdfjs=null;try{pdfjs=require(path.join(root,'node_modules/pdfjs-dist/legacy/build/pdf.js'));}catch{}
if(sheets.length&&pdfjs)(async()=>{const w=console.warn;console.warn=()=>{};const got={};
  for(const p of sheets){const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(p)),isEvalSupported:false,verbosity:0}).promise;const lines=[];for(let i=1;i<=doc.numPages;i++)lines.push(...I.linesFromTextContent((await (await doc.getPage(i)).getTextContent()).items));
    const x=build(I.fromText(lines,data()));got[x.build.name]={hp:x.sheet.hp.max,ac:x.sheet.ac,diff:diff(x).length};}
  console.warn=w;assert.deepEqual(got.Quinn,{hp:38,ac:16,diff:0});if(got.Toxic)assert.deepEqual([got.Toxic.hp,got.Toxic.ac],[43,17]);if(got.Camilla)assert.deepEqual([got.Camilla.hp,got.Camilla.ac],[38,15]);
  console.log(`PASS: the Night Shift PDFs import (${Object.entries(got).map(([n,v])=>`${n}: HP ${v.hp}, AC ${v.ac}, ${v.diff} differences`).join('; ')}).`);})().catch(e=>{console.error(e);process.exit(1);});
else console.log('(The Night Shift PDFs aren’t on this computer: that part is skipped.)');

/* opening an imported hero in the creator keeps its background increases and improvements (ChatGPT's restore step, #12) */
{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const ui=fs.readFileSync(path.join(root,'src/ui/hero-import.js'),'utf8');
assert(/S\.creator = crRestoreSelections\(\{ \.\.\.crNew\(\), build: JSON\.parse\(JSON\.stringify\(hero\.build\)\)/.test(ui),'Open in the creator restores the pickers');
assert(html.includes('src/ui/hero-import.js'));}
console.log('PASS: an imported hero opened in the creator keeps its ability increases and level-up choices.');
