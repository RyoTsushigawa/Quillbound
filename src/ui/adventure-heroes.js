// Private campaign editing and explicit hero-file handoff. No campaign data is broadcast.
function adventureHeroButtons(p){return `<span class="row">${p.build?`<button class="btn sm" data-act="adventure-hero-edit" data-id="${esc(p.id)}">Edit character</button><button class="btn sm" data-act="adventure-hero-export" data-id="${esc(p.id)}">Player update file</button>`:''}<button class="btn sm ghost" data-act="cm-delmember" data-id="${esc(p.id)}">Remove</button></span>`;}
function adventureHeroPanel(){return `<details class="card ov-adventure-heroes" id="adventure-characters"><summary>Adventure characters · ${S.party?.length || 0}</summary><p class="small muted">Edit this adventure’s copies. Send a player update file so its owner can review and apply permanent sheet changes in My heroes. Current combat HP and conditions stay at the table.</p>${(S.party || []).map(p=>`<div class="row hb-item"><span><b>${esc(p.name)}</b> · ${esc(p.cls)} ${p.level || 1}${p.sheetDraft?' · draft':''}</span>${adventureHeroButtons(p)}</div>`).join('') || '<p>No characters in this adventure yet.</p>'}<button class="btn sm" data-act="rd-sheets">Table stats & subclass notes</button></details>`;}
function adventureHeroEdit(id){
 if(S.role!=='dm')return;const p=(S.party || []).find(p=>p.id===id);if(!p?.build)return;
 document.getElementById('app-dialog')?.close?.();
 S.creator=crRestoreSelections({...crNew(),build:JSON.parse(JSON.stringify({...p.build,name:p.name})),story:{...crNew().story,...p.heroStory,want:p.want || ''},partyId:p.id,partyCampaign:S.campaigns.current,step:'review'});S.tab='create';
}
function adventureHeroSave(){
 const c=crState(),p=(S.party || []).find(p=>p.id===c.partyId);
 if(S.role!=='dm' || S.campaigns.current!==c.partyCampaign || !p){toast('The adventure changed. Reopen the character from its adventure.');return;}
 if(S.combat){toast('Finish the current encounter before changing the character build.');return;}
 const sheet=crSheet(c);if(!c.build.name.trim()){toast('Finish the open choices first.');return;}
 crKeepHomebrew(c.build);const build=JSON.parse(JSON.stringify(c.build)),before=cmSheet(p.build),next=QBHeroRules.toHero(build,sheet,{...p});
 // Keep existing table adjustments when that derived value was not changed by the edit.
 if(before){if(before.ac===sheet.ac)next.ac=p.ac;if(before.hp.max===sheet.hp.max)next.hp=p.hp;if(before.skills.perception.bonus===sheet.skills.perception.bonus)next.perceptionBonus=p.perceptionBonus;}
 next.sheetDraft=sheet.open.length>0;next.hpNow=Math.min(p.hpNow ?? next.hp,next.hp);next.name=c.build.name.trim();next.want=c.story.want;next.heroStory={...c.story};
 S.party[S.party.indexOf(p)]=next;S.creator=crNew();S.tab='desk';S.deskView='session';toast(next.name+' updated in this adventure. My heroes copies were not overwritten.');
}
function adventureHeroExport(id){
 if(S.role!=='dm')return;const p=(S.party || []).find(p=>p.id===id);if(!p?.build)return;
 const hero={id:p.fromPlayer || p.myHeroId || ('adv-'+S.campaigns.current+'-'+p.id),build:JSON.parse(JSON.stringify({...p.build,name:p.name})),story:{...crNew().story,...p.heroStory,want:p.want || ''}};
 crKeepHomebrew(hero.build);saveFile((p.name || 'hero').replace(/[^\w-]+/g,'-')+'.adventure-update.json',QBCampaigns.heroFile(hero),'Player update saved. Send it to the character’s owner.');
}
function adventureUpdateReview(text,id){
 const parsed=QBCampaigns.parseHero(text,b=>cmSheet(b)),target=cmHero(id);if(parsed.error){toast(parsed.error);return;}if(!target){toast('Choose the saved hero to update.');return;}
 const incoming=parsed.hero,old=cmSheet(target.build),sheet=parsed.sheet,expected=JSON.stringify({build:target.build,story:target.story});
 const dlg=openDialog('Review adventure update',`<p>Update <b>${esc(target.build.name)}</b> with <b>${esc(incoming.name)}</b> from this file?</p><p>Current: level ${old?.level || '?'} ${esc(old?.cls || '')}, AC ${old?.ac || '?'}, HP ${old?.hp?.max || '?'}.<br>Incoming: level ${sheet.level} ${esc(sheet.cls)}, AC ${sheet.ac}, HP ${sheet.hp.max}.</p><p>Permanent character choices and story answers will be replaced. Current combat HP and conditions are not part of this update. Your previous version will be kept for Restore previous version.</p><button class="btn primary" id="adventure-update-apply">Apply update</button>`);
 dlg.querySelector('#adventure-update-apply').onclick=()=>{if(cmHero(id)!==target || JSON.stringify({build:target.build,story:target.story})!==expected){toast('This hero changed. Reopen the update review.');return;}target.previousVersion={build:JSON.parse(JSON.stringify(target.build)),story:{...target.story},saved:target.saved};target.build=JSON.parse(JSON.stringify(incoming.build));target.story={...incoming.story};target.saved=Date.now();dlg.close();render();toast('Adventure update applied.');};
}
function adventureHeroActions(){return {'adventure-hero-edit':d=>adventureHeroEdit(d.id),'adventure-hero-save':adventureHeroSave,'adventure-hero-export':d=>adventureHeroExport(d.id),'hero-restore-previous':d=>{const hero=cmHero(d.id);if(!hero?.previousVersion)return;clConfirm('Restore previous version of '+hero.build.name+'?','This replaces the saved character sheet with the version kept before its last adventure update.',()=>{if(cmHero(d.id)!==hero || !hero.previousVersion)return;const previous=hero.previousVersion;delete hero.previousVersion;Object.assign(hero,previous);hero.saved=Date.now();},'Restore');}};}

function heroConfirmLeave(tab){
 const c=S.creator;if(S.tab!=='create' || tab==='create' || !c?.heroId)return false;
 const saved=cmHero(c.heroId);if(!saved)return false;
 if(JSON.stringify(c.build)===JSON.stringify(saved.build) && JSON.stringify({...crNew().story,...c.story})===JSON.stringify({...crNew().story,...saved.story}))return false;
 const dlg=openDialog('Save your character changes?', '<p>Your equipment, background, training and story edits have not been saved to My heroes yet.</p><div class="row"><button class="btn primary" id="hero-leave-save">Save changes & continue</button><button class="btn" id="hero-leave-keep">Keep editing</button><button class="btn ghost" id="hero-leave-discard">Discard these edits</button></div>');
 dlg.querySelector('#hero-leave-save').onclick=()=>{ACT['cr-savehero']();if(S.creator===c)return;S.tab=tab;dlg.close();render();};
 dlg.querySelector('#hero-leave-keep').onclick=()=>dlg.close();
 dlg.querySelector('#hero-leave-discard').onclick=()=>{S.creator=crNew();S.tab=tab;dlg.close();render();};return true;
}
