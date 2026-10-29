/* Quillbound hero importer screen: a dialog that reads a hero from a PDF sheet, D&D Beyond or Foundry VTT (rules:
   src/app/hero-import.js), shows what matched and what differs, then saves it to My heroes or adds it to the open
   campaign's party. A plain script loaded before the main script; it uses the main script's globals when it runs. */
// pdf.js comes with the app (vendor/); loaded only when a PDF is chosen.
function hiPdfjs() {
  if (window.pdfjsLib && window.pdfjsWorker) return Promise.resolve(window.pdfjsLib);
  const load = src => new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(Error('The PDF reader could not load.')); document.head.appendChild(s); });
  return (window.pdfjsLib ? Promise.resolve() : load('vendor/pdf.min.js')).then(() => window.pdfjsWorker ? null : load('vendor/pdf.worker.min.js'))
    .then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; return window.pdfjsLib; });
}
// A file → what the importer found. Quillbound hero files go through the hero-file reader instead.
async function hiRead(file) {
  QBHeroRules.setHomebrew(QBHomebrew.forCreator(S.homebrew, {})); // approved homebrew species and classes can be recognised
  const data = QBHeroRules.data();
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    const lib = await hiPdfjs(), doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, verbosity: 0 }).promise;
    const fields = await doc.getFieldObjects().catch(() => null);
    if (fields && Object.values(fields).flat().filter(x => x?.value && x.value !== 'Off').length >= 10) return { found: QBHeroImport.fromFields(fields, data) };
    const pages = []; for (let i = 1; i <= doc.numPages; i++) pages.push(QBHeroImport.linesFromTextContent((await (await doc.getPage(i)).getTextContent()).items));
    if (!pages.flat().length) return { error: 'This PDF has no readable text (it may be a scan). Build the hero in the creator instead.' };
    return { founds: QBHeroImport.splitHeroes(pages, data).map(lines => QBHeroImport.fromText(lines, data)) };
  }
  return QBHeroImport.fromJson(await file.text(), data);
}
// target: 'mine' (My heroes) or 'party' (the open campaign, DM mode)
function hiDialog(target) {
  const dlg = openDialog('Import a hero', `<p>Choose a character sheet: a <b>PDF</b> (fillable sheets, D&amp;D Beyond’s PDF export, or text sheets like the Night Shift ones, in English or German), a <b>D&amp;D Beyond</b> character file, or a <b>Foundry VTT</b> actor export (.json).</p>
    <label class="btn primary">Choose a file…<input type="file" id="hi-file" accept=".pdf,.json,application/pdf,application/json" hidden></label>
    <details><summary>From D&amp;D Beyond</summary><p class="small">Paste the character’s link. The character must be public (D&amp;D Beyond: Edit → Home → Character Privacy: Public).</p>
      <div class="row"><input id="hi-ddb" placeholder="https://www.dndbeyond.com/characters/12345678" style="flex:1"><button class="btn" id="hi-ddb-go">Get it</button></div><p class="small" id="hi-ddb-help"></p></details>
    <div id="hi-out" aria-live="polite"></div>`, { wide: true });
  const out = dlg.querySelector('#hi-out'), show = h => { out.innerHTML = h; };
  const done = (found, box) => {
    const show = h => { box.innerHTML = h; }, out = box, left = () => out.parentElement.querySelectorAll('[data-hi-open]').length;
    const finish = msg => { out.innerHTML = `<p class="small">✓ ${esc(msg)}</p>`; out.removeAttribute('data-hi-open'); toast(msg); if (!left()) { dlg.close(); render(); } };
    QBHeroRules.setHomebrew(QBHomebrew.forCreator(S.homebrew, {}));
    const r = QBHeroImport.toBuild(found, QBHeroRules, globalThis.QBSPELLS);
    if (r.error) return show(`<p class="cl-error">${esc(r.error)}</p>`);
    crKeepHomebrew(r.build);
    const s = r.sheet, diff = r.compare.filter(x => !x.same), same = r.compare.length - diff.length;
    show(`<hr><h3>${esc(r.build.name)}</h3><p>${esc(s.species)} · ${esc(s.cls)} ${s.level}${s.subclass ? ' (' + esc(s.subclass) + ')' : ''} · ${esc(s.background)} <span class="small muted">· read from ${esc(r.source)}</span></p>
      <p class="small">${same} of ${r.compare.length} numbers match the sheet${diff.length ? '; these differ:' : '.'}</p>
      ${diff.length ? `<table class="cr-table"><tr><th></th><th>Sheet</th><th>Quillbound</th></tr>${diff.map(x => `<tr><td>${esc(x.what)}</td><td>${esc(x.sheet)}</td><td>${esc(x.ours)}</td></tr>`).join('')}</table>` : ''}
      ${r.check.length ? `<p class="small"><b>Check these:</b></p><ul class="small">${r.check.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <p class="small muted">Differences usually come from house rules, a choice the sheet doesn’t show, or rules Quillbound calculates differently. Open the hero in the creator to change anything.</p>
      <div class="row">${target === 'party' ? '<button class="btn primary" id="hi-party">Add to the party</button>' : '<button class="btn primary" id="hi-mine">Save to My heroes</button>'}<button class="btn" id="hi-edit">Open in the creator</button></div>`);
    const hero = { id: uid('ph'), build: r.build, story: { want: '', fear: '', left: '' }, saved: Date.now() };
    out.querySelector('#hi-mine')?.addEventListener('click', () => { S.myHeroes ??= []; S.myHeroes.push(hero); S.tab = 'heroes'; finish(`${hero.build.name} is in My heroes.`); });
    out.querySelector('#hi-party')?.addEventListener('click', () => { cmAddHero({ hero: { ...hero, name: hero.build.name } }); finish(`${hero.build.name} joined the party.`); });
    out.querySelector('#hi-edit').addEventListener('click', () => { S.creator = crRestoreSelections({ ...crNew(), build: JSON.parse(JSON.stringify(hero.build)), step: 'review', ...(target === 'mine' ? { heroId: hero.id } : {}) }); /* keep the imported increases and level-up choices */ if (target === 'mine') { S.myHeroes ??= []; S.myHeroes.push(hero); } dlg.close(); S.tab = 'create'; render(); window.scrollTo(0, 0); });
  };
  const handle = r => { if (r.error) return show(`<p class="cl-error">${esc(r.error)}</p>`); if (r.quillbound) return show('<p class="cl-error">This is a Quillbound hero file: use <b>Open a hero file…</b> (My heroes) or <b>Add hero files…</b> (Campaigns) instead.</p>');
    const list = r.founds || [r.found]; show(list.length > 1 ? `<p class="small">${list.length} heroes in this file.</p>` : '');
    for (const found of list) { const box = document.createElement('div'); box.setAttribute('data-hi-open', ''); out.append(box); done(found, box); } };
  dlg.querySelector('#hi-file').addEventListener('change', e => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; show('<p class="small">Reading…</p>');
    const go = () => hiRead(file).then(handle).catch(er => show(`<p class="cl-error">${esc(er.message || 'This file could not be read.')}</p>`));
    if (crSpells(go)) go(); }); // the spell list loads first, so the hero's spells can be matched
  // D&D Beyond: try its character service directly; if the browser may not, explain how to save the file.
  dlg.querySelector('#hi-ddb-go').addEventListener('click', () => {
    const id = (dlg.querySelector('#hi-ddb').value.match(/(\d{4,})/) || [])[1], help = dlg.querySelector('#hi-ddb-help');
    if (!id) { help.textContent = 'Paste the character’s link (it ends in a number).'; return; }
    const url = `https://character-service.dndbeyond.com/character/v5/character/${id}`;
    help.textContent = 'Fetching…';
    fetch(url).then(r => r.ok ? r.text() : Promise.reject(r.status)).then(text => { help.textContent = ''; handle(QBHeroImport.fromJson(text, QBHeroRules.data())); })
      .catch(() => { help.innerHTML = `D&amp;D Beyond doesn’t let this page fetch it directly. Open <a href="${esc(url)}" target="_blank" rel="noopener">the character’s data</a>, save it with Ctrl+S as a .json file, then choose that file above.`; });
  });
}
