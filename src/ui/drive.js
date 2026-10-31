const driveClient = QBDrive.client();
let driveScript, driveBusy = false, driveSession = 0, driveResume = null;
function driveImportFeedback(){
  const report=S.importer?.driveReport, read=S.importer?.readReport;
  if(!report && !read)return '';
  const failed=(report?.failed || []).length+(read?.failed || []).length;
  const groups=(S.importer.lib?.products || []).flatMap(p=>p.groups || []),maps=new Set(groups.filter(g=>g.kind==='map').flatMap(g=>(g.files || []).filter(f=>!f.copyOf).map(f=>f.path))),copies=groups.flatMap(g=>g.files || []).filter(f=>f.copyOf).length;
  return `<details class="card" id="import-summary"><summary>Last import${report?' · '+report.ready+' files ready':''}${read?' · '+read.ready+' adventures read':''}${failed?' · '+failed+' need attention':''}</summary>${report?`<p>${report.ready} files downloaded. ${report.failed.length} downloads failed.</p>${report.failed.map(f=>`<p><b>${esc(f.name)}:</b> ${esc(f.error)}</p>`).join('')}${report.failed.length?'<button class="btn sm" data-act="drive-open">Retry downloads in Google Drive…</button>':''}`:''}${read?`<p>${read.ready} adventures read. ${read.failed.length} could not be read.</p>${read.failed.map(f=>`<p><b>${esc(f.name)}:</b> ${esc(f.error)}</p>`).join('')}${read.failed.length?'<button class="btn sm" data-act="lib-retry-read">Retry unread adventures</button>':''}`:''}${S.importer.lib?`<p>Current library: ${maps.size} map files · ${copies} duplicate files set aside · ${S.importer.lib.mirrors?.length || 0} unpacked ZIP copies set aside.</p>`:''}<p class="small muted">Downloaded files can be reused while this page stays open. After reloading, reconnect and select the original files again.</p></details>`;
}
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
  if (driveBusy) { toast('A Drive import is running. Finish or cancel it before reopening Drive.'); return; }
  const owner = S.campaigns?.current, session = ++driveSession;
  if(driveResume?.owner!==owner)driveResume=null;
  const active = () => dlg.isConnected && session === driveSession && S.role === 'dm' && owner === S.campaigns?.current;
  const configured = localStorage.getItem('quillbound-drive-client') || '';
  const dlg = openDialog('Google Drive library', `<p>Browse Drive, then choose which files to copy into Quillbound. Google grants read access to your Drive; this app only downloads files you choose. It never edits, uploads or deletes Drive files. The access token stays in memory and expires.</p>
    <details ${configured?'':'open'}><summary>Set up Google sign-in once</summary><p>The website owner must enable Google Drive API and create an OAuth <b>Web application</b> client in Google Cloud. Add <b>https://ryotsushigawa.github.io</b> as an authorized JavaScript origin. For a personal test, add your Google account as a test user on the consent screen and allow the Drive read-only scope.</p><p><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Open Google Cloud credentials</a> · <a href="GOOGLE_DRIVE_SETUP.md" target="_blank" rel="noopener noreferrer">Full setup instructions</a></p><label class="f">Public OAuth client ID<input id="drive-client-id" value="${esc(configured)}" placeholder="…apps.googleusercontent.com"></label><p>No client secret is needed. This public ID is saved only in this browser.</p></details>
    <div class="row"><button class="btn primary" id="drive-connect">Connect Google Drive</button><button class="btn" id="drive-disconnect">Disconnect</button></div>
    <details><summary>Firefox: try a specific Google account</summary><p>If Google fails after you select your account, enter its email here to suggest that account. Google may still show its account chooser and asks for permission. The email is used for this request only and is not saved.</p><label class="f">Google account email<input id="drive-account" type="email" autocomplete="off" placeholder="Your Google account email"></label><button class="btn" id="drive-connect-account">Connect this account (Firefox)</button></details>
    <div class="row"><label class="f">Search filenames across Drive<input id="drive-search" maxlength="200"></label><button class="btn" id="drive-find">Search</button><button class="btn" id="drive-home">My Drive</button><button class="btn" id="drive-shared">Shared with me</button><button class="btn" id="drive-all">All accessible files</button></div>
    <div class="row"><label class="f">Open a shared Drive file or folder link<input id="drive-link" type="url" placeholder="https://drive.google.com/…"></label><button class="btn" id="drive-open-link">Open Drive link</button></div><p id="drive-status" role="status">${driveClient.connected()?'Connected. Open My Drive or search.':'Not connected. Complete setup, then connect.'}</p><div class="row" style="position:sticky;top:0;background:var(--panel);padding:8px 0;z-index:1"><button class="btn" id="drive-back" disabled>← Back</button><strong id="drive-path">My Drive</strong></div><div id="drive-files"></div><button class="btn" id="drive-more" style="display:none">More files</button><label><input type="checkbox" id="drive-read" ${S.tab==='desk' && S.deskView==='campaign'?'checked':''}> Read library adventures after import and open Link adventures</label><button class="btn primary" id="drive-import" disabled>Import selected files</button>
    ${driveResume?'<p class="small">Your previous downloads are kept for this page.</p><button class="btn" id="drive-resume">Retry / resume previous import</button>':''}<hr><button class="btn primary" id="drive-bulk">Import all adventures in this folder</button><label><input type="checkbox" id="drive-include-maps"> Also include loose maps and images</label><p class="small muted">Finds PDFs and ZIPs in this location and its subfolders, reads detected adventures, and opens Link adventures. Existing campaign notes stay in place. Up to 300 MB and 4,000 entries per import.</p><button class="btn" id="drive-cancel" hidden style="display:none">Cancel import</button><p>After importing PDFs, choose <b>Read all adventures for a campaign</b> in Import adventure, then return to <b>Link adventures</b>. Maps use the same preview and scene-link controls as local files. Reloading requires reconnecting to fetch source files again; saved adventure profiles and reviewed scene maps remain local.</p>`);
  const field = id => dlg.querySelector('#drive-' + id);
  let folder = 'root', view = 'folder', history = [], page = '', rows = [], generation = 0, path=['My Drive'], cancelled=false;
  const context=()=>({folder,view,path:[...path],search:field('search').value});
  function navigation(){
    field('path').textContent=path.join(' / ');
    field('back').disabled=driveBusy || !history.length;
    field('bulk').textContent=view==='all'?'Import all accessible adventures':view==='shared'?'Import all shared adventures':'Import all adventures in this folder';
    field('bulk').disabled=driveBusy || !driveClient.connected();
  }
  function busy(value){
    driveBusy=value;field('cancel').hidden=!value;field('cancel').style.display=value?'':'none';
    for(const id of ['connect','connect-account','home','shared','all','find','more','open-link'])field(id).disabled=value;
    field('files').querySelectorAll('button,input').forEach(el=>el.disabled=value);
    selection();navigation();
  }
  const chosen = new Map();
  const selection = () => {field('import').disabled=driveBusy || !chosen.size;field('import').textContent=chosen.size?'Import '+chosen.size+' selected files':'Import selected files';};
  function status(message) { if(active()) field('status').textContent = message; }
  async function load(more = false) {
    if (!active() || driveBusy) return;
    navigation();
    const ticket = ++generation;
    status('Loading Drive filenames…');
    try {
      const result = await driveClient.list({folder,view,search:field('search').value,page:more?page:''});
      if (!active() || ticket !== generation) return;
      rows = more ? rows.concat(result.files || []) : result.files || []; page = result.nextPageToken || '';
      field('files').innerHTML = rows.filter(f=>f.mimeType===QBDrive.folderType || QBDrive.supported(f)).map(f=>f.mimeType===QBDrive.folderType?`<p><button class="btn sm" data-drive-folder="${esc(f.id)}">Open folder: ${esc(f.name)}</button></p>`:`<label class="f"><span><input type="checkbox" data-drive-file="${esc(f.id)}" ${chosen.has(f.id)?'checked':''}> ${esc(f.name)}</span></label>`).join('') || '<p>No supported files here. Try Shared with me, All accessible files, another folder, or a shorter filename search.</p>';
      field('more').style.display = page ? '' : 'none'; selection(); status((view==='shared'?'Shared with me':view==='all'?'All accessible files':'My Drive / folder')+' · '+rows.length+' entries loaded. Choose PDFs, ZIPs or maps.'+(result.incompleteSearch?' Google returned an incomplete search; open the containing folder to narrow it.':''));
      field('files').querySelectorAll('[data-drive-folder]').forEach(b=>b.onclick=()=>{history.push(context());folder=b.dataset.driveFolder;path.push(rows.find(f=>f.id===folder)?.name || 'Folder');view='folder';field('search').value='';void load();});
      field('files').onchange=e=>{const id=e.target.dataset.driveFile;if(!id)return;if(e.target.checked)chosen.set(id,rows.find(f=>f.id===id));else chosen.delete(id);selection();};
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
      status('Waiting for Google sign-in'+(useAccount?' with your suggested account':'')+'…');
      const client = google.accounts.oauth2.initTokenClient({...config,
        callback:response=>{if(!active())return;try{driveClient.authorize(response);void load();}catch(error){status(error.message);}},error_callback:error=>status(QBDrive.authError(error))});
      client.requestAccessToken();
    } catch(error) { status(error.message); }
  }
  field('connect').onclick=()=>void connect(false);
  field('connect-account').onclick=()=>void connect(true);
  field('disconnect').onclick=()=>{cancelled=true;generation++;driveClient.disconnect();rows=[];chosen.clear();field('files').innerHTML='';selection();navigation();field('more').style.display='none';status('Disconnected. Local imports remain. Revoke access in your Google account permissions if desired.');};
  for(const [id,kind] of [['home','folder'],['shared','shared'],['all','all']])field(id).onclick=()=>{if(driveBusy)return;history.push(context());folder='root';view=kind;path=[kind==='shared'?'Shared with me':kind==='all'?'All accessible files':'My Drive'];field('search').value='';void load();};
  field('back').onclick=()=>{if(driveBusy || !history.length)return;const previous=history.pop();folder=previous.folder;view=previous.view;path=previous.path;field('search').value=previous.search;void load();};
  field('search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();void load();}};
  field('find').onclick=()=>void load(); field('more').onclick=()=>void load(true);
  field('open-link').onclick=async()=>{
    const ticket=++generation;status('Opening Drive link…');
    try{
      const file=await driveClient.open(field('link').value);
      if(!active() || ticket!==generation)return;
      if(file.mimeType===QBDrive.folderType){history.push(context());folder=file.id;view='folder';path=[file.name];field('search').value='';await load();}
      else if(QBDrive.supported(file)){chosen.set(file.id,file);selection();status('Selected '+file.name+'. Click Import selected files below.');}
      else status('This link is not a supported PDF, ZIP, image or campaign JSON file.');
    }catch(error){if(ticket===generation)status(error.message);}
  };
  async function importFiles(bulk=false,resume=false){
    if(driveBusy)return;cancelled=false;busy(true);
    const stopped=()=>cancelled || !active();
    try {
      const selected=resume?driveResume.sources:bulk?await driveClient.adventures({folder,view,includeMaps:field('include-maps').checked,cancelled:stopped,onProgress:p=>status('Looking through subfolders… '+p.files+' files found in '+p.folders+' locations.')}):[...chosen.values()], files=[], readAfter=resume?driveResume.readAfter:bulk || field('read').checked;
      if(!resume)driveResume={owner,sources:selected,cache:new Map(),readAfter,bulk};
      if(resume)bulk=driveResume.bulk;
      if(stopped())throw Error('Adventure import cancelled.');
      if(!selected.length)throw Error(bulk?'No PDFs or ZIPs were found in this location. Open your adventure folder or include loose maps.':'Select at least one PDF, ZIP or map first.');
      let bytes=[...driveResume.cache.values()].reduce((n,f)=>n+f.size,0);const failed=[];
      for(const source of selected){if(stopped())throw Error('Adventure import cancelled.');status('Downloading '+(files.length+1)+'/'+selected.length+': '+source.name+'…');let file=driveResume.cache.get(source.id);
        if(!file){try{const blob=await driveClient.download(source);if(stopped())throw Error('Adventure import cancelled.');if(bytes+blob.size>300*1024*1024)throw Error('Selected files exceed 300 MB. Import smaller folders.');file=new File([blob],source.path || source.name,{type:blob.type});driveResume.cache.set(source.id,file);bytes+=blob.size;}catch(error){if(stopped())throw error;failed.push({name:source.name,error:error.message});continue;}}
        files.push(file);
      }
      if(!active())return;
      S.importer.driveReport={ready:files.length,failed};
      if(!files.length)throw Error('No files downloaded. Reconnect if needed, then reopen Drive and retry your previous import. '+(failed[0]?.error || ''));
      if(!bulk && files.length===1 && /\.zip$/i.test(files[0].name)) {
        const {campaignPackage}=await import('../importer/package.js');
        let prepared;
        try { prepared=await campaignPackage(files[0],QBCampaigns.parseCampaign); }
        catch(error) { if(!/No Quillbound campaign/.test(error.message))throw error; }
        if(!active() || !driveClient.connected())throw Error('Drive connection or campaign changed. Import again.');
        if(prepared){dlg.close();await cmRestoreZip(files[0],prepared);return;}
      }
      if(stopped())throw Error('Adventure import cancelled.');
      field('cancel').hidden=true;field('cancel').style.display='none';status('Adding downloaded files to your local adventure library…');
      const QB=window.QB || await import('../app/library-session.js');
      const media=files.filter(f=>!/\.json$/i.test(f.name));
      const library=media.length?await QB.addFileList(media):S.importer.lib;
      if(!active())throw Error('Campaign changed. Import again.');
      S.driveSources ??= [];
      for(const f of selected.filter(f=>driveResume.cache.has(f.id))){const old=S.driveSources.findIndex(x=>x.id===f.id);const source={id:f.id,name:f.name,modifiedTime:f.modifiedTime||''};if(old<0)S.driveSources.push(source);else S.driveSources[old]=source;}
      S.importer.lib=library;S.importer.phase='library';sceneMapsRetryMissing();S.tab='import';dlg.close();render();
      const backup=files.find(f=>/\.json$/i.test(f.name));
      if(backup){const parsed=QBCampaigns.parseCampaign(await backup.text());if(parsed.error)toast(parsed.error);else if(S.role==='dm' && owner===S.campaigns?.current)clConfirm('Restore '+parsed.name+'?', 'This creates a new campaign and preserves the current one.',()=>{if(S.role!=='dm' || owner!==S.campaigns?.current)return;QBCampaigns.importCampaign(S,parsed);render();},'Restore');}
      else if(readAfter){await libReadAll();if(S.role==='dm' && owner===S.campaigns?.current && !S.importer.status){S.tab='desk';S.deskView='campaign';render();}}
      else toast(failed.length?files.length+' files imported; '+failed.length+' failed. Open Drive to retry.':'Files imported. Read the adventures to add them to Link adventures.');
      if(!failed.length)driveResume=null;
    }catch(error){status(error.message);}finally{busy(false);}
  }
  field('import').onclick=()=>importFiles(false);
  field('bulk').onclick=()=>importFiles(true);
  if(driveResume)field('resume').onclick=()=>importFiles(false,true);
  field('cancel').onclick=()=>{cancelled=true;status('Cancelling import after the current request…');};
  navigation();
  if(driveClient.connected())void load();
}
