// Browser-only Drive connection. The short-lived token never enters saved campaign data.
(function(root) {
  const scope = 'https://www.googleapis.com/auth/drive.readonly';
  const folderType = 'application/vnd.google-apps.folder';
  const supported = f => /\.(pdf|zip|png|jpe?g|webp|gif|bmp|json)$/i.test(f.name || '');
  const validId = id => /^[\w-]+$/.test(id || '');
  const clientId = value => /^[\w.-]+\.apps\.googleusercontent\.com$/.test(value || '');
  const quote = value => String(value).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
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
    function disconnect() { token = ''; expires = 0; revision++; }
    function authorize(response) {
      if (response?.error) throw Error(authError(response));
      if (!response?.access_token || !String(response.scope || '').split(' ').includes(scope)) throw Error('Google Drive read access was not granted.');
      token = response.access_token; expires = now() + Number(response.expires_in || 3600) * 1000; revision++;
    }
    const connected = () => !!token && now() < expires;
    async function get(path, params = {}, media = false) {
      if (!connected()) { disconnect(); throw Error('Connect Google Drive again; the session has expired.'); }
      const ticket = revision, url = 'https://www.googleapis.com/drive/v3/' + path + '?' + new URLSearchParams(params);
      const response = await request(url, { headers: { Authorization: 'Bearer ' + token }, credentials: 'omit', redirect: 'error' });
      if (ticket !== revision) throw Error('Drive connection changed. Try again.');
      if (response.status === 401) { disconnect(); throw Error('Google session expired. Connect Drive again.'); }
      if (!response.ok) throw Error(response.status === 403 ? 'Google did not allow this file. Check Drive API access and download permissions.' : 'Google Drive could not load this request. Try again.');
      const result = media ? await response.blob() : await response.json();
      if (ticket !== revision) throw Error('Drive connection changed. Try again.');
      return result;
    }
    async function list({ folder = 'root', search = '', page = '' } = {}) {
      if (!validId(folder)) throw Error('Choose a valid Drive folder.');
      const q = 'trashed = false and ' + (search.trim() ? "name contains '" + quote(search.trim()) + "'" : "'" + folder + "' in parents");
      return get('files', { q, fields:'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,capabilities(canDownload))', pageSize:100, pageToken:page, orderBy:'folder,name', spaces:'drive', includeItemsFromAllDrives:'true', supportsAllDrives:'true' });
    }
    async function download(file) {
      if (!validId(file.id) || !supported(file)) throw Error('Choose a PDF, ZIP, image or Quillbound JSON file.');
      if (file.capabilities?.canDownload === false) throw Error('The owner has disabled downloads for this file.');
      if (Number(file.size) > 300 * 1024 * 1024) throw Error('Choose a file smaller than 300 MB.');
      const blob = await get('files/' + file.id, { alt:'media', supportsAllDrives:'true' }, true);
      if (blob.size > 300 * 1024 * 1024) throw Error('Choose a file smaller than 300 MB.');
      return blob;
    }
    return { authorize, disconnect, connected, list, download };
  }
  root.QBDrive = { scope, folderType, supported, clientId, client, signInConfig, authError };
})(globalThis);
