/* Private plans and discovery records are never sent wholesale to the player feed. */
(function(root) {
  function init(s) {
    if (!s.combat) return null;
    const c = s.combat;
    c.design ??= { mode: 'simple', clues: [], discoveries: [], clocks: [], phases: [], objectives: [] };
    for(const key of ['clues','discoveries','clocks','phases','objectives'])if(!Array.isArray(c.design[key]))c.design[key]=[];
    for (const f of c.foes) { f.concealed ??= false; f.privatePlan ??= ''; f.observableTell ??= ''; f.publicName ??= f.name.split(' – ')[0]; }
    return c.design;
  }
  // Prepared encounters are templates. Live progress must never mutate the saved encounter.
  function start(s,enc) {
    if(enc.design)s.combat.design=JSON.parse(JSON.stringify(enc.design));
    const d=init(s),l=root.Stakes.init(s);
    for(const key of ['cover','center','objective'])if(typeof enc.zones?.[key]==='string'&&enc.zones[key].trim())l.zones[key]=enc.zones[key].slice(0,100);
    for(const f of s.combat.foes)if(['cover','center','objective'].includes(f.startZone))l.positions[f.id]=f.startZone;
    return d;
  }
  const size=o=>Math.max(1,Math.min(12,Math.trunc(Number(o.size)||1)));
  const progress=o=>Math.max(0,Math.min(size(o),Math.trunc(Number(o.filled)||0)));
  const complete=o=>progress(o)>=size(o);
  function objective(s,id){return init(s)?.objectives.find(o=>o.id===id);}
  function objectiveReady(s,id,heroId) {
    const d=init(s),o=objective(s,id),a=s.party.find(p=>p.id===heroId),l=root.Stakes.init(s);
    if(!o)return {ok:false,why:'This objective is no longer available.'};
    if(complete(o))return {ok:false,why:'This objective is already complete.'};
    if(!a||!root.Stakes.active(s,a))return {ok:false,why:'Choose a hero who can act.'};
    if(l.pending)return {ok:false,why:'Confirm or cancel the current roll first.'};
    if(l.acted[a.id])return {ok:false,why:'This hero has acted. Choose another or start the next round.'};
    const missing=(o.requires||[]).filter(id=>!d.objectives.some(x=>x.id===id&&complete(x)));
    if(missing.length)return {ok:false,why:'First complete: '+missing.map(id=>objective(s,id)?.name||id).join(', ')+'.'};
    if(o.zone&&o.zone!=='any'&&l.positions[a.id]!==o.zone)return {ok:false,why:'Reach '+(l.zones[o.zone]||o.zone)+' first. Use Move if getting there is risky.'};
    return {ok:true,objective:o,hero:a};
  }
  function chooseObjective(s,id,heroId) {
    const check=objectiveReady(s,id,heroId);if(!check.ok)throw Error(check.why);
    if(check.objective.automatic)throw Error('This task uses an action without a roll.');
    const o=check.objective,abilities=(o.abilities||['INT']).filter(k=>['STR','DEX','CON','INT','WIS','CHA'].includes(k));
    const ability=abilities.sort((a,b)=>(check.hero.abil?.[b]||10)-(check.hero.abil?.[a]||10))[0]||'INT';
    Object.assign(root.Stakes.init(s).draft,{actor:heroId,mode:'hero',action:'improvise',effect:'objective',target:'',objectiveId:id,objectiveAbility:ability,objectiveTrained:false,objectiveBonus:'',intent:o.description||o.name,stakes:o.stakes||''});
  }
  function validateObjective(s,p,confirm=false) {
    // At confirm the pending exchange is expected; no other mutation may bypass prerequisites.
    const l=root.Stakes.init(s),pending=l.pending;if(confirm)l.pending=null;
    let check;try{check=objectiveReady(s,p.objectiveId,p.actor);}finally{if(confirm)l.pending=pending;}
    if(!check.ok)throw Error(check.why);
    if(check.objective.automatic)throw Error('This objective does not take a roll.');
    const allowed=(check.objective.abilities||['INT']);if(!allowed.includes(p.objectiveAbility))throw Error('Choose one of this objective’s abilities.');
    return check.objective;
  }
  function advanceObjective(s,p) {
    const o=objective(s,p.objectiveId);if(!o)return '';
    o.filled=Math.min(size(o),progress(o)+1);
    return `${o.name}: ${o.filled}/${size(o)}.${complete(o)&&o.success?' DM: '+o.success:''}`;
  }
  function automaticObjective(s,id,heroId) {
    const check=objectiveReady(s,id,heroId);if(!check.ok)throw Error(check.why);
    if(!check.objective.automatic)throw Error('Roll for this objective instead.');
    root.Stakes.remember(s);const text=advanceObjective(s,{objectiveId:id});
    root.Stakes.init(s).acted[heroId]=true;root.Stakes.log(s,check.hero.name+' uses an action without a roll. '+text);
  }
  function adjustObjective(s,id,delta) {
    if(root.Stakes.init(s).pending)throw Error('Confirm or cancel the current roll first.');
    const o=objective(s,id);if(!o)return;root.Stakes.remember(s);o.filled=Math.max(0,Math.min(size(o),progress(o)+delta));root.Stakes.log(s,`DM adjustment: ${o.name} ${o.filled}/${size(o)}.`);
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
  root.EncounterDesign={init,start,passive,eligible,discover,clock,phase,groupMinions,objective,objectiveReady,chooseObjective,validateObjective,advanceObjective,automaticObjective,adjustObjective,complete,size,progress};
})(globalThis);
