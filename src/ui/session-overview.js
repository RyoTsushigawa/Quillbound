let overviewLegacy = false, overviewPreviewGeneration = 0, overviewScrollPending = false;
if(typeof document!=='undefined')document.addEventListener('click',event=>{
  const link=event.target.closest('.ov-reading-nav a');
  if(link?.getAttribute('href')==='#ov-details'){const panel=document.getElementById('ov-details');if(panel)panel.open=true;}
});
if(typeof document!=='undefined')document.addEventListener('keydown',event=>{
  const tab=event.target.closest('.ov-speakers [role="tab"]');if(!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tabs=[...tab.parentElement.querySelectorAll('[role="tab"]')],index=tabs.indexOf(tab);
  const next=tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];
  event.preventDefault();const id=next.id;next.click();document.getElementById(id)?.focus();
});
const overviewReference = b => b.reference === true || b.kind === 'reference' || /^(?:SL(?:\s*[:\-])|DM\s*[:\-]|GM\s*[:\-])/i.test(b.title || '');
function overviewSections(text) {
  const sections = []; let section = {title:'Scene briefing',lines:[]};
  for (const line of String(text || '').split(/\r?\n/)) {
    const heading = line.match(/^\s*#{1,6}\s+(.+)/);
    if (heading) { if(section.lines.length) sections.push(section); section={title:heading[1],lines:[]}; }
    else section.lines.push(line);
  }
  if(section.lines.length) sections.push(section);
  return sections;
}
function overviewText(text) {
  return String(text || '').split(/\n\s*\n/).filter(x=>x.trim()).map(p=>{
    const quote = /^\s*>/.test(p);
    return `<${quote?'blockquote':'p'}>${esc(p.replace(/^\s*>\s?/gm,'')).replace(/\n/g,'<br>')}</${quote?'blockquote':'p'}>`;
  }).join('');
}
function overviewNpc(n, open = false) {
  const fields=[['Wants',n.wants],['Knows',n.knows],['Under pressure',n.pressed],['Private secret',n.secret]];
  const body=`${n.line?`<blockquote class="ov-npc-line">${esc(n.line)}</blockquote>`:''}${n.voice||n.manner?`<div class="ov-delivery"><span class="ov-label">Play them like this</span>${overviewText([n.voice,n.manner].filter(Boolean).join('\n\n'))}</div>`:''}<dl class="rp">${fields.filter(([,v])=>v).map(([k,v])=>`<div class="${k==='Private secret'?'ov-secret':''}"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${n.look||n.fears?`<details><summary>Appearance & fears</summary>${overviewText([n.look,n.fears].filter(Boolean).join('\n\n'))}</details>`:''}<div class="row">${eye('npcs',n)}</div>`;
  const title=`<b>${esc(n.name)}</b><span class="small muted">${esc(n.role || '')}</span>`;
  return open?`<article class="ov-npc ov-present"><h4>${title}</h4>${body}</article>`:`<details class="ov-npc"><summary>${title}</summary>${body}</details>`;
}
function overviewFlowNotes(beat, sections) {
  const block=s=>`<section class="ov-flow-block"><h4>${esc(s.title)}</h4>${overviewText(s.lines.join('\n'))}</section>`;
  if(overviewReference(beat))return sections.map(block).join('');
  const personal=sections.filter(s=>/Auge einer Diebin|Menschenkennerin|Technik und Tiere/i.test(s.title));
  const intro=sections.find(s=>s.title==='Scene briefing');
  const candidates=sections.filter(s=>s!==intro && !personal.includes(s));
  const core=candidates.filter(s=>!/^Privat:|^Für zwei|^Für drei|^Für vier|^Für fünf|^Gegnerwerte|^Optionale|^Kein Suchzwang/i.test(s.title)).slice(0,3);
  const clues=candidates.filter(s=>/Raum und sichtbarer|Hinweise staffeln|^Ziel und Raum|^Auftrag und Einsatz/i.test(s.title)).slice(0,2);
  const shown=[...new Set([...core,...clues])];
  const extra=sections.filter(s=>s!==intro && !shown.includes(s) && !personal.includes(s));
  const opening=intro?overviewText(intro.lines.filter(l=>!/^KARTE:/i.test(l)).join('\n')):'';
  return `<nav class="ov-reading-nav" aria-label="Briefing shortcuts">${opening?'<a href="#ov-opening">Opening</a>':''}<a href="#ov-running">Run the scene</a>${personal.length?'<a href="#ov-clues">Character clues</a>':''}${extra.length?'<a href="#ov-details">Rules & alternatives</a>':''}</nav>${opening?`<div class="ov-opening" id="ov-opening"><h3>Set the scene</h3>${opening}</div>`:''}<div id="ov-running"><h3>What happens here</h3>${shown.map(block).join('') || '<p>Use the scene briefing above.</p>'}</div>${personal.length?`<div class="ov-personal" id="ov-clues"><h3>Give these characters their clues</h3>${personal.map(block).join('')}</div>`:''}${extra.length?`<details class="ov-notes" id="ov-details"><summary>More detail: alternatives, consequences & rules (${extra.length})</summary>${extra.map(block).join('')}</details>`:''}`;
}
function sessionOverview(legacy) {
  const beats=S.beats || [], locations=beats.filter(b=>!overviewReference(b)), references=beats.filter(overviewReference);
  const current=sceneMapContext().beat, selected=beats.find(b=>b.id===S.dmFocusId) || current || locations[0] || references[0];
  const nav=b=>`<div class="ov-place-row"><button class="ov-place ${b.id===selected?.id?'selected':''}" data-act="${overviewReference(b)?'desk-focus':'desk-go'}" data-id="${esc(b.id)}" aria-pressed="${b.id===selected?.id}"><span>${esc(b.title)}</span><small>${b.id===current?.id?'Players here':b.status==='done'?'Revisit':'Enter location'}</small></button>${!overviewReference(b)?`<button class="ov-peek" data-act="desk-focus" data-id="${esc(b.id)}" title="Preview notes without moving players" aria-label="Preview ${esc(b.title)}">Preview</button>`:''}</div>`;
  const mentionScore=n=>{
    if(!selected || !n.name)return 0;
    if(selected.npcIds?.includes(n.id))return 3;
    const name=String(n.name).toLowerCase(), title=String(selected.title || '').toLowerCase(), text=String(selected.summary || '').toLowerCase();
    if(title.includes(name))return 2;
    return text.includes(name) || name.split(/\s+/).filter(x=>x.length>=4).some(x=>text.includes(x)) ? 1 : 0;
  };
  const mentioned=n=>mentionScore(n)>0;
  const npcs=[...(S.npcs || [])].sort((a,b)=>mentionScore(b)-mentionScore(a));
  const speaker=npcs.find(n=>n.id===S.dmNpcId) || npcs[0];
  const ref=SceneMaps.reference(selected?.playerMap), sections=overviewSections(selected?.summary);
  const next=locations.slice(locations.indexOf(selected)+1).find(b=>b.status!=='done');
  const continueButton=next && selected?.id===current?.id?`<button class="btn primary" data-act="desk-continue" data-id="${esc(selected.id)}" data-next="${esc(next.id)}">Finish & continue: ${esc(next.title)}</button>`:'';
  const sceneQuestion=selected?.question && (selected===locations[0] || !locations.every(b=>b.question===selected.question))?selected.question:'';
  const sceneTransition=selected?.transition && !(locations.length>1 && locations.every(b=>b.transition===selected.transition))?selected.transition:'';
  let preparation=''; overviewLegacy=true; try{preparation=legacy();}finally{overviewLegacy=false;}
  const brief=selected?`<section class="card ov-scene"><div class="eyebrow">${overviewReference(selected)?'Private reference':selected.id===current?.id?'Current location':'Preview · players have not moved'}</div><h2>${esc(selected.title)}</h2>
    <div class="row ov-scene-actions">${!overviewReference(selected)?`${selected.id===current?.id?'<span class="ov-live">Players are here</span>':`<button class="btn primary" data-act="desk-go" data-id="${esc(selected.id)}">Move players here</button>`}<button class="btn sm" data-act="desk-finish" data-id="${esc(selected.id)}">${selected.status==='done'?'Mark available':'Mark finished'}</button>`:''}${eye('beats',selected)}</div>${continueButton?`<div class="ov-next-top">${continueButton}</div>`:''}
    ${!overviewReference(selected)?`<div class="ov-map"><div class="ov-map-head"><span class="ov-label">${ref?(ref.auto?'Automatic player map':'Manual player map'):'Map not ready'}</span>${ref?`<button class="btn sm" data-act="desk-map-zoom" data-id="${esc(selected.id)}">Enlarge map</button>`:''}</div><p class="small muted">${ref?esc(ref.title):sceneMapHint(selected)?'Waiting for '+esc(sceneMapHint(selected))+'. Load your map ZIP in Import adventure to link it automatically.':'No player map named in this scene. Choose one under Map controls.'}</p><img id="overview-map" alt="Private preview of the linked player map" style="display:none"><p id="overview-map-status" class="small muted">${ref?'Loading saved map…':''}</p><details><summary>Map controls & manual display</summary>${sceneMapControls(selected)}</details></div>`:''}
    ${sceneQuestion?`<p class="ov-callout"><b>Scene question:</b> ${esc(sceneQuestion)}</p>`:''}${sceneTransition?`<p class="ov-callout"><b>Where next:</b> ${esc(sceneTransition)}</p>`:''}
    ${overviewFlowNotes(selected,sections)}${selected.readAloud?.length?`<details class="ov-notes"><summary>All read-aloud passages & player display</summary>${selected.readAloud.map(x=>overviewText(typeof x==='string'?x:x.text || '')).join('')}<button class="btn sm" data-act="spot-text" data-id="${esc(selected.id)}">Review read-aloud for player screen</button></details>`:''}
    ${selected.branches?.length?`<div class="ov-flow-block"><h4>Choices & alternative routes</h4>${selected.branches.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}${next && selected.id===current?.id?`<div class="ov-continue"><button class="btn primary" data-act="desk-continue" data-id="${esc(selected.id)}" data-next="${esc(next.id)}">Finish & continue: ${esc(next.title)}</button><p class="small muted">Next in your notes. You can also enter any location from the list.</p></div>`:''}</section>`:'<section class="card"><h2>No scenes yet</h2><p>Import an adventure or restore a campaign ZIP to prepare the session.</p><button class="btn" data-act="tab" data-v="import">Import adventure</button></section>';
  return `<div class="pagehead ov-session-head"><div><div class="eyebrow">DM desk · Session overview</div><p class="ov-now">${current?'Players: '+esc(current.title):'Choose a starting location'} <span class="ov-progress">${locations.filter(b=>b.status==='done').length}/${locations.length} scenes finished</span></p></div>${deskToggle()}</div>
    ${securityMeter()}<div class="ov-grid"><nav class="card ov-nav" aria-label="Scene navigation"><h3>Locations</h3><p class="small muted">Click a location to move the players. Preview lets you read ahead.</p>${locations.map(nav).join('') || '<p>No locations yet.</p>'}${references.length?`<details class="ov-references"><summary>Reference notes (${references.length})</summary>${references.map(nav).join('')}</details>`:''}</nav>
    <main class="ov-main">${brief}<details class="card ov-support"><summary>Leads & prepared encounters</summary>${(S.hooks || []).map(h=>`<p><b>${esc(h.title || 'Lead')}:</b> ${esc(h.text)}</p>`).join('')}${(S.encounters || []).map(e=>`<div class="ov-enc"><b>${esc(e.name)}</b><p class="small">${esc(e.where)} · ${esc(e.goal)}</p><button class="btn sm" data-act="enc-run" data-id="${esc(e.id)}">Start this fight</button></div>`).join('') || '<p>No prepared fights.</p>'}</details></main>
    <aside class="card ov-people"><div class="ov-label">Roleplay at a glance</div><h3>Who is speaking?</h3><div class="ov-speakers" role="tablist" aria-label="NPC roleplay helpers">${npcs.map(n=>`<button role="tab" aria-selected="${n.id===speaker?.id}" aria-controls="ov-speaker-panel" id="ov-speaker-${esc(n.id)}" data-act="desk-speaker" data-id="${esc(n.id)}">${esc(n.name)}${mentioned(n)?'<span class="ov-mentioned" title="Mentioned in these notes"> ·</span>':''}</button>`).join('')}</div>${speaker?`<div id="ov-speaker-panel" role="tabpanel" aria-labelledby="ov-speaker-${esc(speaker.id)}">${overviewNpc(speaker,true)}</div><p class="small muted">A dot marks a name mentioned in these notes. You decide who is present.</p>`:'<p>No NPCs imported yet.</p>'}</aside></div>
    <details class="card ov-preparation"><summary>Preparation tools & complete campaign notes</summary><p class="small muted">Full scene list, NPC notes, leads, encounter builder, maps, treasure and party tools.</p>${preparation}</details>`;
}
async function sessionOverviewHydrate() {
  if(overviewScrollPending){overviewScrollPending=false;if(typeof location!=='undefined' && location.hash.startsWith('#ov-'))history.replaceState(history.state,'',location.pathname+location.search);document.querySelector('.ov-scene')?.scrollIntoView?.({block:'start',behavior:'auto'});}
  const image=document.getElementById('overview-map'), status=document.getElementById('overview-map-status');
  const ticket=++overviewPreviewGeneration;
  if(!image || !status || S.role!=='dm')return;
  const campaign=S.campaigns?.current, beat=(S.beats || []).find(b=>b.id===S.dmFocusId) || sceneMapContext().beat || (S.beats || []).find(b=>!overviewReference(b));
  const ref=SceneMaps.reference(beat?.playerMap);if(!ref)return;
  try{const asset=await sceneMapImage(ref);if(ticket!==overviewPreviewGeneration || !image.isConnected || S.role!=='dm' || campaign!==S.campaigns?.current)return;image.src=asset.url;image.style.display='block';status.textContent='Map ready · saved in this browser';}
  catch(error){if(ticket===overviewPreviewGeneration && status.isConnected)status.textContent='Preview unavailable. Load the original map library or choose a player map.';}
}
function sessionOverviewActions() { return {
  'desk-speaker':d=>{if((S.npcs || []).some(n=>n.id===d.id))S.dmNpcId=d.id;},
  'desk-map-zoom':async d=>{const beat=S.beats.find(b=>b.id===d.id),ref=SceneMaps.reference(beat?.playerMap),campaign=S.campaigns?.current,focus=S.dmFocusId,token=sceneMapContext().token;if(!ref)return;try{const asset=await sceneMapImage(ref);if(S.role!=='dm' || S.campaigns?.current!==campaign || S.dmFocusId!==focus || sceneMapContext().token!==token || !S.beats.includes(beat))return;openDialog(ref.title,`<p class="small muted">Private DM preview. The player screen has not changed.</p><img src="${esc(asset.url)}" alt="Enlarged player map preview" style="width:100%;max-height:75vh;object-fit:contain">`,{wide:true});}catch(error){toast('Map unavailable. Load the original map library again.');}},
  'desk-focus':d=>{if(S.beats.some(b=>b.id===d.id)){S.dmFocusId=d.id;delete S.dmNpcId;overviewScrollPending=true;}},
  'desk-go':d=>{const b=S.beats.find(x=>x.id===d.id);if(!b || overviewReference(b))return;for(const other of S.beats)if(other.id!==b.id && other.status==='active')other.status='upcoming';b.status='active';S.sceneMapSceneId=b.id;S.dmFocusId=b.id;delete S.dmNpcId;overviewScrollPending=true;},
  'desk-continue':d=>{const b=S.beats.find(x=>x.id===d.id), next=S.beats.find(x=>x.id===d.next);if(!b || b.status!=='active' || !next || overviewReference(next))return;b.status='done';sessionOverviewActions()['desk-go']({id:next.id});},
  'desk-finish':d=>{const b=S.beats.find(x=>x.id===d.id);if(b)b.status=b.status==='done'?'upcoming':'done';}
}; }
