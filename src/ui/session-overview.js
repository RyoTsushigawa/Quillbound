let overviewLegacy = false, overviewPreviewGeneration = 0;
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
  const fields=[['Opening line',n.line],['Wants',n.wants],['Voice / delivery',n.voice],['Gesture',n.manner],['When pressed',n.pressed]];
  const privateFields=[['Appearance',n.look],['Knows',n.knows],['Fears',n.fears],['Secret',n.secret]];
  return `<details class="ov-npc" ${open?'open':''}><summary><b>${esc(n.name)}</b><span class="small muted">${esc(n.role || '')}</span></summary><dl class="rp">${fields.filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><details><summary>Knowledge & private notes</summary><dl class="rp">${privateFields.filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></details><div class="row">${eye('npcs',n)}</div></details>`;
}
function sessionOverview(legacy) {
  const beats=S.beats || [], locations=beats.filter(b=>!overviewReference(b)), references=beats.filter(overviewReference);
  const current=sceneMapContext().beat, selected=beats.find(b=>b.id===S.dmFocusId) || current || locations[0] || references[0];
  const nav=b=>`<button class="ov-place ${b.id===selected?.id?'selected':''}" data-act="desk-focus" data-id="${esc(b.id)}" aria-pressed="${b.id===selected?.id}"><span>${esc(b.title)}</span><small>${b.id===current?.id?'Players here':b.status==='done'?'Finished':overviewReference(b)?'Reference':'Available'}</small></button>`;
  const mentionScore=n=>{
    if(!selected || !n.name)return 0;
    if(selected.npcIds?.includes(n.id))return 3;
    const name=String(n.name).toLowerCase(), title=String(selected.title || '').toLowerCase(), text=String(selected.summary || '').toLowerCase();
    if(title.includes(name))return 2;
    return text.includes(name) || name.split(/\s+/).filter(x=>x.length>=4).some(x=>text.includes(x)) ? 1 : 0;
  };
  const mentioned=n=>mentionScore(n)>0;
  const npcs=[...(S.npcs || [])].sort((a,b)=>mentionScore(b)-mentionScore(a));
  const ref=SceneMaps.reference(selected?.playerMap), sections=overviewSections(selected?.summary);
  let preparation=''; overviewLegacy=true; try{preparation=legacy();}finally{overviewLegacy=false;}
  const brief=selected?`<section class="card ov-scene"><div class="eyebrow">${overviewReference(selected)?'Private reference':selected.id===current?.id?'Current location':'Preview · players have not moved'}</div><h2>${esc(selected.title)}</h2>
    <div class="row">${!overviewReference(selected)?`<button class="btn primary" data-act="desk-go" data-id="${esc(selected.id)}" ${selected.id===current?.id?'disabled':''}>${selected.id===current?.id?'Players are here':'Move players here'}</button><button class="btn" data-act="desk-finish" data-id="${esc(selected.id)}">${selected.status==='done'?'Mark available':'Mark finished'}</button>`:''}${eye('beats',selected)}</div>
    ${!overviewReference(selected)?`<div class="ov-map"><p class="small muted">${ref?'Linked player map · '+esc(ref.title):'No automatic player map linked. Choose one below to enable map changes.'}</p><img id="overview-map" alt="Private preview of the linked player map" style="display:none"><p id="overview-map-status" class="small muted"></p>${sceneMapControls(selected)}</div>`:''}
    ${selected.question?`<p class="ov-callout"><b>Scene question:</b> ${esc(selected.question)}</p>`:''}${selected.transition?`<p class="ov-callout"><b>Where next:</b> ${esc(selected.transition)}</p>`:''}
    ${selected.readAloud?.length?`<details class="ov-notes"><summary>Read aloud to the players</summary>${selected.readAloud.map(x=>overviewText(typeof x==='string'?x:x.text || '')).join('')}<button class="btn sm" data-act="spot-text" data-id="${esc(selected.id)}">Review read-aloud for player screen</button></details>`:''}
    <h3>Run this scene</h3>${sections.map((s,i)=>`<details class="ov-notes" ${i===0 && !overviewReference(selected)?'open':''}><summary>${esc(s.title)}</summary>${overviewText(s.lines.join('\n'))}</details>`).join('') || '<p>No scene notes yet.</p>'}
    ${selected.branches?.length?`<details class="ov-notes"><summary>Choices & alternative routes</summary>${selected.branches.map(x=>`<p>${esc(x)}</p>`).join('')}</details>`:''}</section>`:'<section class="card"><h2>No scenes yet</h2><p>Import an adventure or restore a campaign ZIP to prepare the session.</p><button class="btn" data-act="tab" data-v="import">Import adventure</button></section>';
  return `<div class="pagehead"><div><div class="eyebrow">DM desk · Session overview</div><h2>${current?'Players: '+esc(current.title):'Choose a starting location'}</h2><p>Preview a location, then choose Move players here to make it current and switch its linked player map.</p></div>${deskToggle()}</div>
    <div class="ov-grid"><nav class="card ov-nav" aria-label="Scene navigation"><h3>Locations</h3><p class="small muted">Previewing does not change the player screen.</p>${locations.map(nav).join('') || '<p>No locations yet.</p>'}${references.length?`<details class="ov-references"><summary>Reference notes (${references.length})</summary>${references.map(nav).join('')}</details>`:''}</nav>
    <main class="ov-main">${brief}<details class="card ov-support"><summary>Leads & prepared encounters</summary>${(S.hooks || []).map(h=>`<p><b>${esc(h.title || 'Lead')}:</b> ${esc(h.text)}</p>`).join('')}${(S.encounters || []).map(e=>`<div class="ov-enc"><b>${esc(e.name)}</b><p class="small">${esc(e.where)} · ${esc(e.goal)}</p><button class="btn sm" data-act="enc-run" data-id="${esc(e.id)}">Start this fight</button></div>`).join('') || '<p>No prepared fights.</p>'}</details></main>
    <aside class="card ov-people"><h3>NPC roleplay helpers</h3><p class="small muted">${npcs.some(mentioned)?'People mentioned in these notes are listed first. Mention does not confirm who is present.':'All campaign NPCs. Open a name for delivery, motive and reactions.'}</p>${npcs.map((n,i)=>overviewNpc(n,i===0 && mentioned(n))).join('') || '<p>No NPCs imported yet.</p>'}</aside></div>
    <details class="card ov-preparation"><summary>Preparation tools & complete campaign notes</summary><p class="small muted">Full scene list, NPC notes, leads, encounter builder, maps, treasure and party tools.</p>${preparation}</details>`;
}
async function sessionOverviewHydrate() {
  const image=document.getElementById('overview-map'), status=document.getElementById('overview-map-status');
  const ticket=++overviewPreviewGeneration;
  if(!image || !status || S.role!=='dm')return;
  const campaign=S.campaigns?.current, beat=(S.beats || []).find(b=>b.id===S.dmFocusId) || sceneMapContext().beat || (S.beats || []).find(b=>!overviewReference(b));
  const ref=SceneMaps.reference(beat?.playerMap);if(!ref)return;
  try{const asset=await sceneMapImage(ref);if(ticket!==overviewPreviewGeneration || !image.isConnected || S.role!=='dm' || campaign!==S.campaigns?.current)return;image.src=asset.url;image.style.display='block';}
  catch(error){if(ticket===overviewPreviewGeneration && status.isConnected)status.textContent='Preview unavailable. Load the original map library or choose a player map.';}
}
function sessionOverviewActions() { return {
  'desk-focus':d=>{if(S.beats.some(b=>b.id===d.id))S.dmFocusId=d.id;},
  'desk-go':d=>{const b=S.beats.find(x=>x.id===d.id);if(!b || overviewReference(b))return;for(const other of S.beats)if(other.id!==b.id && other.status==='active')other.status='upcoming';b.status='active';S.sceneMapSceneId=b.id;S.dmFocusId=b.id;},
  'desk-finish':d=>{const b=S.beats.find(x=>x.id===d.id);if(b)b.status=b.status==='done'?'upcoming':'done';}
}; }
