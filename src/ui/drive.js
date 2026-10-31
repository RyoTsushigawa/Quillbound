const driveClient = QBDrive.client();
let driveScript, driveBusy = false, driveSession = 0;
function driveControls() { return '<div class="row"><button class="btn" data-act="drive-open">Google Drive assets & adventures…</button><span class="small muted">Import PDFs and maps into your library and Link adventures.</span></div>'; }
async function driveLoadIdentity() {
  if (window.google?.accounts?.oauth2) return;
  if (!driveScript) driveScript = new Promise((resolve,reject) => {
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.onload = resolve;
    script.onerror = () => { driveScript = null; reject(Error('Google sign-in could not load. Check your connection and browser settings.')); }; document.head.appendChild(script);
  });
  await driveScript;
}
function driveDialog() {
  if (S.role !== 'dm') return;
  const owner = S.campaigns?.current, session = ++driveSession;
  const active = () => dlg.isConnected && session === driveSession && S.role === 'dm' && owner === S.campaigns?.current;
  const configured = localStorage.getItem('quillbound-drive-client') || '';
  const dlg = openDialog('Google Drive library', `<p>Browse Drive, then choose which files to copy into Quillbound. Google grants read access to your Drive; this app only downloads files you choose. It never edits, uploads or deletes Drive files. The access token stays in memory and expires.</p>
    <details ${configured?'':'open'}><summary>Set up Google sign-in once</summary><p>The website owner must enable Google Drive API and create an OAuth <b>Web application</b> client in Google Cloud. Add <b>https://ryotsushigawa.github.io</b> as an authorized JavaScript origin. For a personal test, add your Google account as a test user on the consent screen and allow the Drive read-only scope.</p><p><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Open Google Cloud credentials</a> · <a href="GOOGLE_DRIVE_SETUP.md" target="_blank" rel="noopener noreferrer">Full setup instructions</a></p><label class="f">Public OAuth client ID<input id="drive-client-id" value="${esc(configured)}" placeholder="…apps.googleusercontent.com"></label><p>No client secret is needed. This public ID is saved only in this browser.</p></details>
    <div class="row"><button class="btn primary" id="drive-connect">Connect Google Drive</button><button class="btn" id="drive-disconnect">Disconnect</button></div>
    <details><summary>Firefox: sign in without the account chooser</summary><p>If Google fails after you select your account, enter its email here to ask Google to open that account directly. Google still handles sign-in and asks for permission. The email is used for this request only and is not saved.</p><label class="f">Google account email<input id="drive-account" type="email" autocomplete="off" placeholder="Your Google account email"></label><button class="btn" id="drive-connect-account">Connect this account (Firefox)</button></details>
    <div class="row"><label class="f">Search filenames across Drive<input id="drive-search" maxlength="200"></label><button class="btn" id="drive-find">Search</button><button class="btn" id="drive-home">My Drive</button><button class="btn" id="drive-back">Back</button></div>
    <p id="drive-status" role="status">${driveClient.connected()?'Connected. Open My Drive or search.':'Not connected. Complete setup, then connect.'}</p><div id="drive-files"></div><button class="btn" id="drive-more" style="display:none">More files</button><label><input type="checkbox" id="drive-read" ${S.tab==='desk' && S.deskView==='campaign'?'checked':''}> Read library adventures after import and open Link adventures</label><button class="btn primary" id="drive-import" disabled>Import selected files</button>
    <p>After importing PDFs, choose <b>Read all adventures for a campaign</b> in Import adventure, then return to <b>Link adventures</b>. Maps use the same preview and scene-link controls as local files. Reloading requires reconnecting to fetch source files again; saved adventure profiles and reviewed scene maps remain local.</p>`);
  const field = id => dlg.querySelector('#drive-' + id);
  let folder = 'root', history = [], page = '', rows = [], generation = 0;
  function status(message) { if(active()) field('status').textContent = message; }
  async function load(more = false) {
    if (!active()) return;
    const ticket = ++generation;
    status('Loading Drive filenames…');
    try {
      const result = await driveClient.list({folder,search:field('search').value,page:more?page:''});
      if (!active() || ticket !== generation) return;
      rows = more ? rows.concat(result.files || []) : result.files || []; page = result.nextPageToken || '';
      field('files').innerHTML = rows.filter(f=>f.mimeType===QBDrive.folderType || QBDrive.supported(f)).map(f=>f.mimeType===QBDrive.folderType?`<p><button class="btn sm" data-drive-folder="${esc(f.id)}">Open folder: ${esc(f.name)}</button></p>`:`<label class="f"><span><input type="checkbox" data-drive-file="${esc(f.id)}"> ${esc(f.name)}</span></label>`).join('') || '<p>No supported files in this page. Open another folder, search, or load more.</p>';
      field('more').style.display = page ? '' : 'none'; field('import').disabled = true; status('Choose PDFs, ZIPs or maps.');
      field('files').querySelectorAll('[data-drive-folder]').forEach(b=>b.onclick=()=>{history.push(folder);folder=b.dataset.driveFolder;field('search').value='';void load();});
      field('files').onchange=()=>{field('import').disabled=!field('files').querySelector('input:checked');};
    } catch(error) { status(error.message); }
  }
  async function connect(useAccount) {
    try {
      const id = field('client-id').value.trim(), email = useAccount ? field('account').value.trim() : '';
      if(useAccount && !email) throw Error('Enter your Google account email above, then click Connect this account (Firefox).');
      const config = QBDrive.signInConfig(id,email);
      if (!window.google?.accounts?.oauth2) { await driveLoadIdentity(); status('Google sign-in is ready. Click '+(useAccount?'Connect this account (Firefox)':'Connect Google Drive')+' again.'); return; }
      if(!active())return;
      localStorage.setItem('quillbound-drive-client', id);
      status('Waiting for Google sign-in'+(useAccount?' with the account chooser skipped':'')+'…');
      const client = google.accounts.oauth2.initTokenClient({...config,
        callback:response=>{if(!active())return;try{driveClient.authorize(response);void load();}catch(error){status(error.message);}},error_callback:error=>status(QBDrive.authError(error))});
      client.requestAccessToken();
    } catch(error) { status(error.message); }
  }
  field('connect').onclick=()=>void connect(false);
  field('connect-account').onclick=()=>void connect(true);
  field('disconnect').onclick=()=>{generation++;driveClient.disconnect();rows=[];field('files').innerHTML='';field('import').disabled=true;field('more').style.display='none';status('Disconnected. Local imports remain. Revoke access in your Google account permissions if desired.');};
  field('home').onclick=()=>{folder='root';history=[];field('search').value='';void load();};
  field('back').onclick=()=>{folder=history.pop()||'root';field('search').value='';void load();};
  field('find').onclick=()=>void load(); field('more').onclick=()=>void load(true);
  field('import').onclick=async e=>{
    if(driveBusy)return;driveBusy=true;e.target.disabled=true;
    try {
      const selected=[...field('files').querySelectorAll('input:checked')].map(x=>rows.find(f=>f.id===x.dataset.driveFile)), files=[], readAfter=field('read').checked;
      for(const source of selected){status('Downloading '+source.name+'…');const blob=await driveClient.download(source);if(!active())return;files.push(new File([blob],source.name));}
      if(!active() || !driveClient.connected())throw Error('Connect Drive again before importing.');
      if(files.length===1 && /\.zip$/i.test(files[0].name)) {
        const {campaignPackage}=await import('../importer/package.js');
        let prepared;
        try { prepared=await campaignPackage(files[0],QBCampaigns.parseCampaign); }
        catch(error) { if(!/No Quillbound campaign/.test(error.message))throw error; }
        if(!active() || !driveClient.connected())throw Error('Drive connection or campaign changed. Import again.');
        if(prepared){dlg.close();await cmRestoreZip(files[0],prepared);return;}
      }
      const QB=window.QB || await import('../app/library-session.js');
      const media=files.filter(f=>!/\.json$/i.test(f.name));
      const library=media.length?await QB.addFileList(media):S.importer.lib;
      if(!active() || !driveClient.connected())throw Error('Drive connection or campaign changed. Import again.');
      S.driveSources ??= [];
      for(const f of selected){const old=S.driveSources.findIndex(x=>x.id===f.id);const source={id:f.id,name:f.name,modifiedTime:f.modifiedTime||''};if(old<0)S.driveSources.push(source);else S.driveSources[old]=source;}
      S.importer.lib=library;S.importer.phase='library';sceneMapsRetryMissing();S.tab='import';dlg.close();render();
      const backup=files.find(f=>/\.json$/i.test(f.name));
      if(backup){const parsed=QBCampaigns.parseCampaign(await backup.text());if(parsed.error)toast(parsed.error);else if(S.role==='dm' && owner===S.campaigns?.current)clConfirm('Restore '+parsed.name+'?', 'This creates a new campaign and preserves the current one.',()=>{if(S.role!=='dm' || owner!==S.campaigns?.current)return;QBCampaigns.importCampaign(S,parsed);render();},'Restore');}
      else if(readAfter){await libReadAll();if(S.role==='dm' && owner===S.campaigns?.current){S.tab='desk';S.deskView='campaign';render();}}
      else toast('Files imported. Read the adventures to add them to Link adventures.');
    }catch(error){status(error.message);if(active())e.target.disabled=false;}finally{driveBusy=false;}
  };
}
