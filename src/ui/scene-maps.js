/* DM reviews a map once. Activating a linked scene can then display only those reviewed pixels. */
let sceneMapController, sceneMapProblem = '', sceneMapOwner = '', sceneMapManualRevision = 0;
function sceneMapContext() {
  const chosen = (S.beats || []).find(b => b.id === S.sceneMapSceneId && b.status === 'active') || (S.beats || []).find(b => b.status === 'active');
  return { beat: chosen, token: String(S.campaigns?.current || '') + ':' + String(chosen?.id || '') + ':' + JSON.stringify(chosen?.playerMap || null) };
}
async function sceneMapImage(ref) {
  let image;
  try { image = await SceneMaps.assets.get(ref.key); } catch (error) { if (!window.QB) throw error; }
  if (SceneMaps.imageUrl(image?.url)) return image;
  // Backups carry an exact filename and checksum, never a guess based on a room's name.
  const matches = SceneMaps.candidates(S.importer?.lib).filter(f => f.name === ref.fileName);
  for (const file of matches) {
    const source = await QB.blobFor(file.pi, file.path);
    if (source.dm || await SceneMaps.fingerprint(source.blob) !== ref.key) continue;
    image = { key: ref.key, url: await SceneMaps.pixels(source.blob) };
    await SceneMaps.assets.put(image); return image;
  }
  throw new Error('Import the original image or choose a new player map.');
}
function sceneMapsSync() {
  if (!sceneMapController) sceneMapController = SceneMaps.controller({
    getImage: sceneMapImage,
    current: token => S.role === 'dm' && sceneMapContext().token === token,
    clear: () => { playerSpotlight = null; sceneMapProblem = ''; },
    show: image => { playerSpotlight = image; publishPlayer(true); },
    missing: ref => { sceneMapProblem = 'Map unavailable: ' + ref.fileName + '. Import the original image or choose a new player map.'; if (typeof render === 'function') render(); toast(sceneMapProblem); }
  });
  if (S.role !== 'dm') { sceneMapController.pause(); sceneMapOwner = ''; return; }
  const context = sceneMapContext();
  // A role/campaign change must cancel in-flight pixels before they can reach the other table.
  if (!sceneMapOwner) sceneMapController.reset();
  sceneMapOwner = context.token;
  return sceneMapController.activate(context.token, context.beat?.playerMap);
}
function sceneMapsPause() { sceneMapController?.pause(); return { revision: ++sceneMapManualRevision, context: sceneMapContext().token }; }
function sceneMapsCurrent(ticket) { return ticket?.revision === sceneMapManualRevision && ticket.context === sceneMapContext().token && S.role === 'dm'; }
function sceneMapsRetryMissing() { sceneMapController?.retryMissing(); }
function sceneMapControls(beat) {
  const ref = SceneMaps.reference(beat.playerMap);
  return `<div style="grid-column:2" class="row"><button class="btn sm" data-act="scene-map" data-id="${esc(beat.id)}">${ref ? 'Player map…' : 'Choose player map…'}</button>${ref ? `<span class="small muted">${esc(ref.title)} · ${ref.auto ? 'shows when active' : 'manual display'}</span><button class="btn sm" data-act="scene-map-show" data-id="${esc(beat.id)}">Show linked map</button>` : ''}${beat.status === 'active' && sceneMapProblem ? `<p class="small cl-error">${esc(sceneMapProblem)}</p>` : ''}</div>`;
}
async function sceneMapDialog(id) {
  const beat = S.beats.find(b => b.id === id); if (!beat) return;
  const campaign = S.campaigns?.current, ref = SceneMaps.reference(beat.playerMap), files = SceneMaps.candidates(S.importer?.lib);
  const hint = ref?.fileName || String(beat.summary || '').match(/^KARTE:\s*([^\r\n]+\.(?:png|jpe?g|webp))\s*$/mi)?.[1] || '';
  const match = files.filter(f => f.name === hint);
  let selected;
  const dlg = openDialog('Player map for ' + beat.title, `<p>Choose an image and check it for secrets. Only this reviewed image and the title below can be shown automatically.</p>
    <label class="f">Map from the loaded library<select id="scene-map-file"><option value="">Choose an image…</option>${files.map((f,i) => `<option value="${i}">${esc(f.name)} — ${esc(f.product)}</option>`).join('')}</select></label>
    <label class="btn">Choose an image from this device…<input type="file" id="scene-map-local" accept="image/png,image/jpeg,image/webp" hidden></label>
    <p class="small muted">GM-labelled images are excluded. You can reuse one player map for several scenes. Saved images remain in this browser after a reload.</p>
    <img id="scene-map-preview" alt="Player map preview" style="display:none;max-width:100%;max-height:40vh;object-fit:contain">
    <p id="scene-map-status" role="status"></p><label class="f">Title players will see<input id="scene-map-title" value="${esc(ref?.title || beat.player?.title || beat.title)}" maxlength="200"></label>
    <label><input type="checkbox" id="scene-map-auto" ${!ref || ref.auto ? 'checked' : ''}> Show this map when this scene becomes active</label>
    <p class="small muted">A campaign backup keeps the link, not the image. On another browser, import the same maps once to reconnect them.</p>
    <div class="row"><button class="btn primary" id="scene-map-save" disabled>Save reviewed player map</button>${ref ? '<button class="btn" id="scene-map-remove">Unlink map</button>' : ''}</div>`);
  const field = id => dlg.querySelector('#scene-map-' + id);
  let previewGeneration = 0;
  async function preview(source) {
    const ticket = ++previewGeneration; selected = null; field('save').disabled = true;
    field('preview').style.display = 'none'; field('status').textContent = 'Loading preview…';
    try {
      if (SceneMaps.dmFile(source)) throw new Error('Choose a player version, not a GM-labelled image.');
      const blob = source.blob, key = source.key || await SceneMaps.fingerprint(blob), url = source.url || await SceneMaps.pixels(blob);
      if (ticket !== previewGeneration || !dlg.isConnected) return;
      if (!SceneMaps.imageUrl(url)) throw new Error('This image could not be read.');
      selected = { key, url, name: source.name };
      field('preview').src = url; field('preview').style.display = 'block'; field('status').textContent = 'Check the image above before saving.'; field('save').disabled = false;
    } catch (error) { if (ticket === previewGeneration) field('status').textContent = error.message; }
  }
  field('file').onchange = async () => {
    const f = files[field('file').value]; if (!f || !window.QB) return;
    const ticket = ++previewGeneration; selected = null; field('save').disabled = true;
    try { const source = await QB.blobFor(f.pi, f.path); if (ticket === previewGeneration) await preview({ ...source, name: f.name }); }
    catch (error) { if (ticket === previewGeneration) field('status').textContent = error.message; }
  };
  field('local').onchange = () => { const blob = field('local').files[0]; if (blob) void preview({ blob, name: blob.name }); };
  field('save').onclick = async () => {
    if (!selected || campaign !== S.campaigns?.current || !S.beats.includes(beat)) return;
    const title = field('title').value.trim(); if (!title) { field('title').focus(); return; }
    const image = selected, reviewGeneration = previewGeneration, automatic = field('auto').checked;
    field('save').disabled = true;
    try {
      await SceneMaps.assets.put(image);
      if (!dlg.isConnected || selected !== image || previewGeneration !== reviewGeneration || campaign !== S.campaigns?.current || !S.beats.includes(beat)) return;
      beat.playerMap = { key: image.key, fileName: image.name, title, auto: automatic, reviewed: true };
      sceneMapController?.reset(); dlg.close(); render(); toast('Player map linked to this scene.');
    } catch (error) { field('save').disabled = false; field('status').textContent = error.message; }
  };
  if (ref) field('remove').onclick = () => { delete beat.playerMap; sceneMapController?.reset(); playerSpotlight = null; dlg.close(); render(); };
  if (match.length === 1) { field('file').value = String(files.indexOf(match[0])); void field('file').onchange(); }
  else if (ref) {
    try { const image = await SceneMaps.assets.get(ref.key); if (image && dlg.isConnected && !selected && previewGeneration === 0) void preview({ ...image, name: ref.fileName }); }
    catch (error) { if (dlg.isConnected) field('status').textContent = error.message; }
  }
}
async function sceneMapShow(id) {
  const beat = S.beats.find(b => b.id === id), ref = SceneMaps.reference(beat?.playerMap), campaign = S.campaigns?.current;
  if (!ref) return;
  const ticket = sceneMapsPause();
  try {
    const image = await sceneMapImage(ref);
    if (!sceneMapsCurrent(ticket) || campaign !== S.campaigns?.current || !S.beats.includes(beat)) return;
    playerSpotlight = { type:'image', title:ref.title, url:image.url }; publishPlayer(true); toast('Linked map shown.');
  } catch (error) { toast('Map unavailable. Import the original image or choose a new player map.'); }
}
