/* This page never opens the DM save or loads the importer. */
(function () {
  const token = location.hash.slice(1);
  const status = document.getElementById('connection');
  if (!/^[a-f0-9]{32}$/.test(token)) { status.textContent = 'Open this screen from your DM’s page'; return; }
  if (!globalThis.BroadcastChannel) { status.textContent = 'This browser cannot connect two screens'; return; }
  const channel = new BroadcastChannel('quillbound-player-' + token);
  let last = 0, lastContent = '', lastMapUrl = null, sourceId = String(location.search || '').match(/[?&]source=([\w-]{1,80})(?:&|$)/)?.[1] || '';
  channel.onmessage = event => {
    const incoming=typeof event.data?.sourceId==='string' && /^[\w-]{1,80}$/.test(event.data.sourceId)?event.data.sourceId:'';
    if(event.data?.type==='source-activate' && incoming){sourceId=incoming;return;}
    if (event.data?.type !== 'snapshot' || event.data.payload?.version !== 1) return;
    // Older or background app tabs must not alternate maps on the same display.
    if(sourceId && incoming!==sourceId)return;
    if(incoming)sourceId=incoming;
    const safe = event.data.payload;
    last = Date.now();
    status.textContent = 'Connected to your DM';
    const content=JSON.stringify({...safe,updated:0});
    if(content===lastContent)return;
    const view=document.getElementById('player-view'), mapUrl=safe.spotlight?.type==='image'?safe.spotlight.url:null;
    const image=mapUrl && mapUrl===lastMapUrl ? view.querySelector?.('.spotlight img') : null;
    view.innerHTML = PlayerFeed.view(safe);
    // Keep the already decoded image when only text, combat or the alert changed.
    if(image)view.querySelector('.spotlight img')?.replaceWith(image);
    lastContent=content;lastMapUrl=mapUrl;
  };
  const hello = () => channel.postMessage({ type: 'hello', sourceId });
  hello();
  setInterval(() => { if (last && Date.now() - last > 10000) status.textContent = 'Waiting for DM updates · showing last reveal'; hello(); }, 4000);
  document.getElementById('fullscreen').onclick = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  window.addEventListener('pagehide', () => channel.close());
})();
