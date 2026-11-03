/* Campaign-first navigation. Opening a session never moves players or reveals notes. */
function campaignHome() {
  const campaign = QBCampaigns.current(S);
  const scenes = (S.beats || []).filter(b => !overviewReference(b));
  const current = sceneMapContext().beat;
  const next = current || scenes.find(b => b.status !== 'done') || scenes[0];
  const done = scenes.filter(b => b.status === 'done').length;
  const examples = (S.party || []).filter(p => p.example).length;
  const others = S.campaigns.list.filter(c => c.id !== campaign.id);
  return `<div class="pagehead home-heading"><div><h2>Back to the adventure.</h2></div><button class="btn ghost" data-act="cl-help">Help with this screen</button></div>
    <section class="home-campaign" aria-labelledby="home-campaign-title"><div class="home-campaign-main"><div class="eyebrow"><span class="home-dot" aria-hidden="true"></span>Current campaign${examples ? ' · includes examples' : ''}</div><h3 id="home-campaign-title">${esc(campaign.name)}</h3><p class="home-location">${next ? esc(next.title) : 'Your next story starts here.'}</p><p class="muted">${S.combat ? 'A fight is in progress. Return to the saved encounter.' : scenes.length ? `${done} of ${scenes.length} scenes finished.` : 'Import an adventure or restore a campaign to get your session ready.'}</p><div class="row home-actions">${S.combat ? '<button class="btn primary" data-act="tab" data-v="combat">Resume fight <span aria-hidden="true">→</span></button>' : ''}${scenes.length ? `<button class="btn ${S.combat ? '' : 'primary'}" data-act="home-resume">${current ? 'Continue session' : 'Open session'} <span aria-hidden="true">→</span></button>` : `<button class="btn ${S.combat ? '' : 'primary'}" data-act="tab" data-v="import">Import adventure <span aria-hidden="true">→</span></button><label class="btn">Restore campaign / ZIP<input type="file" id="cm-camp-file" accept=".json,.zip,application/json,application/zip" hidden></label>`}<button class="btn ghost" data-act="tab" data-v="campaigns">Manage campaign</button></div>${scenes.length ? `<div class="home-progress" role="progressbar" aria-label="Scenes finished" aria-valuemin="0" aria-valuemax="${scenes.length}" aria-valuenow="${done}"><span style="width:${100 * done / scenes.length}%"></span></div>` : ''}</div><dl class="home-stats"><div><dt>Party members</dt><dd>${S.party.length}</dd></div><div><dt>Scenes</dt><dd>${scenes.length}</dd></div><div><dt>Prepared fights</dt><dd>${S.encounters.length}</dd></div></dl></section>
    <div class="home-section-head"><h3>${scenes.length ? 'More things you can do' : 'Get your first session ready'}</h3>${scenes.length ? '' : '<span class="small muted">Start with an adventure, then add your players</span>'}</div><div class="home-tools">${[
      ['Import an adventure', scenes.length ? 'Add another adventure or bring new maps to the table.' : 'Start here: bring an adventure into your campaign.', 'tab', 'import', '01'],
      ['Your party', 'Add heroes and manage character sheets or player connections.', 'tab', 'campaigns', '02'],
      ['Player display', 'Show players approved maps and public dice rolls.', 'player-setup', '', '03']
    ].map(([title, text, act, v, number]) => `<button class="home-tool" data-act="${act}" data-v="${v}"><b>${title}</b><small>${text}</small><svg class="home-tool-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button>`).join('')}</div>
    <details class="home-more"><summary>More tools & other campaigns${others.length ? ` (${others.length})` : ''}</summary><div class="home-other-campaigns">${others.map(c => `<div class="home-other"><div><b>${esc(c.name)}</b><p class="small muted">${(c.data?.party || []).length} heroes · ${(c.data?.beats || []).filter(b => !overviewReference(b)).length} scenes</p></div><button class="btn" data-act="home-switch" data-id="${esc(c.id)}">Open session <span aria-hidden="true">→</span></button></div>`).join('')}<div class="row"><button class="btn" data-act="tab" data-v="create">Create a hero</button><button class="btn" data-act="cl-campaign">Connect adventures</button><button class="btn" data-act="tab" data-v="homebrew">Homebrew</button><button class="btn" data-act="tab" data-v="campaigns">All campaigns</button></div></div></details><p class="home-footnote">Saved in this browser. Review private notes before revealing them. Player dice remain public on the connected display.</p>`;
}

function playerWelcome() {
  const heroes = S.myHeroes || [];
  return `<div class="pagehead home-heading"><div><h2>Welcome, adventurer</h2><p>${heroes.length ? 'Your heroes are ready. Let’s get back to the table.' : 'A great adventure starts with your hero.'}</p></div></div><section class="home-campaign"><div class="home-campaign-main"><div class="eyebrow">${heroes.length ? 'Ready to play' : 'Make it yours'}</div><h3>${heroes.length ? 'Your story continues.' : 'Meet your next hero.'}</h3><p class="home-location">${heroes.length ? `${heroes.length} saved hero${heroes.length === 1 ? '' : 'es'}` : 'A character, a few choices, a whole new story.'}</p><p class="muted">${heroes.length ? 'Open your character to roll dice, view your sheet or join an active live table.' : 'Build your hero step by step, with recommended choices to help you along.'}</p><div class="row home-actions"><button class="btn primary" data-act="tab" data-v="${heroes.length ? 'heroes' : 'create'}">${heroes.length ? 'Open My heroes' : 'Create a hero'} <span aria-hidden="true">→</span></button><button class="btn" data-act="tab" data-v="${heroes.length ? 'create' : 'heroes'}">${heroes.length ? 'Create a hero' : 'My heroes'}</button></div></div></section><div class="home-player-options"><button class="home-tool" data-act="cm-unlock"><b>Running the adventure?</b><small>Open DM mode to continue your campaign, prepare scenes and manage your party.</small><svg class="home-tool-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button><button class="home-tool" data-act="tab" data-v="homebrew"><b>Your own ideas</b><small>Create homebrew options and send them to your DM for approval.</small><svg class="home-tool-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button></div><p class="home-footnote">Your heroes are saved in this browser. Keep a backup, or send a hero file to your DM.</p>`;
}

function homeResume() {
  if (!isDm()) return;
  const current = sceneMapContext().beat || (S.beats || []).find(b => !overviewReference(b) && b.status !== 'done') || (S.beats || []).find(b => !overviewReference(b));
  // Discard a read-ahead preview without changing the players' actual location.
  if (current) S.dmFocusId = current.id;
  S.tab = 'desk'; S.deskView = 'session';
  window.scrollTo(0, 0);
}
function homeSwitch(d) {
  if (!isDm()) return;
  try { QBCampaigns.switchTo(S, d.id); homeResume(); }
  catch (error) { toast(error.message); }
}

function campaignShell() {
  const header = document.querySelector('.top');
  if (header?.dataset) header.dataset.role = S.role;
  const preparation = document.getElementById('nav-preparation');
  if (preparation && typeof window.matchMedia === 'function') {
    const context = `${S.role}:${S.tab}:${window.matchMedia('(max-width: 900px)').matches}`;
    if (preparation.dataset.context !== context) {
      preparation.open = !isDm() || !window.matchMedia('(max-width: 900px)').matches || ['create', 'heroes', 'import', 'homebrew'].includes(S.tab);
      preparation.dataset.context = context;
    }
  }
}
