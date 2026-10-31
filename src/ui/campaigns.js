/* Quillbound player mode, My heroes and the Adventure manager (Campaigns tab). Rules: src/app/campaigns.js.
   A plain script, loaded before the main script in index.html: it defines functions and uses the main script's
   globals (S, esc, render, toast, openDialog, clConfirm, uid, heroDefaults …) when they run.
   Players see Start, Create a hero and My heroes; the DM unlocks the rest with a passphrase on their own device. */
const PLAYER_TABS = new Set(['home', 'create', 'heroes', 'homebrew']);
const isDm = () => S.role === 'dm';
// Called once after the save loads: everyone starts as a player; the save becomes the first campaign.
// Heroes made before player mode went into this browser's party; the first time, they're copied into My heroes.
function cmInit() {
  if (!S.myHeroes) S.myHeroes = (S.party || []).filter(p => p.build && !p.example).map(p => ({ id: 'ph-' + p.id, build: { ...JSON.parse(JSON.stringify(p.build)), name: p.name }, story: { want: p.want || '' }, saved: Date.now() }));
  S.role ??= 'player'; QBCampaigns.ensure(S); if (!isDm() && !PLAYER_TABS.has(S.tab)) S.tab = 'home';
  cmLoadTable();
}
// The DM's published homebrew (homebrew/table.json on the site): added, updated or removed in this browser by itself.
function cmLoadTable() {
  if (typeof fetch !== 'function' || typeof location === 'undefined' || location.protocol === 'file:') return;
  fetch('homebrew/table.json', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '').then(text => { if (!text) return; const n = QBHomebrew.mergeTable(hbState(), text); if (n) { save(); render(); } }).catch(() => {});
}
// Called by render(): show only the tabs this mode may use, and the mode switch.
function cmShell() {
  if (!isDm() && !PLAYER_TABS.has(S.tab)) S.tab = 'home';
  document.querySelectorAll('.tab').forEach(t => { t.hidden = !isDm() && !PLAYER_TABS.has(t.dataset.v); });
  const ps = document.getElementById('player-btn'); if (ps) ps.hidden = !isDm();
  const m = document.getElementById('mode-btn'); if (m?.dataset) { m.textContent = isDm() ? 'Lock DM mode' : 'I’m the DM'; m.dataset.act = isDm() ? 'cm-lock' : 'cm-unlock'; }
}
// the same wording as the creator: "Level 5 Human Rogue · Thief · Criminal"
const cmHeroLine = (b, sheet) => `Level ${sheet?.level || b.level} ${esc(sheet?.species || '')} ${esc(sheet?.cls || b.cls)}${sheet?.subclass ? ' · ' + esc(sheet.subclass) : ''}${sheet?.background ? ' · ' + esc(sheet.background) : ''}`;
function cmSheet(build) { try { QBHeroRules.setHomebrew(QBHomebrew.forCreator(S.homebrew, build)); return QBHeroRules.derive(build); } catch { return null; } }

