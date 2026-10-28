/* This page never opens the DM save or loads the importer. */
(function () {
  const token = location.hash.slice(1);
  const status = document.getElementById('connection');
  if (!/^[a-f0-9]{32}$/.test(token)) { status.textContent = 'Open this screen from your DM’s page'; return; }
  if (!globalThis.BroadcastChannel) { status.textContent = 'This browser cannot connect two screens'; return; }
  const channel = new BroadcastChannel('quillbound-player-' + token);
  let last = 0;
  channel.onmessage = event => {
    if (event.data?.type !== 'snapshot' || event.data.payload?.version !== 1) return;
    const safe = event.data.payload;
    document.getElementById('player-view').innerHTML = PlayerFeed.view(safe);
    last = Date.now();
    status.textContent = 'Connected to your DM';
  };
  const hello = () => channel.postMessage({ type: 'hello' });
  hello();
  setInterval(() => { if (last && Date.now() - last > 10000) status.textContent = 'Waiting for DM updates · showing last reveal'; hello(); }, 4000);
  document.getElementById('fullscreen').onclick = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  window.addEventListener('pagehide', () => channel.close());
})();
