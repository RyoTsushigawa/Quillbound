/* This page never opens the DM save or loads the importer. */
(function () {
  const token = location.hash.slice(1);
  const status = document.getElementById('connection');
  if (!/^[a-f0-9]{32}$/.test(token)) { status.textContent = 'Open this screen from your DM’s page'; return; }
  if (!globalThis.BroadcastChannel) { status.textContent = 'This browser cannot connect two screens'; return; }
  const channel = new BroadcastChannel('quillbound-player-' + token);
  let last = 0, lastContent = '', lastMapUrl = null;
  channel.onmessage = event => {
    if (event.data?.type !== 'snapshot' || event.data.payload?.version !== 1) return;
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
  const hello = () => channel.postMessage({ type: 'hello' });
  hello();
  setInterval(() => { if (last && Date.now() - last > 10000) status.textContent = 'Waiting for DM updates · showing last reveal'; hello(); }, 4000);
  document.getElementById('fullscreen').onclick = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  window.addEventListener('pagehide', () => channel.close());
})();
