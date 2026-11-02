let packageImportBusy = false;
async function cachePackageMaps(beats, library, source) {
  const seen = new Set(), files = SceneMaps.candidates(library);
  for (const beat of beats || []) {
    const ref = SceneMaps.reference(beat.playerMap);
    if (!ref || seen.has(ref.key)) continue;
    seen.add(ref.key);
    if (SceneMaps.imageUrl((await SceneMaps.assets.get(ref.key))?.url)) continue;
    for (const file of files.filter(f => f.name === ref.fileName)) {
      const image = await source.blobFor(file.pi, file.path);
      if (image.dm || await SceneMaps.fingerprint(image.blob) !== ref.key) continue;
      await SceneMaps.assets.put({key:ref.key,url:await SceneMaps.pixels(image.blob)}); break;
    }
  }
}
async function cmRestoreZip(file, prepared) {
  if (packageImportBusy || S.role !== 'dm') return;
  packageImportBusy = true;
  const owner = S.campaigns?.current;
  try {
    toast('Reading campaign ZIP locally…');
    const { campaignPackage } = await import('../importer/package.js');
    let pack = prepared;
    if (!pack) {
      try { pack = await campaignPackage(file, QBCampaigns.parseCampaign); }
      catch (error) {
        // Not a backup, such as a map pack or a VTT module: its maps and PDFs still belong in the library.
        if (!/No Quillbound campaign backup/.test(error.message)) throw error;
        const QB = window.QB || await import('../app/library-session.js'), library = await QB.addFileList([file]);
        if (S.role !== 'dm' || S.campaigns?.current !== owner) return;
        S.importer = { lib: library, phase: 'library', pi: null, versions: {}, status: '' };
        S.tab = 'import'; render(); toast('Added to your library. Open a book there and choose Read this adventure; its maps are ready to link.');
        return;
      }
    }
    if (S.role !== 'dm' || S.campaigns?.current !== owner) throw Error('Campaign changed. Choose the ZIP again.');
    const dlg = openDialog('Import a campaign package', `<p>Add this package to the current campaign to play it with your party and connected players, or restore it as its own campaign. Its maps and PDFs come along. Nothing you have now is replaced, and nothing is uploaded.</p><label class="f">Campaign<select id="package-choice">${pack.campaigns.map((c,i)=>`<option value="${i}">${esc(c.name)} — ${esc(c.path)}</option>`).join('')}</select></label><p>${pack.files.length} files found, including nested ZIP contents.</p><div class="row"><button class="btn primary" id="package-adventure">Add to this campaign as an adventure</button><button class="btn" id="package-restore">Restore as a new campaign</button></div><p id="package-status" role="status"></p>`);
    const restore = asAdventure => async e => {
      e.target.disabled = true;
      try {
        if (S.role !== 'dm' || S.campaigns?.current !== owner) throw Error('Campaign changed. Close this dialog and choose the ZIP again.');
        const selected = pack.campaigns[Number(dlg.querySelector('#package-choice').value)];
        const QB = window.QB || await import('../app/library-session.js');
        const media = pack.files.filter(f => /\.(pdf|png|jpe?g|webp|gif|bmp)$/i.test(f.path)).map(f => new File([f.blob], f.path));
        const library = await QB.addFileList(media);
        await cachePackageMaps(selected.data.beats, library, QB);
        if (!dlg.isConnected || S.role !== 'dm' || S.campaigns?.current !== owner) throw Error('Campaign changed. Choose the ZIP again.');
        if (asAdventure) cmAdoptAdventure(selected); else QBCampaigns.importCampaign(S, selected);
        S.importer = { lib: library, phase: 'library', pi: null, versions: {}, status: '' };
        S.tab = asAdventure ? 'campaigns' : 'desk'; sceneMapsRetryMissing(); dlg.close(); render();
        if (!asAdventure) toast('Campaign restored with its maps and PDFs. Linked player maps are ready.');
      } catch (error) { e.target.disabled = false; dlg.querySelector('#package-status').textContent = error.message; }
    };
    dlg.querySelector('#package-restore').onclick = restore(false);
    dlg.querySelector('#package-adventure').onclick = restore(true);
  } catch (error) { toast(error.message); }
  finally { packageImportBusy = false; }
}
