/* Combat-owned optional objectives; loaded before the main UI, using its globals on invocation. */
function combatObjectivesView(){
  if(!S.combat)return '';
  const d=EncounterDesign.init(S),l=Stakes.init(S),hero=S.party.find(p=>p.id===l.draft.actor);
  if(!d.objectives.length)return '';
  return `<section class="card stack" aria-label="Scene objectives"><h3>Ways to change the scene</h3><p class="small muted">Choose a hero, then an objective. Attempts use their normal action; progress changes only on confirm. These are suggestions, not the only things you can try.</p><div class="results">${d.objectives.map(o=>{
    const ready=EncounterDesign.objectiveReady(S,o.id,hero?.id),done=EncounterDesign.complete(o);
    return `<article class="card stack"><div class="row"><b>${esc(o.name)}</b><span class="chip">${EncounterDesign.progress(o)} / ${EncounterDesign.size(o)}</span></div><p>${esc(o.description||'')}</p>${o.zone&&o.zone!=='any'?`<p class="small">Where: ${esc(l.zones[o.zone])}</p>`:''}${o.success?`<details><summary>On completion · DM</summary><p>${esc(o.success)}</p><p class="small muted">Only progress is automatic. Apply these scene changes yourself.</p></details>`:''}<div class="row"><button class="btn sm primary" data-act="co-attempt" data-id="${esc(o.id)}" ${ready.ok?'':'disabled'}>${o.automatic?'Use action · no roll':'Attempt objective'}</button><button class="btn sm" data-act="co-edit" data-id="${esc(o.id)}" ${l.pending?'disabled':''}>Edit</button><button class="btn sm" data-act="co-share" data-id="${esc(o.id)}" ${l.pending?'disabled':''}>${o.shared?'Hide from players':'Review for players…'}</button></div>${!ready.ok?`<p class="small muted">${esc(done?'Complete.':ready.why)}</p>`:''}<details><summary>DM progress correction</summary><p class="small muted">For spells, roleplay or a correction. This does not spend a hero’s action.</p><button class="btn sm" data-act="co-adjust" data-id="${esc(o.id)}" data-delta="-1" ${l.pending?'disabled':''}>−</button> <button class="btn sm" data-act="co-adjust" data-id="${esc(o.id)}" data-delta="1" ${l.pending?'disabled':''}>+</button></details></article>`;
  }).join('')}</div></section>`;
}
function combatObjectiveDraftFields(d){
  if(d.mode==='enemy'||d.action!=='improvise'||d.effect!=='objective'||!d.objectiveId)return '';
  const o=EncounterDesign.objective(S,d.objectiveId);if(!o)return '';
  return `<fieldset class="stack"><legend>${esc(o.name)}</legend><label class="f">Approach<select aria-label="Objective ability" data-bind="combat.lite.draft.objectiveAbility" data-rerender>${(o.abilities||['INT']).map(k=>`<option value="${esc(k)}" ${d.objectiveAbility===k?'selected':''}>${esc(ABIL_NAME[k]||k)}</option>`).join('')}</select></label><label><input type="checkbox" data-bind="combat.lite.draft.objectiveTrained" data-rerender ${d.objectiveTrained?'checked':''}> Add proficiency for this approach (DM judgment)</label><label class="f">Skill or tool check bonus from the sheet (optional)<input type="number" min="-40" max="40" step="1" data-bind="combat.lite.draft.objectiveBonus" data-rerender value="${esc(d.objectiveBonus??'')}"></label><p class="small muted">Leave blank to use the chosen ability and proficiency checkbox. Enter the sheet’s full bonus when a skill, expertise or tool applies.</p></fieldset>`;
}
function objectiveCheckBonus(s,d,p){return d.mode!=='enemy'&&d.action==='improvise'&&d.effect==='objective'&&d.objectiveId&&d.objectiveBonus!==''&&d.objectiveBonus!==undefined?Number(d.objectiveBonus):Stakes.bonus(p,d.ability,d.trained);}
function combatCheckSummary(s,d,p){
  const manual=d.mode!=='enemy'&&d.action==='improvise'&&d.effect==='objective'&&d.objectiveId&&d.objectiveBonus!==''&&d.objectiveBonus!==undefined;
  return `<p class="lt-sheet">${manual?'Declared skill / tool check':esc(ABIL_NAME[d.ability]||d.ability)+(d.trained?' + proficiency':'')} <b>${fmt(objectiveCheckBonus(s,d,p))}</b><span>${manual?'Uses the full check bonus entered above.':'The selected action chooses the ability; an objective lets the DM choose its approach.'}</span></p>`;
}
function combatObjectiveResult(p){
  if(p.mode==='enemy'||p.action!=='improvise'||p.effect!=='objective'||!p.objectiveId)return '';
  const o=EncounterDesign.objective(S,p.objectiveId);if(!o)return '';
  return `<p><b>${esc(o.name)}:</b> ${['crit','success','mixed'].includes(p.band)?'Confirm adds one progress, including on a mixed success.':'No progress on this result.'}</p>`;
}
function combatObjectiveActions(){return {
  'co-table-action':()=>{if(rdBusy())return;const id=Stakes.init(S).draft.actor,a=Stakes.actor(S,id);if(!a)return;rdDialog('Record an action resolved at the table',`<p>${esc(a.name)} uses their normal action. Resolve the spell, saving throws and resources at the table; apply HP or conditions with the normal correction controls.</p>`+rdField('co-table-note','What happened?','','textarea'),dlg=>Stakes.manualAction(S,id,rdValue(dlg,'co-table-note')));},
  'co-attempt':d=>combatRun(()=>{const o=EncounterDesign.objective(S,d.id),id=Stakes.init(S).draft.actor;if(o?.automatic)EncounterDesign.automaticObjective(S,d.id,id);else EncounterDesign.chooseObjective(S,d.id,id);}),
  'co-adjust':d=>combatRun(()=>EncounterDesign.adjustObjective(S,d.id,Number(d.delta))),
  'co-edit':d=>{if(rdBusy())return;const design=EncounterDesign.init(S),old=design.objectives.find(o=>o.id===d.id),o=old||{name:'',description:'',zone:'any',abilities:['INT'],size:1,requires:[]};
    rdDialog(old?'Edit scene objective':'Prepare a scene objective',rdField('co-name','Objective',o.name)+rdField('co-description','What does success accomplish?',o.description,'textarea')+rdField('co-stakes','What is at risk?',o.stakes||'','textarea')+rdField('co-success','On completion: changes for the DM to apply',o.success||'','textarea')+`<label class="f">Where<select id="co-zone">${['any','cover','center','objective'].map(z=>`<option value="${z}" ${o.zone===z?'selected':''}>${esc(z==='any'?'Any area':Stakes.init(S).zones[z])}</option>`).join('')}</select></label><p>Possible abilities</p><div class="row">${['STR','DEX','CON','INT','WIS','CHA'].map(k=>`<label><input type="checkbox" id="co-${k}" ${o.abilities.includes(k)?'checked':''}> ${k}</label>`).join('')}</div>`+rdField('co-size','Successful actions needed (1–12)',o.size)+`<label><input type="checkbox" id="co-automatic" ${o.automatic?'checked':''}> Uses an action without a roll (only when the outcome is certain)</label>${design.objectives.filter(x=>x!==old).length?'<p>Complete these first:</p>'+design.objectives.filter(x=>x!==old).map(x=>`<label><input type="checkbox" id="co-requires-${esc(x.id)}" ${(o.requires||[]).includes(x.id)?'checked':''}> ${esc(x.name)}</label>`).join(''):''}`,dlg=>{
      const name=rdValue(dlg,'co-name'),description=rdValue(dlg,'co-description'),size=Number(rdValue(dlg,'co-size')),abilities=['STR','DEX','CON','INT','WIS','CHA'].filter(k=>dlg.querySelector('#co-'+k).checked);
      if(!name||!description||!abilities.length||!Number.isInteger(size)||size<1||size>12)throw Error('Give a name, a concrete outcome, at least one ability and 1–12 successful actions.');
      const requires=design.objectives.filter(x=>x!==old&&dlg.querySelector('#co-requires-'+x.id)?.checked).map(x=>x.id);
      const reaches=(id,target,seen=new Set())=>id===target||!seen.has(id)&&(seen.add(id),(design.objectives.find(x=>x.id===id)?.requires||[]).some(n=>reaches(n,target,seen)));
      if(old&&requires.some(id=>reaches(id,old.id)))throw Error('These prerequisites create a loop. Choose a different order.');
      Stakes.remember(S);const value={id:old?.id||uid('objective'),name:name.slice(0,100),description:description.slice(0,2000),zone:rdValue(dlg,'co-zone'),abilities,size,filled:Math.min(size,Number(o.filled)||0),requires,automatic:dlg.querySelector('#co-automatic').checked,stakes:rdValue(dlg,'co-stakes').slice(0,500),success:rdValue(dlg,'co-success').slice(0,2000),shared:!!o.shared,publicName:o.publicName||''};
      if(old)Object.assign(old,value);else design.objectives.push(value);
    });
  },
  'co-share':d=>{if(rdBusy())return;const o=EncounterDesign.objective(S,d.id);if(!o)return;if(o.shared){Stakes.remember(S);o.shared=false;return;}
    rdDialog('Review objective for players',rdField('co-public','Public objective title',o.publicName||o.name)+`<p class="small muted">Only this title and progress are shared. The solution, prerequisites, checks and DM notes stay private.</p>`,dlg=>{const title=rdValue(dlg,'co-public');if(!title)throw Error('Give a title players can see.');Stakes.remember(S);o.publicName=title.slice(0,150);o.shared=true;});
  }
};}
