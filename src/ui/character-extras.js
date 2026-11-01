function characterTraining(sheet){
 const p=sheet.proficiencies;if(!p)return '';
 return `<div class="small"><p><b>Weapons:</b> ${esc(p.weapons.join(', ') || '—')}</p><p><b>Armor & shields:</b> ${esc(p.armor.join(', ') || '—')}</p><p><b>Tools:</b> ${esc(p.tools.join(', ') || '—')}</p>${p.granted.length?`<p><b>Additional training / feats:</b> ${esc(p.granted.join(', '))}</p>`:''}</div>`;
}
function characterCompanions(sheet){return (sheet.companions || []).map(p=>`<article><h4>${esc(p.name)}</h4><p>${esc(p.kind)}${p.ac!==null?' · AC '+p.ac:''}${p.hp!==null?' · HP '+p.hp:''}${p.speed?' · '+esc(p.speed):''}</p><p class="small" style="white-space:pre-wrap">${esc(p.notes)}</p></article>`).join('');}
function creatorCompanions(c){return `<details class="card"><summary>Companions & Familiars (${c.build.companions?.length || 0})</summary><p class="small muted">Companions are saved and exported with this character. You clarify actions and permission to have a familiar at the table.</p>${(c.build.companions || []).map(p=>`<div class="row"><b>${esc(p.name)}</b><button class="btn sm" data-act="cr-companion-edit" data-id="${esc(p.id)}">Edit</button><button class="btn sm" data-act="cr-companion-remove" data-id="${esc(p.id)}">Remove</button></div>`).join('')}<div class="row"><button class="btn" data-act="cr-companion-new">Add companion</button><button class="btn" data-act="cr-companion-madame">Add Madame Croissant</button></div></details>`;}
function creatorCompanionDialog(id,madame=false){
 const creator=crState(),list=creator.build.companions || [],old=list.find(p=>p.id===id);
 if(!old&&list.length>=10){toast("Up to ten companions per character.");return;}
 const p=old || (madame?{name:'Madame Croissant',kind:'Familiar · winzige himmlische Taube',ac:12,hp:5,speed:'3 m; Flug 18 m',notes:'ST 2 · GE 14 · KO 10 · IN 12 · WE 14 · CH 14. Wahrnehmung +4, Menschenkenntnis +4; passive Wahrnehmung 14.\nVersteht Gemeinsprache. Telepathische Verständigung mit ihrer gebundenen Person innerhalb von 30 m.\nAltert nicht, benötigt keine Nahrung, besteht aber auf Gebäck. Bei 0 TP verschwindet sie in warmen Krümeln; Rückkehr über erneute Beschwörung.\nKann nicht angreifen. Helfen nur, wenn die üblichen Voraussetzungen erfüllt sind.\nKrümelkorrespondenz: einmal pro langer Rast bis zu zehn Wörter in vorhandene Krümel schreiben.\nPersönlichkeit: trocken, klug, herrisch; vergibt Schnabelabdrücke statt Lob.'}:{name:'',kind:'Familiar',ac:null,hp:null,speed:'',notes:''});
 const input=(key,label,value,type='text')=>`<label class="f">${label}<input id="companion-${key}" type="${type}" value="${esc(value??'')}"></label>`;
 const dlg=openDialog("Enter companion",input('name','Name',p.name)+input('kind','Type / role',p.kind)+input('ac',"Armor Class",p.ac,'number')+input('hp','Maximum hit points',p.hp,'number')+input('speed','Speed',p.speed)+`<label class="f">Abilities, bond and personality<textarea id="companion-notes" rows="8" maxlength="4000">${esc(p.notes)}</textarea></label><p class="small muted">Then save the character with “Save changes”.</p><button class="btn primary" id="companion-save">Add companion</button>`);
 dlg.querySelector('#companion-save').onclick=()=>{
  if(crState()!==creator){toast("The opened character has changed.");return;}
  const value=key=>dlg.querySelector('#companion-'+key).value.trim(),name=value('name');if(!name){toast("Please enter a name.");return;}
  const ac=value('ac')===''?null:Number(value('ac')),hp=value('hp')===''?null:Number(value('hp'));
  if(ac!==null&&(!Number.isInteger(ac)||ac<0||ac>40)||hp!==null&&(!Number.isInteger(hp)||hp<1||hp>1000)){toast("AC: whole number from 0–40; HP: whole number from 1–1000. You can also leave these blank.");return;}
  const next={id:old?.id || uid('companion'),name:name.slice(0,100),kind:value('kind').slice(0,100),ac,hp,speed:value('speed').slice(0,100),notes:value('notes').slice(0,4000)};
  creator.build.companions??=[];if(old)creator.build.companions[creator.build.companions.indexOf(old)]=next;else creator.build.companions.push(next);dlg.close();render();
 };
}
function characterExtrasActions(){return {'cr-companion-new':()=>creatorCompanionDialog(),'cr-companion-madame':()=>creatorCompanionDialog(null,true),'cr-companion-edit':d=>creatorCompanionDialog(d.id),'cr-companion-remove':d=>{const b=crState().build;b.companions=(b.companions || []).filter(p=>p.id!==d.id);}};}
