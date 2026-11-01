// The printable character sheet: German and English labels, the sheet's numbers, homebrew heroes, safe text.
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');const root=path.join(__dirname,'..');
const ctx=vm.createContext({crypto:require('crypto').webcrypto});for(const f of ['srd-heroes','phb-feats','srd-spells','hero-rules','homebrew','table-homebrew','sheet-export'])vm.runInContext(fs.readFileSync(path.join(root,'src/app',f+'.js'),'utf8'),ctx);
const R=ctx.QBHeroRules,B=ctx.QBHomebrew,Q=ctx.QBSheet,T=ctx.QB_TABLE_HOMEBREW;
R.setHomebrew(B.forCreator(T,{}));const b={...R.quickBuild('bard','Camilla <b>',5),species:'hb-sp-night-shift-vampire'};const s=R.derive(b);
const de=Q.html(s,{lang:'de',story:{want:'Ruhm'}}),en=Q.html(s,{lang:'en'});
assert(de.includes('Rüstungsklasse')&&de.includes('Überreden')&&de.includes('Seite 1')&&de.includes('Mittelgroß'),'German labels and skill names');
assert(en.includes('Armor Class')&&en.includes('Persuasion')&&!en.includes('Rüstungsklasse'),'English labels');
assert(de.includes(`<div class="ps-v">${s.ac}</div>`)&&de.includes(`<div class="ps-v">${s.hp.max}</div>`),'AC and HP from the sheet');
assert(de.includes('Claws')&&de.includes('Bite'),'homebrew species attacks');assert(!de.includes('Camilla <b>')&&de.includes('Camilla &lt;b&gt;'),'names are escaped');
assert(de.includes('Ruhm')&&de.includes('Quillbound · direkt am Tisch'),'story and the table rules');
assert.equal((de.match(/class="ps-pg"/g)||[]).length,2,'two pages');R.setHomebrew(null);
console.log('PASS: character sheets print in German or English with the sheet’s numbers, homebrew attacks, the story and the table rules; names are escaped.');
b.training=['longbow'];b.companions=[{id:'madame',name:'Madame Croissant',kind:'Familiar',ac:12,hp:5,speed:'Flug 18 m',notes:'Kann nicht angreifen. <script>bad()</script>'}];const familiarSheet=R.derive(b),familiarPrint=Q.html(familiarSheet,{lang:'de'});assert(familiarSheet.proficiencies.weapons.includes('Longbow'));assert(familiarSheet.proficiencies.granted.includes('Longbow'));assert(familiarPrint.includes('Übungen &amp; Training')||familiarPrint.includes('Übungen & Training'));assert(familiarPrint.includes('Madame Croissant'));assert(familiarPrint.includes('Begleiter & Familiars'));assert(!familiarPrint.includes('<script>bad()'));
console.log('PASS: explicit weapon/armor/tool training and escaped companion details appear on the printable sheet.');
