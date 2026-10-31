// Browser-only Drive connection. The short-lived token never enters saved campaign data.
(function(root) {
  const scope = 'https://www.googleapis.com/auth/drive.readonly';
  const folderType = 'application/vnd.google-apps.folder';
  const target = f => f?.mimeType === 'application/vnd.google-apps.shortcut' ? {...f, id:f.shortcutDetails?.targetId, mimeType:f.shortcutDetails?.targetMimeType, resourceKey:f.shortcutDetails?.targetResourceKey, capabilities:undefined, size:undefined} : f;
  const supported = f => /\.(pdf|zip|png|jpe?g|webp|gif|bmp|json)$/i.test(f.name || '');
  const validId = id => /^[\w-]+$/.test(id || '');
  const clientId = value => /^[\w.-]+\.apps\.googleusercontent\.com$/.test(value || '');
  const quote = value => String(value).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  function location(value) {
    let url;try{url=new URL(String(value).trim());}catch{throw Error('Paste a Google Drive file or folder link.');}
    if(url.protocol!=='https:' || url.hostname!=='drive.google.com')throw Error('Use an https://drive.google.com file or folder link.');
    const id=url.pathname.match(/\/(?:folders|d)\/([\w-]+)/)?.[1] || url.searchParams.get('id');
    const resourceKey=url.searchParams.get('resourcekey') || '';
    if(!validId(id) || (resourceKey && !validId(resourceKey)))throw Error('This Drive link has no valid file or folder ID.');
    return {id,resourceKey};
  }
  function signInConfig(id, email = '') {
    if (!clientId(id)) throw Error('Enter the public OAuth client ID from Google Cloud setup first.');
    const hint = String(email).trim();
    if (hint && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hint)) throw Error('Enter the Google account’s full email address.');
    return {client_id:id,scope,include_granted_scopes:false,prompt:hint?'consent':'select_account',...(hint?{login_hint:hint}:{})};
  }
  function authError(response) {
    const code = response?.error || response?.type;
    const known = {
      access_denied:'Google denied access. Check the selected account and its test-user permission.',
      invalid_client:'Google rejected the OAuth client ID. Check that it belongs to your Web application.',
      origin_mismatch:'Google rejected this website origin. Check the Web application’s authorized JavaScript origins.',
      popup_failed_to_open:'The Google window could not open. Allow this sign-in popup for Quillbound and click Connect again.',
      popup_closed:'The Google window closed without completing sign-in. If account selection failed in Firefox, enter your email and use Connect this account (Firefox).',
      unknown:'Google did not return a sign-in result. Try Connect this account (Firefox) with your account email.'
    };
    return known[code] || (code ? 'Google sign-in failed (' + String(code).replace(/[^a-z_]/gi,'').slice(0,60) + '). Try connecting with your account email.' : 'Google Drive read access was not granted.');
  }
  function client({ request = (...args) => root.fetch(...args), now = () => Date.now() } = {}) {
    let token = '', expires = 0, revision = 0;
    const resourceKeys = new Map();
    function disconnect() { token = ''; expires = 0; revision++; resourceKeys.clear(); }
    function authorize(response) {
      if (response?.error) throw Error(authError(response));
      if (!response?.access_token || !String(response.scope || '').split(' ').includes(scope)) throw Error('Google Drive read access was not granted.');
      token = response.access_token; expires = now() + Number(response.expires_in || 3600) * 1000; revision++;
    }
    const connected = () => !!token && now() < expires;
    async function get(path, params = {}, media = false) {
      if (!connected()) { disconnect(); throw Error('Connect Google Drive again; the session has expired.'); }
      const ticket = revision, url = 'https://www.googleapis.com/drive/v3/' + path + '?' + new URLSearchParams(params);
      let response;
      try { response = await request(url, { headers: { Authorization: 'Bearer ' + token, ...(resourceKeys.size ? {'X-Goog-Drive-Resource-Keys':[...resourceKeys].map(([id,key])=>id+'/'+key).join(',')} : {}) }, credentials: 'omit', redirect: 'error' }); }
      catch { throw Error('Drive could not be reached. Check your connection and whether a browser extension blocks googleapis.com, then retry.'); }
      if (ticket !== revision) throw Error('Drive connection changed. Try again.');
      if (response.status === 401) { disconnect(); throw Error('Google session expired. Connect Drive again.'); }
      if (!response.ok) {
        let detail; try { detail=await response.json(); } catch {}
        const reason=detail?.error?.details?.find(x=>x.reason)?.reason || detail?.error?.errors?.[0]?.reason || detail?.error?.status || '';
        const help={accessNotConfigured:'Enable Google Drive API in the Google Cloud project that owns this OAuth client.',SERVICE_DISABLED:'Enable Google Drive API in the Google Cloud project that owns this OAuth client.',insufficientPermissions:'Disconnect and reconnect, then grant Google Drive read access.',downloadQuotaExceeded:'Google has temporarily reached this file’s download quota. Try again later.',notFound:'This file or folder is unavailable to the connected Google account. Check its sharing permissions.'};
        throw Error('Google Drive '+response.status+(reason?' ('+reason+')':'')+': '+(help[reason] || (response.status===403?'Google denied this request. Check Drive API setup and download permissions.':'The request failed. Retry or reconnect to Drive.')));
      }
      const result = media ? await response.blob() : await response.json();
      if (ticket !== revision) throw Error('Drive connection changed. Try again.');
      return result;
    }
    async function list({ folder = 'root', search = '', page = '', view = 'folder' } = {}) {
      if (!validId(folder)) throw Error('Choose a valid Drive folder.');
      const q = 'trashed = false' + (search.trim() ? " and name contains '" + quote(search.trim()) + "'" : view==='shared' ? ' and sharedWithMe = true' : view==='all' ? '' : " and '" + folder + "' in parents");
      const result=await get('files', { q, fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime,resourceKey,shortcutDetails(targetId,targetMimeType,targetResourceKey),capabilities(canDownload))', pageSize:100, pageToken:page, orderBy:'folder,name', spaces:'drive', includeItemsFromAllDrives:'true', supportsAllDrives:'true' });
      const files=(result.files || []).map(target);
      for(const f of files) if(f.resourceKey && validId(f.id) && validId(f.resourceKey)) resourceKeys.set(f.id,f.resourceKey);
      return {...result,files};
    }
    async function download(file) {
      file=target(file);
      if(file?.resourceKey && validId(file.id) && validId(file.resourceKey)) resourceKeys.set(file.id,file.resourceKey);
      if (!validId(file.id) || !supported(file)) throw Error('Choose a PDF, ZIP, image or Quillbound JSON file.');
      if (file.capabilities?.canDownload === false) throw Error('The owner has disabled downloads for this file.');
      if (Number(file.size) > 300 * 1024 * 1024) throw Error('Choose a file smaller than 300 MB.');
      const blob = await get('files/' + file.id, { alt:'media', supportsAllDrives:'true' }, true);
      if (blob.size > 300 * 1024 * 1024) throw Error('Choose a file smaller than 300 MB.');
      return blob;
    }
    async function open(value) {
      const {id,resourceKey}=location(value);
      if(resourceKey)resourceKeys.set(id,resourceKey);
      const file=target(await get('files/'+id,{fields:'id,name,mimeType,size,resourceKey,shortcutDetails(targetId,targetMimeType,targetResourceKey),capabilities(canDownload)',supportsAllDrives:'true'}));
      if(file.resourceKey && validId(file.resourceKey))resourceKeys.set(file.id,file.resourceKey);
      return file;
    }
    return { authorize, disconnect, connected, list, download, open };
  }
  root.QBDrive = { scope, folderType, target, location, supported, clientId, client, signInConfig, authError };
})(globalThis);
