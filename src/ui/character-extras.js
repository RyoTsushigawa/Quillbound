function characterTraining(sheet){
 const p=sheet.proficiencies;if(!p)return '';
 // A named weapon adds nothing beside its whole category, and training the DM granted is already in the lists.
 const gear=Object.values(QBHeroRules.data().equipment),group={simple:'Simple Weapons',martial:'Martial Weapons'};
 const weapons=p.weapons.filter(x=>!p.weapons.includes(group[gear.find(e=>e.name===x)?.group])),other=p.granted.filter(x=>![...p.weapons,...p.armor,...p.tools].includes(x));
 const row=(label,list)=>list.length?'<div><dt>'+label+'</dt><dd>'+esc(list.join(', '))+'</dd></div>':'';
 return '<dl class="training-list small">'+row('Weapons',weapons)+row('Armor & shields',p.armor)+row('Tools',p.tools)+row('Other training',other)+'</dl>';
}
// One companion or item: a chip line up top, its long text below. With foldKey the text stays closed until asked for.
function characterEntry(name,chips,text,foldKey){
 const line=chips.filter(Boolean).map(([label,tone])=>'<span class="chip'+(tone?' '+tone:'')+'">'+esc(label)+'</span>').join('');
 const head='<b class="entry-name">'+esc(name)+'</b>'+(line?'<span class="entry-chips">'+line+'</span>':'');
 const body=text?'<p class="entry-text small">'+esc(text)+'</p>':'';
 return foldKey&&body?'<details class="character-entry" data-hero-disclosure="'+esc(foldKey)+'"><summary>'+head+'</summary>'+body+'</details>':'<article class="character-entry"><div class="entry-head">'+head+'</div>'+body+'</article>';
}
function characterCompanions(sheet,foldKey){return (sheet.companions || []).map((p,i)=>characterEntry(p.name,[p.kind&&[p.kind],p.ac!==null&&['AC '+p.ac],p.hp!==null&&['HP '+p.hp],p.speed&&[p.speed]],p.notes,foldKey&&foldKey+'-companion-'+i)).join('');}
function creatorCompanions(c){return `<details class="card"><summary>Companions & Familiars (${c.build.companions?.length || 0})</summary><p class="small muted">Companions are saved and exported with this character. You clarify actions and permission to have a familiar at the table.</p>${(c.build.companions || []).map(p=>`<div class="row"><b>${esc(p.name)}</b><button class="btn sm" data-act="cr-companion-edit" data-id="${esc(p.id)}">Edit</button><button class="btn sm" data-act="cr-companion-remove" data-id="${esc(p.id)}">Remove</button></div>`).join('')}<div class="row"><button class="btn" data-act="cr-companion-new">Add companion</button><button class="btn" data-act="cr-companion-madame">Add Madame Croissant</button></div></details>`;}
const COMPANION_MADAME={name:'Madame Croissant',kind:'Familiar · winzige himmlische Taube',ac:12,hp:5,speed:'3 m; Flug 18 m',notes:'ST 2 · GE 14 · KO 10 · IN 12 · WE 14 · CH 14. Wahrnehmung +4, Menschenkenntnis +4; passive Wahrnehmung 14.\nVersteht Gemeinsprache. Telepathische Verständigung mit ihrer gebundenen Person innerhalb von 30 m.\nAltert nicht, benötigt keine Nahrung, besteht aber auf Gebäck. Bei 0 TP verschwindet sie in warmen Krümeln; Rückkehr über erneute Beschwörung.\nKann nicht angreifen. Helfen nur, wenn die üblichen Voraussetzungen erfüllt sind.\nKrümelkorrespondenz: einmal pro langer Rast bis zu zehn Wörter in vorhandene Krümel schreiben.\nPersönlichkeit: trocken, klug, herrisch; vergibt Schnabelabdrücke statt Lob.'};
// partyId: the DM gives a familiar straight to an adventure hero, as Give item does.
function creatorCompanionDialog(id,madame=false,partyId=null){
 const holder=partyId?(S.party || []).find(p=>p.id===partyId):null,owner=S.campaigns?.current;
 if(partyId&&(S.role!=='dm'||!holder?.build))return;
 const creator=holder?null:crState(),build=holder?.build || creator.build,list=build.companions || [],old=list.find(p=>p.id===id);
 if(!old&&list.length>=10){toast("Up to ten companions per character.");return;}
 const p=old || (madame?COMPANION_MADAME:{name:'',kind:'Familiar',ac:null,hp:null,speed:'',notes:''});
 const input=(key,label,value,type='text')=>`<label class="f">${label}<input id="companion-${key}" type="${type}" value="${esc(value??'')}"></label>`;
 const dlg=openDialog(holder?'Give familiar · '+holder.name:"Enter companion",(holder?'<button class="btn sm" id="companion-madame">Fill in Madame Croissant</button>':'')+input('name','Name',p.name)+input('kind','Type / role',p.kind)+input('ac',"Armor Class",p.ac,'number')+input('hp','Maximum hit points',p.hp,'number')+input('speed','Speed',p.speed)+`<label class="f">Abilities, bond and personality<textarea id="companion-notes" rows="8" maxlength="4000">${esc(p.notes)}</textarea></label><p class="small muted">${holder?(holder.cloudLink?'This familiar syncs with the connected player.':'Use a player update file to share this familiar.'):'Then save the character with “Save changes”.'}</p><button class="btn primary" id="companion-save">${holder?'Give familiar':'Add companion'}</button>`);
 if(holder)dlg.querySelector('#companion-madame').onclick=()=>{for(const key of ['name','kind','ac','hp','speed','notes'])dlg.querySelector('#companion-'+key).value=COMPANION_MADAME[key];};
 dlg.querySelector('#companion-save').onclick=()=>{
  if(holder?(S.role!=='dm'||owner!==S.campaigns?.current||!(S.party || []).includes(holder)||holder.build!==build):crState()!==creator){toast("The opened character has changed.");return;}
  const value=key=>dlg.querySelector('#companion-'+key).value.trim(),name=value('name');if(!name){toast("Please enter a name.");return;}
  const ac=value('ac')===''?null:Number(value('ac')),hp=value('hp')===''?null:Number(value('hp'));
  if(ac!==null&&(!Number.isInteger(ac)||ac<0||ac>40)||hp!==null&&(!Number.isInteger(hp)||hp<1||hp>1000)){toast("AC: whole number from 0–40; HP: whole number from 1–1000. You can also leave these blank.");return;}
  const next={id:old?.id || uid('companion'),name:name.slice(0,100),kind:value('kind').slice(0,100),ac,hp,speed:value('speed').slice(0,100),notes:value('notes').slice(0,4000)};
  build.companions??=[];if(old)build.companions[build.companions.indexOf(old)]=next;else build.companions.push(next);dlg.close();render();if(holder)toast(next.name+' given to '+holder.name+'.');
 };
}
function characterExtrasActions(){return {'companion-give':d=>creatorCompanionDialog(null,false,d.id),'cr-companion-new':()=>creatorCompanionDialog(),'cr-companion-madame':()=>creatorCompanionDialog(null,true),'cr-companion-edit':d=>creatorCompanionDialog(d.id),'cr-companion-remove':d=>{const b=crState().build;b.companions=(b.companions || []).filter(p=>p.id!==d.id);}};}
