/* Private plans and discovery records are never sent wholesale to the player feed. */
(function(root) {
  function init(s) {
    if (!s.combat) return null;
    const c = s.combat;
    c.design ??= { mode: 'simple', clues: [], discoveries: [], clocks: [], phases: [] };
    for (const f of c.foes) { f.concealed ??= false; f.privatePlan ??= ''; f.observableTell ??= ''; f.publicName ??= f.name.split(' – ')[0]; }
    return c.design;
  }
  function passive(p) {
    const bonus = Number.isFinite(Number(p.perceptionBonus)) && p.perceptionBonus !== '' ? Number(p.perceptionBonus) : Math.floor(((Number(p.abil?.WIS) || 10) - 10) / 2);
    return 10 + bonus + (p.perceptionState === 'advantage' ? 5 : p.perceptionState === 'disadvantage' ? -5 : 0);
  }
  function eligible(s, clue) {
    return s.party.filter(p => root.Stakes.active(s,p) && (clue.zone === 'any' || s.combat.lite.positions[p.id] === clue.zone)).map(p => ({ id:p.id, name:p.name, passive:passive(p), layers:clue.layers.filter(l => passive(p) >= Number(l.dc) && l.text.trim()) }));
  }
  function discover(s, clueId, heroId, layerIndex) {
    const d = init(s), clue = d.clues.find(c => c.id === clueId), p = s.party.find(p => p.id === heroId);
    const match = clue && eligible(s,clue).find(x => x.id === heroId);
    const layer = clue?.layers[layerIndex];
    if (!p || !layer || !match?.layers.includes(layer)) throw Error('That hero does not meet this clue’s awareness and location requirements.');
    if (d.discoveries.some(x => x.clue === clueId && x.hero === heroId && x.layer === layerIndex)) return;
    root.Stakes.remember(s);
    d.discoveries.push({ id:root.crypto.randomUUID(), clue:clueId, hero:heroId, heroName:p.name, layer:layerIndex, text:layer.text, shared:false });
  }
  function clock(s,id,delta) {
    const d=init(s), c=d.clocks.find(c=>c.id===id);
    if (!c) return;
    root.Stakes.remember(s); c.filled=Math.max(0,Math.min(c.size,c.filled+delta));
    root.Stakes.log(s,`${c.name}: ${c.filled}/${c.size}.${c.filled===c.size?' '+c.outcome:''}`);
  }
  function phase(s,id) {
    const d=init(s), p=d.phases.find(p=>p.id===id);
    if (!p || p.triggered) return;
    root.Stakes.remember(s); p.triggered=true;
    root.Stakes.log(s,'Phase: '+p.name+'. '+p.change);
  }
  // Three or more matching enemies become one group: one card, each member keeps its own HP, and the group
  // breaks when half of it is down.
  function groupMinions(s) {
    init(s); const l=root.Stakes.init(s), groups=new Map();
    if(l.pending)throw Error('Finish the current roll first.');
    for(const f of s.combat.foes) {
      if(f.group||f.status!=='fighting'||l.acted[f.id]||f.hpNow<f.hpMax||l.conditions[f.id]?.length||l.protected[f.id]||l.openings[f.id])continue;
      const name=f.name.replace(/\s+\d+$/,'');
      const key=JSON.stringify([name,l.positions[f.id],f.concealed,f.privatePlan,f.observableTell]);
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);
    }
    const eligible=[...groups.values()].filter(g=>g.length>=3);
    if(!eligible.length)throw Error('Use at least three matching, unhurt enemies in the same area, with the same visibility and plan, before they act.');
    root.Stakes.remember(s);
    for(const group of eligible){
      const id='g-'+group[0].id, name=group[0].name.replace(/\s+\d+$/,'');
      for(const f of group){f.group=id;f.groupName=name;}
      root.Stakes.log(s,`${name} ×${group.length}: one card for the group; each keeps its own HP, and the group breaks when half of it is down.`);
    }
  }
  root.EncounterDesign={init,passive,eligible,discover,clock,phase,groupMinions};
})(globalThis);
