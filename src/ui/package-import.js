let packageImportBusy = false;
async function cmRestoreZip(file, prepared) {
  if (packageImportBusy || S.role !== 'dm') return;
  packageImportBusy = true;
  const owner = S.campaigns?.current;
  try {
    toast('Reading campaign ZIP locally…');
    const { campaignPackage } = await import('../importer/package.js');
    const pack = prepared || await campaignPackage(file, QBCampaigns.parseCampaign);
    if (S.role !== 'dm' || S.campaigns?.current !== owner) throw Error('Campaign changed. Choose the ZIP again.');
    const dlg = openDialog('Import a campaign package', `<p>Restore a new campaign with its maps and PDFs. Your existing campaigns stay saved. Nothing is uploaded.</p><label class="f">Campaign<select id="package-choice">${pack.campaigns.map((c,i)=>`<option value="${i}">${esc(c.name)} — ${esc(c.path)}</option>`).join('')}</select></label><p>${pack.files.length} files found, including nested ZIP contents.</p><button class="btn primary" id="package-restore">Restore as a new campaign</button><p id="package-status" role="status"></p>`);
    dlg.querySelector('#package-restore').onclick = async e => {
      e.target.disabled = true;
      try {
        if (S.role !== 'dm' || S.campaigns?.current !== owner) throw Error('Campaign changed. Close this dialog and choose the ZIP again.');
        const selected = pack.campaigns[Number(dlg.querySelector('#package-choice').value)];
        const QB = window.QB || await import('../app/library-session.js');
        const media = pack.files.filter(f => /\.(pdf|png|jpe?g|webp|gif|bmp)$/i.test(f.path)).map(f => new File([f.blob], f.path));
        const library = await QB.addFileList(media);
        if (!dlg.isConnected || S.role !== 'dm' || S.campaigns?.current !== owner) throw Error('Campaign changed. Choose the ZIP again.');
        QBCampaigns.importCampaign(S, selected);
        S.importer = { lib: library, phase: 'library', pi: null, versions: {}, status: '' };
        S.tab = 'desk'; sceneMapsRetryMissing(); dlg.close(); render();
        toast('Campaign restored with its maps and PDFs. Linked player maps are ready.');
      } catch (error) { e.target.disabled = false; dlg.querySelector('#package-status').textContent = error.message; }
    };
  } catch (error) { toast(error.message); }
  finally { packageImportBusy = false; }
}