/* ---------- player home and My heroes ---------- */
function vPlayerHome() {
  const n = (S.myHeroes || []).length;
  return `<div class="pagehead"><div><div class="eyebrow">Quillbound</div><h2>Welcome, adventurer</h2><p>Build your hero step by step. When it’s done, send it to your DM, who adds it to the campaign.</p></div></div>
    <div class="results">
      <article class="card stack"><h3>1. Create a hero</h3><p>Species, class, abilities, background, skills, gear and your story. The sheet on the right updates as you choose.</p><button class="btn primary" data-act="tab" data-v="create">Create a hero</button></article>
      <article class="card stack"><h3>2. My heroes</h3><p>${n ? `You have ${n} hero${n > 1 ? 'es' : ''} saved in this browser.` : 'Heroes you save appear here.'} Print a character sheet or send a hero to your DM.</p><button class="btn" data-act="tab" data-v="heroes">My heroes</button></article>
      <article class="card stack"><h3>3. Your own ideas</h3><p>Missing a species, background, subclass or feat? Make your own inside the 2024 rules and send it to your DM.</p><button class="btn" data-act="tab" data-v="homebrew">My homebrew</button></article>
    </div>
    <p class="small muted" style="margin-top:14px">Your heroes are saved in this browser only. Send your DM the hero file (it works in Discord or by email); keep a copy as a backup. Are you the DM? Use <b>I’m the DM</b> at the top.</p>`;
}
function vHeroes() {
  const list = S.myHeroes || [];
  return `<div class="pagehead"><div><div class="eyebrow">My heroes</div><h2>Your heroes</h2><p>Saved in this browser. <b>Send to DM</b> downloads a hero file: attach it in Discord or an email to your DM. <b>Copy as text</b> works for chats that don’t take files.</p></div>
      <div class="row"><button class="btn primary" data-act="cm-newhero">Create a hero</button><label class="btn">Open a hero file…<input type="file" id="cm-my-file" accept=".json,application/json" hidden></label><button class="btn" data-act="hi-open" data-v="mine">Import from a sheet…</button></div></div>
    <div class="results">${list.map(h => { const s = cmSheet(h.build); return `<article class="card stack"><h3>${esc(h.build.name || 'Hero')}</h3><p>${cmHeroLine(h.build, s)}</p>
      ${s ? `<p class="small muted">AC ${s.ac} · HP ${s.hp.max} · ${esc((s.attacks || []).filter(a => !a.sneak).slice(0, 2).map(a => `${a.name} ${a.save ? 'save ' + a.save : (a.bonus >= 0 ? '+' : '') + a.bonus}, ${a.damage}`).join(' · '))}</p>` : '<p class="cl-error">This hero can’t be read in this browser.</p>'}
      <div class="row"><button class="btn primary" data-act="cm-send" data-id="${esc(h.id)}">Send to DM</button><button class="btn" data-act="cm-copy" data-id="${esc(h.id)}">Copy as text</button>
        <button class="btn" data-act="cm-print" data-id="${esc(h.id)}">Character sheet (print / PDF)</button><button class="btn" data-act="cm-edit" data-id="${esc(h.id)}">Edit</button><button class="btn ghost" data-act="cm-delhero" data-id="${esc(h.id)}">Delete</button></div></article>`; }).join('')
      || '<div class="empty">No heroes yet. Choose <b>Create a hero</b>; at the end, save it here.</div>'}</div>`;
}

/* ---------- the Adventure manager (DM) ---------- */
function vCampaigns() {
  const c = QBCampaigns.ensure(S), cur = QBCampaigns.current(S), others = c.list.filter(x => x.id !== cur.id);
  return `<div class="pagehead"><div><div class="eyebrow">Adventure manager · DM only</div><h2>${esc(cur.name)}</h2><p>Each campaign has its own party, DM desk, adventures and fight. Switching saves this one and opens the other.</p></div>
      <div class="row"><button class="btn" data-act="cm-export">Back up this campaign…</button><label class="btn">Restore campaign / ZIP…<input type="file" id="cm-camp-file" accept=".json,.zip,application/json,application/zip" hidden></label></div></div>
    <div class="stack"><section class="card stack"><h3>This campaign</h3><label class="f">Name<input data-act-change="cm-rename" value="${esc(cur.name)}" maxlength="80"></label>
      <p class="small muted">${(S.adventures || []).length} adventure${(S.adventures || []).length === 1 ? '' : 's'} · ${(S.beats || []).length} scenes on the desk · ${(S.encounters || []).length} prepared fights${S.combat ? ' · a fight is running' : ''}</p>
      <div class="row"><button class="btn" data-act="tab" data-v="desk">Open the DM desk</button><button class="btn" data-act="tab" data-v="import">Import an adventure</button></div></section>
    <section class="card stack"><h3>Party</h3>
      ${(S.party || []).map(p => `<div class="row hb-item"><span><b>${esc(p.name)}</b> · ${esc(p.cls)} ${p.level || 1}${p.fromPlayer ? ' <span class="chip">from a player</span>' : ''}${p.example ? ' <span class="chip">example</span>' : ''}</span>
        <span class="row">${p.build ? `<button class="btn sm" data-act="sheet-print" data-id="${esc(p.id)}">Sheet</button>` : ''}<button class="btn sm ghost" data-act="cm-delmember" data-id="${esc(p.id)}">Remove</button></span></div>`).join('') || '<p class="muted">No heroes yet.</p>'}
      <h4>Add heroes your players sent</h4>
      <div class="row"><label class="btn primary">Add hero files…<input type="file" id="cm-hero-file" accept=".json,application/json" multiple hidden></label><button class="btn" data-act="hi-open" data-v="party">Import from a sheet (PDF, D&amp;D Beyond, Foundry)…</button></div>
      <label class="f">…or paste a hero a player copied as text<textarea id="cm-paste" rows="3" placeholder='{"format":"quillbound-hero", …}'></textarea></label><div class="row"><button class="btn" data-act="cm-paste">Add pasted hero</button></div>
      <p class="small muted">A hero sent again replaces the earlier version and keeps its current hit points. Homebrew the hero uses comes with it.</p></section>
    <section class="card stack"><h3>Your campaigns</h3>
      ${c.list.map(x => `<div class="row hb-item"><span><b>${esc(x.name)}</b>${x.id === cur.id ? ' <span class="chip ok">open</span>' : ` <span class="small muted">${(x.data?.party || []).length} heroes · saved ${new Date(x.updated).toLocaleDateString()}</span>`}</span>
        ${x.id === cur.id ? '' : `<span class="row"><button class="btn sm" data-act="cm-switch" data-id="${esc(x.id)}">Open</button><button class="btn sm ghost" data-act="cm-delcamp" data-id="${esc(x.id)}">Delete</button></span>`}</div>`).join('')}
      <div class="row"><input id="cm-new-name" placeholder="The Night Shift" maxlength="80" aria-label="New campaign name"><button class="btn primary" data-act="cm-newcamp">New campaign</button></div>
      ${others.length ? '' : '<p class="small muted">A new campaign starts empty. Your current one stays here and opens again with one click.</p>'}</section></div>`;
}

