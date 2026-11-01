// Printable character sheet: two A4 pages built from a derived hero sheet (QBHeroRules.derive), in German or English.
// The app shows it in an overlay and the browser prints it, or saves it as PDF. Rules text from the data (features,
// feats, spells) stays in English; the sheet's own labels follow the chosen language.
(function (root) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sign = n => (n >= 0 ? '+' : '') + n;
  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const T = {
    de: { abil: { STR: 'ST', DEX: 'GE', CON: 'KO', INT: 'IN', WIS: 'WE', CHA: 'CH' }, ac: 'Rüstungsklasse', hp: 'Trefferpunkte', speed: 'Tempo', prof: 'Übungsbonus', stamina: 'Stamina',
      init: 'Initiative', passive: 'Passive Wahrnehmung', saves: 'Rettungswürfe', skills: 'Fertigkeiten', attacks: 'Angriffe', gear: 'Ausrüstung', tools: 'Werkzeuge',
      features: 'Merkmale & Talente', spells: 'Zauber', spellAbility: 'Zauberattribut', dc: 'Zauber-SG', spellAtk: 'Zauberangriff', slots: 'Zauberplätze', cantrips: 'Zaubertricks',
      prepared: 'Vorbereitet', hitDice: 'Trefferwürfel', deathSaves: 'Todesrettungswürfe', success: 'Erfolge', fail: 'Fehlschläge', notes: 'Notizen', story: 'Persönlichkeit',
      want: 'Will', fear: 'Fürchtet', page: 'Seite', level: 'Stufe', proficient: 'geübt', expert: 'Expertise', table: 'Quillbound · direkt am Tisch', gp: 'GM',
      tableText: 'Abwehr: W20 + (RK − 10) muss 11 + Angriffsbonus des Feindes übertreffen. Treffer: Wurf ≥ RK des Ziels; bis 5 darunter ist ein Streifer (halber Schaden, das Ziel kann zurückschlagen). Push: 1 Stamina für +1W4 auf einen eigenen Wurf; ohne Stamina kostet ein Push einen Trefferwürfel.',
      speedOf: ft => `${Math.round(ft * 0.3 * 10) / 10} m`, size: { Tiny: 'Winzig', Small: 'Klein', Medium: 'Mittelgroß', Large: 'Groß' }, of: 'von', none: '—', from: 'Herkunft', sub: 'Unterklasse', bg: 'Hintergrund' },
    en: { abil: { STR: 'STR', DEX: 'DEX', CON: 'CON', INT: 'INT', WIS: 'WIS', CHA: 'CHA' }, ac: 'Armor Class', hp: 'Hit Points', speed: 'Speed', prof: 'Proficiency', stamina: 'Stamina',
      init: 'Initiative', passive: 'Passive Perception', saves: 'Saving Throws', skills: 'Skills', attacks: 'Attacks', gear: 'Equipment', tools: 'Tools',
      features: 'Features & Feats', spells: 'Spells', spellAbility: 'Spellcasting ability', dc: 'Spell save DC', spellAtk: 'Spell attack', slots: 'Spell slots', cantrips: 'Cantrips',
      prepared: 'Prepared', hitDice: 'Hit Dice', deathSaves: 'Death Saves', success: 'Successes', fail: 'Failures', notes: 'Notes', story: 'Personality',
      want: 'Wants', fear: 'Fears', page: 'Page', level: 'Level', proficient: 'proficient', expert: 'expertise', table: 'Quillbound · at the table', gp: 'GP',
      tableText: 'Defense: d20 + (AC − 10) must beat 11 + the enemy’s attack bonus. Hit: roll ≥ the target’s AC; up to 5 below is a graze (half damage, and the target may strike back). Push: 1 stamina for +1d4 on your own roll; with no stamina left a push costs a Hit Die.',
      speedOf: ft => `${ft} ft`, size: {}, of: 'of', none: '—', from: 'Species', sub: 'Subclass', bg: 'Background' }
  };
  // German skill names as on the Night Shift sheets
  const SKILL_DE = { acrobatics: 'Akrobatik', 'animal-handling': 'Mit Tieren umgehen', arcana: 'Arkane Kunde', athletics: 'Athletik', deception: 'Täuschen', history: 'Geschichte',
    insight: 'Menschenkenntnis', intimidation: 'Einschüchtern', investigation: 'Nachforschungen', medicine: 'Heilkunde', nature: 'Naturkunde', perception: 'Wahrnehmung',
    performance: 'Auftreten', persuasion: 'Überreden', religion: 'Religion', 'sleight-of-hand': 'Fingerfertigkeit', stealth: 'Heimlichkeit', survival: 'Überleben' };
  const DMG_DE = { Acid: 'Säure', Bludgeoning: 'Wucht', Cold: 'Kälte', Fire: 'Feuer', Force: 'Energie', Lightning: 'Blitz', Necrotic: 'Nekrotisch', Piercing: 'Stich', Poison: 'Gift',
    Psychic: 'Psychisch', Radiant: 'Gleißend', Slashing: 'Hieb', Thunder: 'Schall' };
  // Shorten long rules text for the sheet: whole sentences up to about n characters, markdown markers removed.
  const brief = (text, n = 260) => { const t = String(text || '').replace(/\*\*?/g, '').replace(/\s*\n\s*/g, ' ').replace(/(\w)- (\w)/g, '$1$2').trim(); if (t.length <= n) return t;
    const cut = t.slice(0, n), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.)')); return (end > n * 0.4 ? cut.slice(0, end + 1) : cut.trimEnd()) + ' …'; };
  const boxes = (n, label) => `<span class="ps-boxes" aria-label="${esc(label)}">${'☐'.repeat(Math.max(0, n))}</span>`;

  // s: derived sheet; opts: { lang, spells: [{name, level}], story: {want, fear, look}, featNames: {id: name} }
  function html(s, opts = {}) {
    const L = T[opts.lang === 'en' ? 'en' : 'de'], de = L === T.de;
    const skillName = (id, sk) => de ? SKILL_DE[id] || sk.name : sk.name, dmg = t => de ? DMG_DE[t] || t : t;
    const title = [s.species + (s.sub ? ' (' + s.sub + ')' : '') + (s.size ? ', ' + (L.size[s.size] || s.size) : ''), `${s.cls} ${s.level}${s.subclass ? ' (' + s.subclass + ')' : ''}`, s.background].filter(Boolean).join(' · ');
    const stat = (label, value) => `<div class="ps-stat"><div class="ps-v">${esc(value)}</div><div class="ps-l">${esc(label)}</div></div>`;
    const abil = ABIL.map(k => `<div class="ps-abil"><div class="ps-l">${L.abil[k]}</div><div class="ps-mod">${sign(s.mods[k])}</div><div class="ps-score">${s.scores[k]}</div></div>`).join('');
    const saves = ABIL.map(k => `<li><span class="ps-dot ${s.saves[k].prof ? 'on' : ''}"></span>${L.abil[k]}<b>${sign(s.saves[k].bonus)}</b></li>`).join('');
    const skills = Object.entries(s.skills).map(([id, sk]) => ({ id, sk, name: skillName(id, sk) })).sort((a, b) => a.name.localeCompare(b.name, de ? 'de' : 'en'))
      .map(({ sk, name }) => `<li><span class="ps-dot ${sk.expert ? 'ex' : sk.prof ? 'on' : ''}"></span>${esc(name)} <span class="ps-ab">${L.abil[sk.ability]}</span><b>${sign(sk.bonus)}</b></li>`).join('');
    const attacks = (s.attacks || []).map(a => `<tr><td>${esc(a.name)}${a.count > 1 ? ` ×${a.count}` : ''}</td><td>${a.save ? esc((de ? 'RW ' : 'save ') + L.abil[a.save]) : sign(a.bonus)}</td><td>${esc(a.damage)} ${esc(dmg(a.type))}</td></tr>`).join('');
    const gear = (s.gear?.items || []).map(i => esc(i.name) + (i.count > 1 ? ' ×' + i.count : '')).join(', ');
    const sc = s.spellcasting;
    const spellList = (opts.spells || []).slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    const spells = sc ? `<section class="ps-box"><h3>${L.spells}</h3><div class="ps-row">${stat(L.spellAbility, L.abil[sc.ability] || sc.ability)}${stat(L.dc, sc.dc)}${stat(L.spellAtk, sign(sc.attack))}</div>
      <p><b>${L.slots}:</b> ${sc.slots.map((n, i) => n ? `${i + 1}. ${boxes(n, L.slots)}` : '').filter(Boolean).join('  ') || L.none}</p>
      ${spellList.length ? `<p><b>${L.cantrips}:</b> ${esc(spellList.filter(x => !x.level).map(x => x.name).join(', ') || L.none)}</p><p><b>${L.prepared}:</b> ${esc(spellList.filter(x => x.level).map(x => `${x.name} (${x.level})`).join(', ') || L.none)}</p>`
        : `<p class="ps-muted">${L.cantrips} ${sc.cantrips} · ${L.prepared} ${sc.prepared}</p>`}</section>` : '';
    const feats = (s.features || []).map(f => `<li><b>${esc(f.name)}</b>${f.level > 1 ? ` <span class="ps-muted">(${L.level} ${f.level})</span>` : ''}${f.desc ? ': ' + esc(brief(f.desc)) : ''}</li>`).join('');
    const pr=s.proficiencies;
    const training=pr?`<section class="ps-box"><h3>${de?'Übungen & Training':'Proficiencies & Training'}</h3><p><b>${de?'Waffen':'Weapons'}:</b> ${esc(pr.weapons.join(', ') || L.none)}</p><p><b>${de?'Rüstungen & Schilde':'Armor & shields'}:</b> ${esc(pr.armor.join(', ') || L.none)}</p><p><b>${L.tools}:</b> ${esc(pr.tools.join(', ') || L.none)}</p>${pr.granted.length?`<p><b>${de?'Zusätzlich / durch Talente':'Additional / feats'}:</b> ${esc(pr.granted.join(', '))}</p>` : ''}</section>`:'';
    const companions=(s.companions || []).length?`<section class="ps-box"><h3>${de?'Begleiter & Familiars':'Companions & Familiars'}</h3>${s.companions.map(p=>`<p><b>${esc(p.name)}</b> · ${esc(p.kind)}${p.ac!==null?' · '+L.ac+' '+p.ac:''}${p.hp!==null?' · '+L.hp+' '+p.hp:''}${p.speed?' · '+esc(p.speed):''}<br>${esc(brief(p.notes,1200))}</p>`).join('')}</section>`:'';
    const customItems=(s.customItems || []).length?`<section class="ps-box"><h3>Homebrew</h3>${s.customItems.map(x=>`<p><b>${esc(x.name)} ×${x.quantity}</b> · ${esc(x.rarity)}${x.attunement?' · '+(de?'Einstimmung erforderlich':'Requires attunement'):''}${x.maxCharges>0?' · '+x.charges+'/'+x.maxCharges:''}<br>${esc(brief(x.description,1600))}</p>`).join('')}</section>`:'';
    const st = opts.story || {};
    const head = n => `<header class="ps-head"><div><h1>${esc(s.name || 'Hero')}</h1><p>${esc(title)}</p></div><div class="ps-page">${L.page} ${n}</div></header>`;
    return `<article class="ps-sheet" lang="${de ? 'de' : 'en'}">
  <section class="ps-pg">${head(1)}
    <div class="ps-abils">${abil}</div>
    <div class="ps-row">${stat(L.ac, s.ac)}${stat(L.hp, s.hp.max)}${stat(L.speed, L.speedOf(s.speed))}${stat(L.prof, sign(s.prof))}${stat(L.init, sign(s.initiative))}${stat(L.passive, s.passive)}</div>
    <div class="ps-cols">
      <div><section class="ps-box"><h3>${L.saves}</h3><ul class="ps-list">${saves}</ul></section><section class="ps-box"><h3>${L.skills}</h3><ul class="ps-list">${skills}</ul>
        <p class="ps-muted"><span class="ps-dot on"></span> ${L.proficient} <span class="ps-dot ex"></span> ${L.expert}</p></section></div>
      <div><section class="ps-box"><h3>${L.attacks}</h3><table class="ps-table">${attacks || `<tr><td>${L.none}</td></tr>`}</table></section>
        <section class="ps-box ps-track"><p><b>${L.hp}:</b> ____ / ${s.hp.max}  <b>Temp:</b> ____</p><p><b>${L.stamina}:</b> ${boxes(s.stamina, L.stamina)}  <b>${L.hitDice}:</b> ${s.hitDice.count}d${s.hitDice.die} ${boxes(s.hitDice.count, L.hitDice)}</p>
          <p><b>${L.deathSaves}:</b> ${L.success} ${boxes(3, L.success)}  ${L.fail} ${boxes(3, L.fail)}</p></section>
        <section class="ps-box"><h3>${L.gear}</h3><p>${gear || L.none}${s.gear?.gp != null ? ` · ${s.gear.gp} ${L.gp}` : ''}</p>${(s.tools || []).length ? `<p><b>${L.tools}:</b> ${esc(s.tools.join(', '))}</p>` : ''}</section>
        ${training}${(st.want || st.fear || st.look) ? `<section class="ps-box"><h3>${L.story}</h3>${st.look ? `<p>${esc(st.look)}</p>` : ''}${st.want ? `<p><b>${L.want}:</b> ${esc(st.want)}</p>` : ''}${st.fear ? `<p><b>${L.fear}:</b> ${esc(st.fear)}</p>` : ''}</section>` : ''}
        <section class="ps-box ps-table-rules"><h3>${L.table}</h3><p>${L.tableText}</p></section></div>
    </div></section>
  <section class="ps-pg">${head(2)}
    ${spells}
    ${companions}${customItems}
    <section class="ps-box"><h3>${L.features}</h3><ul class="ps-feats">${feats}</ul></section>
    <section class="ps-box ps-notes"><h3>${L.notes}</h3>${'<div class="ps-line"></div>'.repeat(6)}</section>
    <footer class="ps-foot">Quillbound · D&amp;D 2024 (SRD 5.2, CC-BY 4.0)</footer></section>
</article>`;
  }
  root.QBSheet = { html, brief, SKILL_DE };
})(globalThis);
