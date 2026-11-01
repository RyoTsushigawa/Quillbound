/* Campaigns and hero files: the rules behind the Adventure manager (screens: src/ui/campaigns.js).
   Each campaign keeps its own table state (party, desk, adventures, fight …). The app holds the current campaign in S
   as before; the others wait in S.campaigns.list. Everything is plain data in this browser: nothing is sent anywhere. */
(function (root) {
  // State that belongs to this browser rather than to one campaign: the creator, homebrew, the player's own heroes,
  // the DM lock, screen settings and the importer's library. Every other key moves with the campaign.
  const SHARED = new Set(['tab', 'role', 'dmLock', 'myHeroes', 'campaigns', 'homebrew', 'hbEdit', 'hbKind', 'hbFight', 'creator', 'importer',
    'cloudSettings', 'playerDiceLog', 'playerSettings', 'characterOptions', 'sampleAssets', 'deskView', 'filter', 'md', 'modal']);
  const clone = x => JSON.parse(JSON.stringify(x ?? null));
  const uid = p => p + '-' + (root.crypto?.randomUUID?.() || String(Date.now()) + Math.random()).replace(/[^a-z0-9]/gi, '').slice(0, 10);
  const campaignKeys = s => Object.keys(s).filter(k => !SHARED.has(k));
  const pick = s => Object.fromEntries(campaignKeys(s).map(k => [k, clone(s[k])]));
  // An empty table: the same shape as a fresh save, with nothing in it.
  const blank = () => ({ party: [], beats: [], hooks: [], npcs: [], bestiary: [], maps: [], items: [], encounters: [], tables: [], adventures: [],
    draft: { name: '', where: '', goal: '', foes: [], pick: '', n: 1 }, combat: null });

  // The first time: whatever is in the save becomes the first campaign.
  function ensure(s, name) {
    if (s.campaigns?.list?.length) return s.campaigns;
    const id = uid('c'); s.campaigns = { current: id, list: [{ id, name: name || 'My campaign', created: Date.now(), updated: Date.now(), data: null }] };
    return s.campaigns;
  }
  const current = s => ensure(s).list.find(c => c.id === s.campaigns.current);
  // Park the current campaign's data in its entry, then bring another one into S.
  function switchTo(s, id) {
    const c = ensure(s), from = current(s), to = c.list.find(x => x.id === id);
    if (!to) throw Error('That campaign no longer exists.');
    if (to === from) return;
    if (s.combat?.lite?.pending) throw Error('Finish or cancel the current roll first.');
    from.data = pick(s); from.updated = Date.now();
    for (const k of campaignKeys(s)) delete s[k];
    Object.assign(s, to.data ? clone(to.data) : blank()); to.data = null; c.current = to.id;
  }
  function create(s, name) {
    const c = ensure(s), id = uid('c'); c.list.push({ id, name: String(name || '').trim().slice(0, 80) || 'New campaign', created: Date.now(), updated: Date.now(), data: blank() });
    switchTo(s, id); return id;
  }
  function remove(s, id) {
    const c = ensure(s); if (id === c.current) throw Error('Switch to another campaign before deleting this one.');
    c.list = c.list.filter(x => x.id !== id);
  }
  function rename(s, id, name) { const x = ensure(s).list.find(c => c.id === id); if (x) x.name = String(name || '').trim().slice(0, 80) || x.name; }

  /* ---- campaign backup files ---- */
  const CAMPAIGN_FORMAT = 'quillbound-campaign';
  function exportCampaign(s) { const c = current(s); return JSON.stringify({ format: CAMPAIGN_FORMAT, version: 1, exported: new Date().toISOString(), name: c.name, data: pick(s) }, null, 1); }
  function parseCampaign(text) {
    let d; try { d = JSON.parse(text); } catch { return { error: 'This file is not readable (not JSON).' }; }
    if (d?.format !== CAMPAIGN_FORMAT || typeof d.data !== 'object' || !Array.isArray(d.data?.party)) return { error: 'This is not a Quillbound campaign file.' };
    const data = Object.fromEntries(Object.entries(d.data).filter(([k]) => !SHARED.has(k)));
    return { name: String(d.name || 'Imported campaign').slice(0, 80), data };
  }
  function importCampaign(s, parsed) { const id = create(s, parsed.name + ' (imported)'); for (const k of campaignKeys(s)) delete s[k]; Object.assign(s, blank(), clone(parsed.data)); return id; }

  /* ---- hero files: a player sends a hero, the DM adds it to a campaign ---- */
  const HERO_FORMAT = 'quillbound-hero';
  // hero: { id, build (with hbData: copies of the homebrew it uses), story }
  function heroFile(hero) {
    return JSON.stringify({ format: HERO_FORMAT, version: 1, exported: new Date().toISOString(), hero: { id: hero.id, name: hero.build?.name || hero.name || 'Hero', build: hero.build, story: hero.story || {} } }, null, 1);
  }
  // Read a hero file (or its text pasted from a chat). Returns { hero } or { error }. The build is checked by deriving it.
  function parseHero(text, derive) {
    let d; try { d = JSON.parse(String(text || '').trim()); } catch { return { error: 'This is not a Quillbound hero (it isn’t readable). Ask the player to send the hero file again.' }; }
    const h = d?.hero;
    if (d?.format !== HERO_FORMAT || !h || typeof h.build !== 'object' || !h.build.cls || !h.build.species) return { error: 'This is not a Quillbound hero file.' };
    const build = clone(h.build); build.name = String(h.name || build.name || 'Hero').slice(0, 80);
    let sheet; try { sheet = derive(build); } catch (e) { return { error: `${build.name} can’t be read: ${e.message}` }; }
    if (!sheet?.cls) return { error: `${build.name} uses a class this browser doesn’t know.` };
    return { hero: { id: String(h.id || uid('ph')).slice(0, 60), name: build.name, build, story: { want: String(h.story?.want || '').slice(0, 500), fear: String(h.story?.fear || '').slice(0, 500), left: String(h.story?.left || '').slice(0, 500) } }, sheet };
  }

  /* ---- the DM lock ---- */
  // A passphrase hides the DM tabs on this device. It is not encryption: the DM's data is private because it never
  // leaves the DM's own browser; players' browsers only hold their own heroes.
  async function hash(pass, salt) {
    const bytes = new TextEncoder().encode(salt + '\u0000' + pass), out = await root.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(out)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function setLock(s, pass) { if (String(pass || '').length < 4) throw Error('Use at least 4 characters.'); const salt = uid('s'); s.dmLock = { salt, hash: await hash(pass, salt) }; }
  async function unlock(s, pass) { if (!s.dmLock) return false; return (await hash(String(pass || ''), s.dmLock.salt)) === s.dmLock.hash; }

  root.QBCampaigns = { SHARED, campaignKeys, blank, ensure, current, switchTo, create, remove, rename, exportCampaign, parseCampaign, importCampaign, heroFile, parseHero, setLock, unlock, HERO_FORMAT, CAMPAIGN_FORMAT };
})(globalThis);
