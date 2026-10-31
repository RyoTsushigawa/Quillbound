/* Public data is constructed field by field. Never pass campaign state to this feed. */
(function (root) {
  const text = value => typeof value === 'string' ? value.slice(0, 20000) : '';
  const rows = value => Array.isArray(value) ? value : [];
  function snapshot(state, spotlight) {
    const result = { version: 1, updated: Date.now(), cards: [], party: [], combat: null, spotlight: null };
    if(state.securityAlert?.shared===true)result.securityAlert={value:Math.max(0,Math.min(6,Math.round(Number(state.securityAlert.value)||0))),max:6};
    result.rolls = rows(state.publicRolls).slice(-8).map(r => ({ die: Number(r.die), total: Number(r.total), band: text(r.band), roller: text(r.roller), dice: rows(r.dice).map(Number) }));
    for (const kind of ['beats', 'hooks', 'npcs', 'items']) {
      for (const record of rows(state[kind])) {
        const shared = record.player;
        if (!shared || shared.visible !== true) continue;
        result.cards.push({ kind, id: text(record.id), title: text(shared.title), text: text(shared.text) });
      }
    }
    if (state.playerSettings?.party === true) result.party = rows(state.party).map(p => ({ name: text(p.name), class: text(p.cls), ancestry: text(p.anc), conditions: rows(p.conds).filter(Boolean).map(text) }));
    if (state.playerSettings?.combat === true && state.combat) {
      const c = state.combat;
      const l = c.lite;
      const position = id => text(l?.zones?.[l?.positions?.[id]] || '');
      const conditions = a => rows(l?.conditions?.[a.id] || a.marks).map(text).concat(l?.protected?.[a.id] ? ['Protected'] : [], l?.openings?.[a.id] ? ['Opening'] : []);
      const conditionHelp = a => conditions(a).map(label => root.ConditionGuide?.get(label,l?.conditionNotes?.[a.id]?.[label]) || ({name:label,description:'Resolve this condition with your DM.',clears:'Resolve its cause in the scene.'}));
      // Heroes: exact HP and stamina (players track them anyway). Enemies: a state only, never their numbers.
      const foeState = f => {
        if (f.status && f.status !== 'fighting') return text(f.status);
        const hp = Number(f.hpNow), max = Number(f.hpMax);
        if (!Number.isFinite(hp) || !Number.isFinite(max) || max <= 0) return 'fighting';
        if (hp <= 0) return 'down';
        if (l?.breaking?.[f.id] || l?.breaking?.[f.group] || (!l?.broke?.[f.id] && !l?.broke?.[f.group] && Number.isFinite(f.breakHp) && hp <= f.breakHp)) return 'wavering';
        return hp <= max / 2 ? 'bloodied' : hp < max ? 'hurt' : 'fresh';
      };
      result.combat = { round: Number(c.round) || 1,
        heroes: rows(state.party).map(p => ({ name: text(p.name), hp: Number(p.hpNow) || 0, hpMax: Number(p.hp) || 0, stamina: Number(p.stamina) || 0, staminaMax: Number(p.prof) || 0, dying: p.dead ? 'dead' : Number(p.hpNow) <= 0 ? 'dying' : '', position: position(p.id), conditions: conditions(p), conditionHelp: conditionHelp(p) })),
        foes: rows(c.foes).filter(f => f.concealed !== true).map(f => ({ name: text(f.publicName || f.name), state: foeState(f), conditions: conditions(f), position: position(f.id), conditionHelp: conditionHelp(f) })),
        clues: rows(c.design?.discoveries).filter(x => x.shared === true).map(x => ({text:text(x.text),hero:text(x.heroName)})),
        clocks: rows(c.design?.clocks).filter(x => x.shared === true && c.design?.mode !== 'simple').map(x => ({name:text(x.publicName),filled:Number(x.filled)||0,size:Number(x.size)||1})),
        objectives: rows(c.design?.objectives).filter(x=>x.shared===true&&text(x.publicName)).map(x=>{const size=Math.max(1,Math.min(12,Math.trunc(Number(x.size)||1)));return {name:text(x.publicName),filled:Math.max(0,Math.min(size,Math.trunc(Number(x.filled)||0))),size};}),
        roll: l?.lastRoll ? { die: Number(l.lastRoll.die), total: Number(l.lastRoll.total), band: text(l.lastRoll.band), roller: text(l.lastRoll.roller) } : null };
    }
    if (spotlight?.type === 'text') result.spotlight = { type: 'text', title: text(spotlight.title), text: text(spotlight.text) };
    if (spotlight?.type === 'image' && /^data:image\/(png|jpeg|webp);base64,/.test(spotlight.url || '')) result.spotlight = { type: 'image', title: text(spotlight.title), url: spotlight.url };
    return result;
  }
  function escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function conditionDetails(a) { return rows(a.conditionHelp).map(info => '<details><summary>'+escape(info.name)+'</summary><p>'+escape(info.description)+'</p><p>Clears: '+escape(info.clears)+'</p></details>').join(''); }
  function view(data) {
    const e = escape, groups = { beats: 'Scenes', hooks: 'Leads', npcs: 'People', items: 'Items' };
    let html = '';
    if(data.securityAlert){const n=Math.max(0,Math.min(6,Math.round(Number(data.securityAlert.value)||0)));html+=`<section class="sec-public sec-level-${n}"><h2>Security alert · ${n}/6</h2><div class="sec-track" role="meter" aria-label="Security alert" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${n}">${Array.from({length:6},(_,i)=>`<span class="${i<n?'filled':''}" aria-hidden="true"></span>`).join('')}</div></section>`;}
    if(rows(data.rolls).length) html += '<section><h2>Public dice</h2>'+rows(data.rolls).slice().reverse().map(r=>'<div class="public-roll '+(r.die===20?'critical':r.die===1?'disaster':'')+'"><b>'+e(r.die)+'</b><span>'+e(r.die===20?'NATURAL 20!':r.die===1?'NATURAL 1!':'d20')+' · '+e(r.roller)+' · total '+e(r.total)+(rows(r.dice).length>1?' · dice '+e(r.dice.join(' / ')):'')+'</span></div>').join('')+'</section>';
    if (data.spotlight?.type === 'image') html += `<section class="spotlight"><h2>${e(data.spotlight.title)}</h2><img alt="Shared map or handout" src="${e(data.spotlight.url)}"></section>`;
    if (data.spotlight?.type === 'text') html += `<section class="spotlight"><h2>${e(data.spotlight.title)}</h2><p>${e(data.spotlight.text)}</p></section>`;
    if (data.combat) {
      const c=data.combat, r=c.roll;
      html += '<section><h2>Combat · Round '+e(c.round)+'</h2>';
      html += rows(c.clues).map(x=>'<article><h3>Noticed by '+e(x.hero)+'</h3><p>'+e(x.text)+'</p></article>').join('');
      html += rows(c.clocks).map(x=>'<p>'+e(x.name)+': '+e(x.filled)+' / '+e(x.size)+'</p>').join('');
      html += rows(c.objectives).map(x=>'<p><b>'+e(x.name)+'</b>: '+e(x.filled)+' / '+e(x.size)+'</p>').join('');
      const STATE = { fresh:'Fresh', hurt:'Hurt', bloodied:'Bloodied', wavering:'Wavering: close to giving up', down:'Down', fled:'Fled', surrendered:'Surrendered', bargained:'Made a deal', fighting:'In the fight' };
      html += '<div class="cards">'+rows(c.heroes).map(p=>'<article><h3>'+e(p.name)+'</h3><p>'+e(p.position)+'</p><p>HP '+e(p.hp)+' / '+e(p.hpMax)+(p.dying?' · '+e(p.dying==='dead'?'Dead':'Dying'):'')+'</p><p>Stamina '+e(p.stamina)+' / '+e(p.staminaMax)+(p.stamina===0?' · Winded':'')+'</p><p>'+e(rows(p.conditions).join(' · '))+'</p>'+conditionDetails(p)+'</article>').join('')+rows(c.foes).map(f=>'<article><h3>'+e(f.name)+'</h3><p>'+e(f.position)+'</p><p>'+e(STATE[f.state]||f.state)+'</p><p>'+e(rows(f.conditions).join(' · '))+'</p>'+conditionDetails(f)+'</article>').join('')+'</div></section>';
    }
    if (data.party.length) html += `<section><h2>The party</h2><div class="cards">${data.party.map(p => `<article><h3>${e(p.name)}</h3><p>${e([p.class,p.ancestry].filter(Boolean).join(' · '))}</p><p>${e(p.conditions.join(' · '))}</p></article>`).join('')}</div></section>`;
    for (const [kind, title] of Object.entries(groups)) {
      const cards = rows(data.cards).filter(c => c.kind === kind);
      if (cards.length) html += `<section><h2>${title}</h2><div class="cards">${cards.map(c => `<article><h3>${e(c.title)}</h3><p>${e(c.text)}</p></article>`).join('')}</div></section>`;
    }
    return html || '<section class="waiting"><h2>The adventure awaits</h2><p>Your DM will reveal maps, people and clues here.</p></section>';
  }
  root.PlayerFeed = { snapshot, escape, view };
})(globalThis);