/* ---------- actions ---------- */
function cmAddHero(parsed) {
  const { hero } = parsed, build = JSON.parse(JSON.stringify(hero.build)), sheet = cmSheet(build);
  if (!sheet) { toast(`${hero.name} can’t be read in this browser.`); return null; }
  const old = (S.party || []).find(p => p.fromPlayer === hero.id), keep = old ? { hpNow: old.hpNow, hitDice: old.hitDice, stamina: old.stamina, conds: old.conds } : {};
  const p = QBHeroRules.toHero(build, sheet, { id: old?.id || uid('p'), want: hero.story.want, ...keep }); p.name = hero.name; p.fromPlayer = hero.id; heroDefaults(p);
  if (old) S.party[S.party.indexOf(old)] = p;
  else { S.party.push(p); [['want', 'wants'], ['left', 'left behind'], ['fear', 'fears']].forEach(([k, l]) => { if (hero.story[k]?.trim()) S.hooks.push({ id: uid('h'), text: `${p.name} ${l}: ${hero.story[k].trim()}`, status: 'dangling', clock: 0, source: 'Character' }); }); }
  return old ? 'updated' : 'added';
}
function cmImportHeroes(texts) {
  const out = { added: [], updated: [], failed: [] };
  for (const t of texts) { const r = QBCampaigns.parseHero(t, b => cmSheet(b)); if (r.error) { out.failed.push(r.error); continue; } const how = cmAddHero(r); if (how) out[how].push(r.hero.name); else out.failed.push(r.hero.name); }
  toast([out.added.length && `Added: ${out.added.join(', ')}.`, out.updated.length && `Updated: ${out.updated.join(', ')}.`, out.failed.length && out.failed.join(' ')].filter(Boolean).join(' ') || 'Nothing to add.');
  render();
}
function cmUnlockDialog() {
  const first = !S.dmLock;
  const dlg = openDialog(first ? 'Set your DM passphrase' : 'DM mode', `<p>${first ? 'Choose a passphrase for DM mode on this device. Players who use this browser then see only their own heroes.' : 'Enter your DM passphrase.'}</p>
    <label class="f">Passphrase<input type="password" id="cm-pass" autocomplete="${first ? 'new-password' : 'current-password'}"></label>${first ? '<label class="f">Again<input type="password" id="cm-pass2" autocomplete="new-password"></label>' : ''}
    <p class="small muted">Your adventures, notes and fights stay private because they only exist in your own browser; players’ browsers never receive them. The passphrase keeps the DM tabs closed on this device.</p>
    <p class="cl-error" id="cm-pass-err" hidden></p><div class="row"><button class="btn primary" id="cm-pass-go">${first ? 'Set and open DM mode' : 'Open DM mode'}</button></div>`);
  const err = m => { const e = dlg.querySelector('#cm-pass-err'); e.textContent = m; e.hidden = false; };
  dlg.querySelector('#cm-pass-go').onclick = async () => {
    const pass = dlg.querySelector('#cm-pass').value;
    try {
      if (first) { if (pass !== dlg.querySelector('#cm-pass2').value) return err('The two passphrases differ.'); await QBCampaigns.setLock(S, pass); }
      else if (!(await QBCampaigns.unlock(S, pass))) return err('That passphrase doesn’t match.');
    } catch (e) { return err(e.message); }
    S.role = 'dm'; S.tab = 'campaigns'; dlg.close(); render(); toast('DM mode. Lock it again before you hand this device to a player.');
  };
  dlg.querySelector('#cm-pass').focus();
}
const cmHero = id => (S.myHeroes || []).find(h => h.id === id);
function campaignActions() { return {
  'cm-unlock': () => cmUnlockDialog(),
  'hi-open': d => hiDialog(d.v === 'party' && isDm() ? 'party' : 'mine'), // src/ui/hero-import.js
  'cm-lock': () => { S.role = 'player'; S.tab = 'home'; toast('DM mode is locked.'); },
  'cm-newhero': () => { S.creator = crNew(); S.tab = 'create'; },
  'cm-edit': d => { const h = cmHero(d.id); if (!h) return; S.creator = crRestoreSelections({ ...crNew(), build: JSON.parse(JSON.stringify(h.build)), story: { ...crNew().story, ...h.story }, heroId: h.id, step: 'review' }); S.tab = 'create'; window.scrollTo(0, 0); },
  'cm-print': d => { const h = cmHero(d.id); if (h) openSheet(h.build, h.story); },
  'cm-send': d => { const h = cmHero(d.id); if (!h) return; const name = (h.build.name || 'hero').replace(/[^\w-]+/g, '-').toLowerCase(); saveFile(`${name}.quillbound-hero.json`, QBCampaigns.heroFile(h), `Saved ${h.build.name}. Send the file to your DM.`); },
  'cm-copy': d => { const h = cmHero(d.id); if (!h) return; const text = QBCampaigns.heroFile(h); (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => toast('Copied. Paste it in a message to your DM.'), () => toast('Copying is blocked here. Use Send to DM instead.')); },
  'cm-delhero': d => { const h = cmHero(d.id); if (!h) return; clConfirm(`Delete ${h.build.name}?`, 'This removes the hero from this browser. Heroes your DM already has stay in the campaign.', () => { S.myHeroes = S.myHeroes.filter(x => x.id !== h.id); render(); }, 'Delete'); },
  'cm-rename': d => QBCampaigns.rename(S, S.campaigns.current, d.v),
  'cm-newcamp': () => { const name = document.getElementById('cm-new-name')?.value; try { QBCampaigns.create(S, name); toast('New campaign. The previous one is saved in the list.'); } catch (e) { toast(e.message); } },
  'cm-switch': d => { try { QBCampaigns.switchTo(S, d.id); toast(`Opened ${QBCampaigns.current(S).name}.`); } catch (e) { toast(e.message); } },
  'cm-delcamp': d => { const x = S.campaigns.list.find(c => c.id === d.id); if (!x) return; clConfirm(`Delete ${x.name}?`, 'Its party, desk and adventures are removed from this browser. Back it up first if you might want it again.', () => { QBCampaigns.remove(S, d.id); render(); }, 'Delete'); },
  'cm-delmember': d => { const p = (S.party || []).find(x => x.id === d.id); if (!p) return; clConfirm(`Remove ${p.name} from the party?`, 'The player keeps their hero and can send it again.', () => { S.party = S.party.filter(x => x.id !== p.id); render(); }, 'Remove'); },
  'cm-paste': () => { const t = document.getElementById('cm-paste')?.value || ''; if (!t.trim()) { toast('Paste a hero first.'); return; } cmImportHeroes([t]); },
  'cm-export': () => { const name = QBCampaigns.current(S).name.replace(/[^\w-]+/g, '-').toLowerCase(); saveFile(`${name}.quillbound-campaign.json`, QBCampaigns.exportCampaign(S), 'Campaign backed up. Keep the file somewhere safe.'); }
}; }
// File inputs: hero files for the campaign, a hero file into My heroes, a campaign backup.
document.addEventListener('change', e => {
  const t = e.target; if (!t.files?.length || !['cm-hero-file', 'cm-my-file', 'cm-camp-file'].includes(t.id)) return;
  const files = [...t.files]; t.value = '';
  if (t.id === 'cm-camp-file' && /\.zip$/i.test(files[0].name)) { void cmRestoreZip(files[0]); return; }
  Promise.all(files.map(f => f.text())).then(texts => {
    if (t.id === 'cm-hero-file') return cmImportHeroes(texts);
    if (t.id === 'cm-my-file') { for (const x of texts) { const r = QBCampaigns.parseHero(x, b => cmSheet(b)); if (r.error) { toast(r.error); continue; } S.myHeroes ??= []; const i = S.myHeroes.findIndex(h => h.id === r.hero.id); const h = { id: r.hero.id, build: r.hero.build, story: r.hero.story, saved: Date.now() }; if (i >= 0) S.myHeroes[i] = h; else S.myHeroes.push(h); toast(`${r.hero.name} is in My heroes.`); } return render(); }
    const r = QBCampaigns.parseCampaign(texts[0]); if (r.error) return toast(r.error);
    try { QBCampaigns.importCampaign(S, r); toast(`Restored ${r.name} as a new campaign.`); } catch (er) { toast(er.message); } render();
  }).catch(() => toast('This file could not be read.'));
});
