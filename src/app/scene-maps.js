/* Scene-to-image links are campaign data; reviewed pixels stay in this browser's IndexedDB. */
(function (root) {
  const imageUrl = value => typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value);
  const basename = path => String(path || '').replace(/\\/g, '/').split('/').pop();
  const dmFile = file => file?.dm === true || file?.tags?.audience === 'dm' || /(?:^|[\/\\ _.-])(?:gm|dm|sl|nur[_ -]sl|spielleitung)(?:$|[\/\\ _.-])/i.test(file?.path || file?.name || '');
  function candidates(library) {
    return (library?.products || []).flatMap(product => (product.groups || []).filter(g => g.kind === 'map').flatMap(g => (g.files || [])
      .filter(f => f.previewable && !f.copyOf && !dmFile(f))
      .map(f => ({ ...f, pi: product.i, product: product.name, name: f.name || basename(f.path) }))));
  }
  function hint(beat) {
    return String(beat?.summary || '').match(/^\s*(?:KARTE|MAP):\s*([^\r\n]+\.(?:png|jpe?g|webp))\s*$/mi)?.[1]?.trim() || '';
  }
  function suggested(beat, library) {
    const name=hint(beat);
    if(!name || dmFile({path:name}) || !/(?:^|[ _.-])player(?:[ _.-]|$)/i.test(basename(name)))return null;
    const matches=candidates(library).filter(f=>f.name===basename(name));
    return matches.length===1?matches[0]:null;
  }
  function reference(value) {
    if (!value || typeof value !== 'object') return null;
    const key = String(value.key || '');
    if (!/^[a-f0-9]{64}$/.test(key) || value.reviewed !== true || dmFile({ name: value.fileName })) return null;
    return { key, fileName: basename(value.fileName).slice(0, 240), title: String(value.title || 'Map').slice(0, 200), auto: value.auto === true, reviewed: true };
  }
  async function fingerprint(blob) {
    const hash = await root.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, '0')).join('');
  }
  async function pixels(blob) {
    const bitmap = await root.createImageBitmap(blob);
    try {
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = root.document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png'); // no source filename or image metadata enters the player feed
    } finally { bitmap.close(); }
  }
  let dbPromise;
  function database() {
    if (!root.indexedDB) return Promise.reject(new Error('This browser cannot save scene maps. Use Show players from the library instead.'));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const req = root.indexedDB.open('quillbound-scene-maps', 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('images')) req.result.createObjectStore('images', { keyPath: 'key' }); };
      req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); dbPromise = null; }; resolve(req.result); };
      req.onerror = () => reject(new Error('Could not open saved scene maps. Check this browser’s storage settings.'));
      req.onblocked = () => reject(new Error('Close older Quillbound tabs and try saving the map again.'));
    }).catch(error => { dbPromise = null; throw error; });
    return dbPromise;
  }
  const assets = {
    async get(key) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readonly'), req = tx.objectStore('images').get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(new Error('Could not read the saved scene map.'));
        tx.onabort = () => reject(new Error('Reading the saved scene map was interrupted.'));
      });
    },
    async put(image) {
      if (!/^[a-f0-9]{64}$/.test(image?.key || '') || !imageUrl(image?.url)) throw new Error('Choose a readable PNG, JPEG or WebP image.');
      const db = await database();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite'); tx.objectStore('images').put({ key: image.key, url: image.url });
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(new Error('The map could not be saved. Free some browser storage and try again.'));
      });
    }
  };
  // No delayed read may overwrite a newer scene, a manual handout, or a cleared player screen.
  function controller({ getImage, show, clear, missing, current = () => true }) {
    let generation = 0, token, lastStatus = '';
    return {
      pause() { generation++; lastStatus = 'paused'; },
      retryMissing() { if (lastStatus === 'missing') token = undefined; },
      reset() { generation++; token = undefined; },
      async activate(next, value) {
        if (next === token) return;
        const hadScene = token !== undefined; token = next;
        const ticket = ++generation, ref = reference(value);
        if (hadScene || ref?.auto) clear();
        lastStatus = 'idle';
        if (!ref?.auto) return;
        try {
          const image = await getImage(ref);
          if (ticket !== generation || !current(next)) return;
          if (!imageUrl(image?.url)) throw new Error('Map unavailable');
          lastStatus = 'shown'; show({ type: 'image', title: ref.title, url: image.url });
        } catch (error) {
          if (ticket !== generation || !current(next)) return;
          lastStatus = 'missing'; missing(ref, error);
        }
      }
    };
  }
  root.SceneMaps = { imageUrl, basename, dmFile, candidates, hint, suggested, reference, fingerprint, pixels, assets, controller };
})(globalThis);
