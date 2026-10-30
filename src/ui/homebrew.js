/* Quillbound Homebrew screen and printable character sheet: moved out of index.html so character creation and combat can change independently
   (see AGENTS.md). A plain script, loaded before the main script in index.html: it only defines functions and constants,
   and uses the main script's globals (S, esc, render, toast, …) when they run. Rules: src/app/homebrew.js; sheet layout: src/app/sheet-export.js. */
/* ---------- views: homebrew (rules and checks in src/app/homebrew.js) ----------
   The DM builds within the 2024 structure; the comparison guides, it never blocks. Approved homebrew reaches the creator. */
// Saving a file: on the published link the viewer only allows saves through its downloads capability (it asks the viewer first); a local copy uses a plain download link.
async function saveFile(name,text,done){
  const dl=window.claude?.use ? await window.claude.use('downloads').catch(()=>null) : null;
  if(dl){ try{ await dl.save({filename:name,data:text}); toast(done); }catch(e){ if(e?.code==='declined') toast('Export cancelled.'); else if(e?.code==='rate_limited') toast('A save is already waiting for your answer.'); else toast('Export is not available here.'); } return; }
  try{ const url=URL.createObjectURL(new Blob([text],{type:'application/json'})), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast(done); }catch{ toast('Export is not available in this browser.'); }
}
function hbState(){ S.homebrew ??= {}; S.homebrew.backgrounds ??= []; S.homebrew.species ??= []; S.homebrew.classes ??= []; S.homebrew.feats ??= []; S.homebrew.subclasses ??= []; return S.homebrew; }
const HB_KINDS=[['backgrounds','Backgrounds',true],['species','Species',true],['classes','Classes',true],['subclasses','Subclasses',true],['feats','Feats',true]];
// Homebrew that ships with Quillbound (src/app/table-homebrew.js), as opposed to a DM's or a player's own.
const hbShipped=id=>['backgrounds','species','classes','feats','subclasses'].some(k=>(globalThis.QB_TABLE_HOMEBREW?.[k]||[]).some(x=>x.id===id));
const hbAll=hb=>[...hb.backgrounds,...hb.species,...hb.classes,...hb.subclasses,...hb.feats];
const hbNew=(k,cls)=>k==='species'?QBHomebrew.newSpecies():k==='classes'?QBHomebrew.newClass():k==='subclasses'?QBHomebrew.newSubclass(cls||''):k==='feats'?QBHomebrew.newFeat():QBHomebrew.newBackground();
function hbCompare(e){
  const D=QBHERO, name=id=>D.skills.find(k=>k.id===id)?.name||id;
  const rows=[...D.backgrounds.map(b=>({name:b.name,ab:b.abilities.join(', '),feat:b.feat?.name||'',skills:b.skills.map(name).join(', '),tool:b.tools[0]||b.toolChoice?.desc.replace(/^Choose one kind of /,'one ')||'',kit:QBHomebrew.kitValue(b.equipment.choices[0]),mine:false})),
    {name:e.name||'Yours',ab:e.abilities.join(', '),feat:D.feats.find(f=>f.id===e.feat)?.name||'—',skills:e.skills.map(name).join(', '),tool:e.tool||'—',kit:QBHomebrew.kitValue(e.kit),mine:true}];
  return `<table class="cr-table"><tr><th>Background</th><th>Raises</th><th>Origin feat</th><th>Skills</th><th>Tool</th><th>Kit (GP)</th></tr>${rows.map(r=>`<tr class="${r.mine?'hb-mine':''}"><td>${esc(r.name)}${r.mine?' <span class="chip acc">yours</span>':''}</td><td>${esc(r.ab)}</td><td>${esc(r.feat)}</td><td>${esc(r.skills)}</td><td>${esc(r.tool)}</td><td>${r.kit}</td></tr>`).join('')}</table>`;
}
function hbEditor(){
  const e=S.hbEdit, D=QBHERO, checks=QBHomebrew.checkBackground(e), ok=checks.every(x=>x.ok), items=Object.entries(D.equipment).filter(([,x])=>x.kind!=='pack').sort((a,b)=>a[1].name.localeCompare(b[1].name));
  const pick=(k,v,on,label,max)=>`<label class="cr-check ${on?'on':''}"><input type="checkbox" data-act="hb-toggle" data-k="${k}" data-v="${esc(v)}" data-max="${max}" ${on?'checked':''}> ${label}</label>`;
  return `<div class="cr-layout"><div class="cr-main">
    <section class="card stack"><label class="f">Name<input data-bind="hbEdit.name" value="${esc(e.name)}" maxlength="80" placeholder="Smuggler, Lighthouse Keeper…"></label>
      <label class="f">What was this life like? (optional, shown to players)<textarea data-bind="hbEdit.desc" rows="3" maxlength="2000">${esc(e.desc)}</textarea></label></section>
    <section class="card stack"><h3>Three abilities it can raise</h3><p class="small muted">Players raise one by 2 and another by 1, or all three by 1. Pick abilities that fit the life it describes.</p><div class="cr-checks">${ABIL.map(k=>pick('abilities',k,e.abilities.includes(k),`${APPROACH[k].name} (${k})`,3)).join('')}</div></section>
    <section class="card stack"><h3>One origin feat</h3><select data-bind="hbEdit.feat" data-rerender>${crOpt('','Choose…',!e.feat)}${QBHeroRules.data().feats.filter(f=>f.type==='origin').map(f=>crOpt(f.id,f.name+(f.homebrew?' (homebrew)':''),e.feat===f.id)).join('')}</select>${e.feat?`<p class="small muted">${esc(firstSentence(D.feats.find(f=>f.id===e.feat)?.desc))}</p>`:''}</section>
    <section class="card stack"><h3>Two skills</h3><div class="cr-checks">${D.skills.map(k=>pick('skills',k.id,e.skills.includes(k.id),`${esc(k.name)} <span class="small muted">${k.ability}</span>`,2)).join('')}</div></section>
    <section class="card stack"><h3>One tool</h3><select data-bind="hbEdit.tool" data-rerender>${crOpt('','Choose…',!e.tool)}${QBHomebrew.tools().map(t=>crOpt(t,t,e.tool===t)).join('')}</select></section>
    <section class="card stack"><h3>Starting kit</h3><p class="small muted">Players take this kit or 50 GP instead. SRD kits are worth 45–56 GP including the gold.</p>
      ${e.kit.items.map((it,i)=>`<div class="row hb-item"><span>${esc(D.equipment[it.id]?.name||it.id)} <span class="small muted">${esc(D.equipment[it.id]?.cost||'')}</span></span><input type="number" min="1" max="99" step="1" data-bind="hbEdit.kit.items.${i}.count" value="${esc(it.count)}" aria-label="How many"><button class="btn sm ghost" data-act="hb-delitem" data-v="${i}" aria-label="Remove">×</button></div>`).join('')||'<p class="small muted">No items yet.</p>'}
      <label class="f">Add an item<select data-act-change="hb-additem">${crOpt('','Choose…',true)}${items.map(([id,x])=>crOpt(id,`${x.name} (${x.cost||'—'})`,false)).join('')}</select></label>
      <label class="f">Gold in the kit<input type="number" min="0" max="100" step="1" data-bind="hbEdit.kit.gp" value="${esc(e.kit.gp)}"></label>
      <p class="cr-count ${QBHomebrew.kitValue(e.kit)>=QBHomebrew.KIT_MIN&&QBHomebrew.kitValue(e.kit)<=QBHomebrew.KIT_MAX?'done':''}">Kit value: ${QBHomebrew.kitValue(e.kit)} GP</p></section>
    <div class="cr-foot"><button class="btn" data-act="hb-cancel">Cancel</button><button class="btn primary" data-act="hb-save">Save background</button></div></div>
    <aside class="cr-sheet"><div class="eyebrow">Compared with the SRD</div><h3>${ok?'Fits the 2024 structure':'Not finished yet'}</h3>
      <ul class="hb-checks">${checks.map(c=>`<li class="${c.ok?'ok':'warn'}">${c.ok?'✓':'⚠'} <b>${esc(c.label)}</b>${c.detail?' · '+esc(c.detail):''}</li>`).join('')}</ul>
      <p class="small muted">${ok?'As balanced as an SRD background by construction. You can still save anything; players only see it after you approve it.':'You can save it as a draft. It stays hidden from players until you approve it.'}</p>
      ${hbCompare(e)}</aside></div>`;
}
// The species editor: a base (size, speed, type) and traits from building blocks; the budget compares it with the SRD species.
const HB_DAMAGE=['Acid','Bludgeoning','Cold','Fire','Force','Lightning','Necrotic','Piercing','Poison','Psychic','Radiant','Slashing','Thunder'];
const HB_CONDITIONS=['Blinded','Charmed','Deafened','Frightened','Grappled','Incapacitated','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned'];
function hbTraitFields(t,i){
  const p=`hbEdit.traits.${i}.`, sel=(k,opts,label)=>`<label class="f">${label}<select data-bind="${p}${k}" data-rerender>${crOpt('','Choose…',!t[k])}${opts.map(o=>Array.isArray(o)?crOpt(o[0],o[1],String(t[k])===String(o[0])):crOpt(o,o,String(t[k])===String(o))).join('')}</select></label>`;
  const txt=(k,label,rows)=>rows?`<label class="f">${label}<textarea data-bind="${p}${k}" rows="${rows}" maxlength="1000">${esc(t[k]||'')}</textarea></label>`:`<label class="f">${label}<input data-bind="${p}${k}" value="${esc(t[k]||'')}" maxlength="80"></label>`;
  const spells=globalThis.QBSPELLS||[];
  switch(t.block){
    case 'darkvision': return sel('range',[['60','60 ft (18 m)'],['120','120 ft (36 m)']],'Range');
    case 'resistance': return sel('damage',HB_DAMAGE,'Damage type');
    case 'saveAdvantage': return sel('condition',HB_CONDITIONS,'Condition');
    case 'skill': return sel('skill',QBHERO.skills.map(k=>[k.id,k.name]),'Skill');
    case 'cantrip': return spells.length?sel('spell',spells.filter(s=>s.level===0).map(s=>[s.id,s.name]),'Cantrip'):'<p class="small muted">Loading spells…</p>';
    case 'spell': return spells.length?sel('spell',spells.filter(s=>s.level>=1&&s.level<=2).map(s=>[s.id,`${s.name} (level ${s.level})`]),'Spell')+sel('level',[['3','From character level 3'],['5','From character level 5']],'Available'):'<p class="small muted">Loading spells…</p>';
    case 'natural': return txt('name','Name (Claws, Bite …)')+sel('dice',['1d4','1d6','1d8'],'Damage die')+sel('type',['Slashing','Piercing','Bludgeoning'],'Damage type')+`<label><input type="checkbox" data-bind="${p}finesse" data-rerender ${t.finesse?'checked':''}> Can use Dexterity (finesse)</label>`;
    case 'custom': case 'drawback': return txt('name','Name')+txt('desc','What it does',2)+sel('weight',[['1',t.block==='drawback'?'Minor (−1)':'Small (1)'],['2',t.block==='drawback'?'Real (−2)':'Strong (2)'],['3',t.block==='drawback'?'Severe (−3)':'Very strong (3)']],t.block==='drawback'?'How much it hurts':'How strong (DM rating)');
    case 'flight': case 'action': case 'minor': return txt('name','Name')+txt('desc','What it does',2);
    default: return '';
  }
}
function hbSpeciesEditor(){
  const e=S.hbEdit, checks=QBHomebrew.checkSpecies(e), ok=checks.every(x=>x.ok), score=QBHomebrew.speciesScore(e), band=QBHomebrew.BAND, srd=QBHomebrew.srdSpeciesScores();
  if(e.traits.some(t=>t.block==='cantrip'||t.block==='spell')) crSpells();
  return `<div class="cr-layout"><div class="cr-main">
    <section class="card stack"><label class="f">Name<input data-bind="hbEdit.name" value="${esc(e.name)}" maxlength="80" placeholder="Vampire, Sea-born, Moth-folk…"></label>
      <label class="f">Who are they? (optional, shown to players)<textarea data-bind="hbEdit.desc" rows="3" maxlength="2000">${esc(e.desc)}</textarea></label>
      <div class="row"><label class="f">Size<select data-bind="hbEdit.size" data-rerender>${['Small','Medium','Small or Medium'].map(x=>crOpt(x,x,e.size===x)).join('')}</select></label>
        <label class="f">Speed<select data-bind="hbEdit.speed" data-rerender>${[25,30,35].map(x=>crOpt(x,x+' ft ('+(x*0.3).toFixed(1).replace('.0','')+' m)',Number(e.speed)===x)).join('')}</select></label>
        <label class="f">Creature type<input data-bind="hbEdit.type" value="${esc(e.type)}" maxlength="40"></label></div></section>
    ${e.traits.map((t,i)=>`<section class="card stack hb-trait"><div class="row" style="justify-content:space-between"><b>${esc(QBHomebrew.BLOCKS[t.block]?.label||t.block)}</b><span class="chip ${QBHomebrew.traitWeight(t)<0?'warn':''}">${QBHomebrew.traitWeight(t)>0?'+':''}${QBHomebrew.traitWeight(t)}</span><button class="btn sm ghost" data-act="hb-deltrait" data-v="${i}" aria-label="Remove trait">×</button></div>${hbTraitFields(t,i)}</section>`).join('')}
    <label class="f">Add a trait<select data-act-change="hb-addtrait">${crOpt('','Choose a building block…',true)}${Object.entries(QBHomebrew.BLOCKS).map(([k,b])=>crOpt(k,`${b.label}`,false)).join('')}</select><span class="small muted">Each block has a weight. SRD species add up to ${band.min}–${band.max}.</span></label>
    <div class="cr-foot"><button class="btn" data-act="hb-cancel">Cancel</button><button class="btn primary" data-act="hb-save">Save species</button></div></div>
    <aside class="cr-sheet"><div class="eyebrow">Compared with the SRD</div><h3>Score ${score} · ${score>band.max?'stronger than every SRD species':score<band.min?'weaker than every SRD species':'within the SRD range'}</h3>
      <div class="hb-meter" role="img" aria-label="Score ${score} on a scale where SRD species score ${band.min} to ${band.max}"><span class="hb-band" style="left:${band.min*100/12}%;width:${(band.max-band.min)*100/12}%"></span><b style="left:${Math.max(0,Math.min(12,score))*100/12}%"></b></div>
      <ul class="hb-checks">${checks.map(c=>`<li class="${c.ok?'ok':'warn'}">${c.ok?'✓':'⚠'} <b>${esc(c.label)}</b>${c.detail?' · '+esc(c.detail):''}</li>`).join('')}</ul>
      <p class="small muted">${ok?'Players can use it once you approve it.':'You can save it as a draft. It stays hidden from players until it fits and you approve it.'}</p>
      <table class="cr-table"><tr><th>Species</th><th>Speed</th><th>Score</th><th>Traits</th></tr>${srd.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.speed}</td><td>${s.score}</td><td class="small">${esc(s.traits.join(', '))}</td></tr>`).join('')}<tr class="hb-mine"><td>${esc(e.name||'Yours')}</td><td>${Number(e.speed)+(e.traits.some(t=>t.block==='speed')?5:0)}</td><td>${score}</td><td class="small">${esc(e.traits.map(t=>QBHomebrew.speciesToSrd({...e,traits:[t]}).traits[0]?.name||'').join(', '))}</td></tr></table></aside></div>`;
}
// The class editor: a base, a progression, calculated features (the sheet and combat use them) and written ones.
function hbClassEditor(){
  const e=S.hbEdit, D=QBHERO; e.tools??=[]; e.subclass.tools??=[]; e.cantripsAt??='4,10'; const checks=QBHomebrew.checkClass(e); crSpells();
  const TOOLS=[...QBHomebrew.tools(),'One type of Artisan’s Tools'];
  let power; try{ power=QBHomebrew.classPowerCheck(e); }catch(err){ power={ok:false,label:'Within the SRD range',detail:'Finish the base first ('+err.message+').',rows:[]}; }
  const all=[...checks,power], ok=all.every(x=>x.ok);
  const chk=(path,v,on,label,max)=>`<label class="cr-check ${on?'on':''}"><input type="checkbox" data-act="hb-ctoggle" data-p="${path}" data-v="${esc(v)}" data-max="${max||99}" ${on?'checked':''}> ${label}</label>`;
  const sel=(bind,opts,cur,label)=>`<label class="f">${label}<select data-bind="hbEdit.${bind}" data-rerender>${opts.map(([v,l])=>crOpt(v,l,String(cur)===String(v))).join('')}</select></label>`;
  const lvl=(bind,cur)=>`<select data-bind="hbEdit.${bind}" data-rerender aria-label="Level">${Array.from({length:20},(_,i)=>crOpt(i+1,'Level '+(i+1),Number(cur)===i+1)).join('')}</select>`;
  const list=(key,cols,addLabel)=>`${(e[key]||[]).map((x,i)=>`<div class="row hb-item">${cols(x,i)}<button class="btn sm ghost" data-act="hb-crow-del" data-k="${key}" data-v="${i}" aria-label="Remove">×</button></div>`).join('')}<button class="btn sm" data-act="hb-crow-add" data-k="${key}">${addLabel}</button>`;
  const txt=(bind,v,ph,w)=>`<input data-bind="hbEdit.${bind}" value="${esc(v||'')}" placeholder="${ph}" maxlength="${w||80}">`;
  const SPELL_LISTS=D.classes.filter(c=>c.spellAbility).map(c=>[c.id,c.name+' spells']);
  return `<div class="cr-layout"><div class="cr-main">
    <section class="card stack"><h3>The base</h3><label class="f">Name${txt('name',e.name,'Artificer, Gunslinger, Witch…')}</label>
      <label class="f">What do they do? (optional, shown to players)<textarea data-bind="hbEdit.desc" rows="2" maxlength="2000">${esc(e.desc)}</textarea></label>
      ${sel('hitDie',[[6,'d6 (Wizard, Sorcerer)'],[8,'d8 (most classes)'],[10,'d10 (Fighter, Paladin, Ranger)'],[12,'d12 (Barbarian)']],e.hitDie,'Hit die')}
      <p class="small"><b>Primary abilities</b> (one or two)</p><div class="cr-checks">${ABIL.map(k=>chk('primary',k,e.primary.includes(k),APPROACH[k].name+' ('+k+')',2)).join('')}</div>
      <p class="small"><b>Saving throws</b> (two)</p><div class="cr-checks">${ABIL.map(k=>chk('saves',k,e.saves.includes(k),k,2)).join('')}</div>
      ${sel('skills.choose',[[2,'Players choose 2 skills'],[3,'3 skills'],[4,'4 skills (like the Rogue)']],e.skills.choose,'Skills')}
      <div class="cr-checks">${D.skills.map(k=>chk('skills.from',k.id,e.skills.from.includes(k.id),esc(k.name))).join('')}</div></section>
    <section class="card stack"><h3>Training</h3><div class="cr-checks">${[['light','Light armor'],['medium','Medium armor'],['heavy','Heavy armor'],['shields','Shields']].map(([k,l])=>chk('armor',k,e.armor.includes(k),l)).join('')}${[['simple','Simple weapons'],['martial','Martial weapons']].map(([k,l])=>chk('weapons',k,e.weapons.includes(k),l)).join('')}</div>
      <details><summary class="small"><b>Tools</b> (${e.tools.length?esc(e.tools.join(', ')):'none'})</summary><div class="cr-checks">${TOOLS.map(n=>chk('tools',n,e.tools.includes(n),esc(n))).join('')}</div></details></section>
    <section class="card stack"><h3>Spellcasting</h3>${sel('caster',[['none','No spellcasting'],['half','Half caster (slots like a Paladin)'],['full','Full caster (slots like a Wizard)'],['pact','Pact magic (slots like a Warlock)']],e.caster,'Progression')}
      ${e.caster!=='none'?`<div class="row">${sel('spellAbility',[['','Choose…'],...ABIL.filter(k=>['INT','WIS','CHA'].includes(k)).map(k=>[k,APPROACH[k].name+' ('+k+')'])],e.spellAbility,'Casting ability')}${sel('spellList',[['','Choose…'],...SPELL_LISTS],e.spellList,'Spell list')}${sel('cantrips',[0,1,2,3,4].map(n=>[n,n+' cantrips at level 1']),e.cantrips,'Cantrips')}${sel('cantripsAt',[['4,10','+1 at levels 4 and 10 (Cleric, Wizard…)'],['10,14','+1 at levels 10 and 14 (Artificer)']],e.cantripsAt,'More cantrips')}</div>`:''}</section>
    <section class="card stack"><h3>Calculated features</h3><p class="small muted">These change the sheet and combat. Everything else goes under written features.</p>
      <label><input type="checkbox" data-act="hb-cflag" data-p="extraAttack" ${e.extraAttack?'checked':''}> Extra Attack at level 5</label>
      <div class="row">${sel('fightingStyle',[[0,'No Fighting Style'],[1,'Fighting Style at level 1'],[2,'Fighting Style at level 2']],e.fightingStyle,'Fighting Style')}${sel('mastery',[[0,'No Weapon Mastery'],[2,'2 weapons'],[3,'3 weapons'],[9,'Fighter’s count (3 → 6)']],e.mastery,'Weapon Mastery')}</div>
      <div class="row">${sel('sneakFrom',[[0,'No Sneak Attack'],[1,'From level 1 (1d6, +1d6 every 2 levels)'],[3,'From level 3']],e.sneakFrom,'Sneak Attack')}${sel('martialArtsFrom',[[0,'No Martial Arts'],[1,'From level 1 (d6 → d12)']],e.martialArtsFrom,'Martial Arts die')}${sel('unarmored',[['','No Unarmored Defense'],['CON','10 + Dex + Con'],['WIS','10 + Dex + Wis'],['INT','10 + Dex + Int'],['CHA','10 + Dex + Cha']],e.unarmored,'Unarmored Defense')}</div>
      <p class="small"><b>Expertise</b> (double proficiency in chosen skills)</p>${list('expertise',(x,i)=>`${lvl(`expertise.${i}.level`,x.level)}<select data-bind="hbEdit.expertise.${i}.count" data-rerender>${[1,2].map(n=>crOpt(n,n+' skill'+(n>1?'s':''),Number(x.count)===n)).join('')}</select>`,'Add expertise')}
      <p class="small"><b>Class attacks</b> (a launcher, a blast…: the ability plus proficiency to hit, the die plus the ability for damage)</p>${list('attacks',(x,i)=>`${lvl(`attacks.${i}.level`,x.level)}${txt(`attacks.${i}.name`,x.name,'Name')}<select data-bind="hbEdit.attacks.${i}.dice" data-rerender>${['1d4','1d6','1d8','1d10','2d6'].map(d=>crOpt(d,d,x.dice===d)).join('')}</select><select data-bind="hbEdit.attacks.${i}.ability" data-rerender>${ABIL.map(k=>crOpt(k,k,x.ability===k)).join('')}</select>${txt(`attacks.${i}.type`,x.type,'Damage type',20)}`,'Add a class attack')}</section>
    <section class="card stack"><h3>Written features</h3><p class="small muted">Shown on the sheet as text; not calculated.</p>${list('features',(x,i)=>`${lvl(`features.${i}.level`,x.level)}${txt(`features.${i}.name`,x.name,'Name')}<textarea data-bind="hbEdit.features.${i}.desc" rows="2" maxlength="2000" placeholder="What it does">${esc(x.desc||'')}</textarea>`,'Add a feature')}</section>
    <section class="card stack"><h3>Subclass (level 3)</h3><label class="f">Name${txt('subclass.name',e.subclass.name,'Armorer, Path of …')}</label><label class="f">In one line${txt('subclass.summary',e.subclass.summary,'Wear arcane armor that becomes your weapon.',500)}</label>
      <div class="cr-checks">${[['heavy','Heavy armor training at level 3'],['martial','Martial weapon training at level 3']].map(([k,l])=>chk('subclass.training',k,e.subclass.training.includes(k),l)).join('')}</div>
      <details><summary class="small"><b>Tools at level 3</b> (${e.subclass.tools.length?esc(e.subclass.tools.join(', ')):'none'})</summary><div class="cr-checks">${TOOLS.map(n=>chk('subclass.tools',n,e.subclass.tools.includes(n),esc(n))).join('')}</div></details>
      ${(e.subclass.features||[]).map((x,i)=>`<div class="row hb-item">${lvl(`subclass.features.${i}.level`,x.level)}${txt(`subclass.features.${i}.name`,x.name,'Name')}<textarea data-bind="hbEdit.subclass.features.${i}.desc" rows="2" maxlength="2000">${esc(x.desc||'')}</textarea><button class="btn sm ghost" data-act="hb-crow-del" data-k="subclass.features" data-v="${i}" aria-label="Remove">×</button></div>`).join('')}<button class="btn sm" data-act="hb-crow-add" data-k="subclass.features">Add a subclass feature</button></section>
    <section class="card stack"><h3>Starting kit</h3><p class="small muted">Players take this kit or its value in gold. SRD class kits are worth ${QBHomebrew.CLASS_KIT.min}–${QBHomebrew.CLASS_KIT.max} GP.</p>
      ${e.kit.items.map((it,i)=>`<div class="row hb-item"><span>${esc(D.equipment[it.id]?.name||it.id)} <span class="small muted">${esc(D.equipment[it.id]?.cost||'')}</span></span><input type="number" min="1" max="99" step="1" data-bind="hbEdit.kit.items.${i}.count" value="${esc(it.count)}" aria-label="How many"><button class="btn sm ghost" data-act="hb-delitem" data-v="${i}" aria-label="Remove">×</button></div>`).join('')}
      <label class="f">Add an item<select data-act-change="hb-additem">${crOpt('','Choose…',true)}${crShop()}</select></label><label class="f">Gold in the kit<input type="number" min="0" max="200" step="1" data-bind="hbEdit.kit.gp" value="${esc(e.kit.gp)}"></label>
      <p class="cr-count">Kit value: ${QBHomebrew.kitValue(e.kit)} GP</p></section>
    <div class="cr-foot"><button class="btn" data-act="hb-cancel">Cancel</button><button class="btn primary" data-act="hb-save">Save class</button></div></div>
    <aside class="cr-sheet"><div class="eyebrow">Compared with the 12 SRD classes</div><h3>${ok?'Within the SRD range':'Not finished, or outside the range'}</h3>
      <ul class="hb-checks">${all.map(c=>`<li class="${c.ok?'ok':'warn'}">${c.ok?'✓':'⚠'} <b>${esc(c.label)}</b>${c.detail?' · '+esc(c.detail):''}</li>`).join('')}</ul>
      ${power.rows.length?`<table class="cr-table"><tr><th>Level</th><th>HP</th><th>AC</th><th>Damage / action</th></tr>${power.rows.map(r=>`<tr class="${r.flags.length?'hb-over':''}"><td>${r.level}</td><td><b>${r.mine.hp}</b> <span class="small muted">${r.min.hp}–${r.max.hp}</span></td><td><b>${r.mine.ac}</b> <span class="small muted">${r.min.ac}–${r.max.ac}</span></td><td><b>${r.mine.dpa}</b> <span class="small muted">${r.min.dpa}–${r.max.dpa}</span><br><span class="small muted">${esc(r.mine.attack)}</span></td></tr>`).join('')}</table>
      <p class="small muted">Bold: your class (its Quick build hero). Grey: the weakest and strongest SRD class. Damage per action is against AC 15, grazes counted. Spell slots and limited features aren’t counted, so casters are stronger than this shows.</p>
      <button class="btn sm" data-act="hb-fighttest">Test in fights…</button><div id="hb-fight-out">${S.hbFight?.id===e.id?S.hbFight.html:''}</div>`:''}</aside></div>`;
}
// The feat editor: what kind of feat, from which level, an optional +1, and what it does in the DM's own words.
function hbFeatEditor(){
  const e=S.hbEdit; e.prereq??=QBHomebrew.newPrereq(); const p=e.prereq, others=hbState().feats.filter(x=>x.id!==e.id), T=QBHomebrew.FEAT_TYPES, checks=QBHomebrew.checkFeat(e,others), ok=checks.every(x=>x.ok), srd=QBHERO.feats.filter(x=>x.type===e.type);
  const needsPlus=e.type==='general'||e.type==='epic-boon'; e.blocks??=[];
  const FB=QBHomebrew.FEAT_BLOCKS, band=QBHomebrew.featBand(e.type), score=QBHomebrew.featScore(e);
  // the 2024 feats of this kind that score closest to this one, for comparison
  const near=srd.map(x=>({x,s:QBHomebrew.featScore({...x,blocks:QBHomebrew.FEAT_REFERENCE[x.id]})})).sort((a,b)=>Math.abs(a.s-score)-Math.abs(b.s-score)).slice(0,6);
  return `<div class="cr-layout"><div class="cr-main">
    <section class="card stack"><h3>The feat</h3><label class="f">Name<input data-bind="hbEdit.name" value="${esc(e.name)}" placeholder="Tough Hide, Night Hunter…" maxlength="80"></label>
      <label class="f">Kind<select data-act-change="hb-feattype">${Object.entries(T).map(([k,x])=>crOpt(k,x.label,e.type===k)).join('')}</select></label>
      <label><input type="checkbox" data-act="hb-cflag" data-p="repeatable" ${e.repeatable?'checked':''}> A hero may take it more than once</label></section>
    <section class="card stack"><h3>Ability increase</h3><p class="small muted">${needsPlus?'2024 general feats and Epic Boons raise one ability by 1. Tick the abilities a player may choose from (all six means any).':'Origin and Fighting Style feats don’t raise abilities in the 2024 rules.'}</p>
      ${needsPlus?`<div class="cr-checks">${ABIL.map(k=>`<label class="cr-check ${e.abilities.includes(k)?'on':''}"><input type="checkbox" data-act="hb-ctoggle" data-p="abilities" data-v="${k}" ${e.abilities.includes(k)?'checked':''}> ${APPROACH[k].name} (${k})</label>`).join('')}</div>`:''}</section>
    <section class="card stack"><h3>Prerequisites</h3><p class="small muted">Use them only when the feat truly needs them. The creator only offers the feat to heroes who meet them.</p>
      <p class="small"><b>An ability score</b> (any one of the ticked)</p><div class="cr-checks">${ABIL.map(k=>`<label class="cr-check ${p.abilities.includes(k)?'on':''}"><input type="checkbox" data-act="hb-ctoggle" data-p="prereq.abilities" data-v="${k}" ${p.abilities.includes(k)?'checked':''}> ${k}</label>`).join('')}</div>
      ${p.abilities.length?`<label class="f">Of at least<select data-bind="hbEdit.prereq.score" data-rerender>${[13,14,15,16,17].map(n=>crOpt(n,n+(n===13?' (usual)':' (stricter)'),Number(p.score)===n)).join('')}</select></label>`:''}
      <label><input type="checkbox" data-act="hb-cflag" data-p="prereq.spellcasting" ${p.spellcasting?'checked':''}> The Spellcasting or Pact Magic feature</label>
      <div class="row"><label class="f">Another feat<select data-bind="hbEdit.prereq.feat" data-rerender>${crOpt('','None',!p.feat)}${[...QBHERO.feats,...others].map(x=>crOpt(x.id,x.name+(x.homebrew||x.kind==='feat'?' (homebrew)':''),p.feat===x.id)).join('')}</select></label>
      <label class="f">A class<select data-bind="hbEdit.prereq.cls" data-rerender>${crOpt('','Any class',!p.cls)}${[...QBHERO.classes,...hbState().classes].map(c=>crOpt(c.id,c.name,p.cls===c.id)).join('')}</select></label></div>
      <label class="f">Anything else (shown, not checked)<input data-bind="hbEdit.prereq.text" value="${esc(p.text||'')}" placeholder="the Rage feature, the ability to cast Mage Hand…" maxlength="300"></label></section>
    <section class="card stack"><h3>What it gives</h3><p class="small muted">For the power check: pick the benefits the feat grants, as building blocks. The 2024 feats are measured the same way.</p>
      ${e.blocks.map((x,i)=>{const B=FB[x.block]; return `<div class="hb-block"><span>${esc(B?.label||x.block)}</span>${B?.count?`<input type="number" min="1" max="9" step="1" data-bind="hbEdit.blocks.${i}.n" data-rerender value="${esc(x.n||1)}" aria-label="How many">`:''}${B&&B.weight===null?`<select data-bind="hbEdit.blocks.${i}.weight" data-rerender aria-label="Weight">${[0.5,1,1.5,2,2.5,3].map(w=>crOpt(w,(x.block==='drawback'?'−':'+')+w,Number(x.weight||0.5)===w)).join('')}</select>`:`<span class="chip">+${B?.weight??''}</span>`}<button class="btn sm ghost" data-act="hb-delfblock" data-v="${i}" aria-label="Remove">×</button></div>`;}).join('')}
      <label class="f">Add what it gives<select data-act-change="hb-addfblock">${crOpt('','Choose…',true)}${Object.entries(FB).map(([k,B])=>crOpt(k,B.label+(B.weight===null?'':' · '+B.weight),false)).join('')}</select></label></section>
    <section class="card stack"><h3>What it does</h3><p class="small muted">Shown on the hero sheet. Write it in your own words; Quillbound doesn’t calculate it, so note numbers the player should use.</p>
      <textarea data-bind="hbEdit.desc" rows="6" maxlength="3000" placeholder="When you…">${esc(e.desc)}</textarea></section>
    <div class="cr-foot"><button class="btn" data-act="hb-cancel">Cancel</button><button class="btn primary" data-act="hb-save">Save feat</button></div></div>
    <aside class="cr-sheet"><div class="eyebrow">Checked against the 2024 structure</div><h3>${ok?'Ready for approval':'Not finished'}</h3>
      <ul class="hb-checks">${checks.map(c=>`<li class="${c.ok?'ok':'warn'}">${c.ok?'✓':'⚠'} <b>${esc(c.label)}</b>${c.detail?' · '+esc(c.detail):''}</li>`).join('')}</ul>
      ${band?`<div class="hb-meter"><b>Power ${score}</b> <span class="small muted">2024 ${esc(T[e.type].label.split(' (')[0].toLowerCase())}s: ${band.min}–${band.max}</span></div>`:''}
      <p class="small"><b>Closest 2024 feats:</b> ${near.map(n=>`${esc(n.x.name)} ${n.s}`).join(' · ')||'none'}</p>
      <p class="small muted">The score is a guide: it can’t judge wording. Compare with the feats above before you approve.</p>
      <h4>Design tips</h4><ul class="small">${QBHomebrew.featAdvice(e).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="small muted">From the D&amp;D Wiki feat design guides. Tips never block approval.</p></aside></div>`;
}
// The subclass editor: a subclass for one of the existing classes, with features at that class's subclass levels.
// The panel measures it against the class's own subclasses (SRD, Player's Handbook, fan-made) at levels 3, 5, 11 and 17.
function hbSubclassEditor(){
  const e=S.hbEdit, hb=hbState(); e.features??=[]; e.training??=[]; e.tools??=[];
  const c=QBHERO.classes.find(x=>x.id===e.cls), lv=QBHomebrew.subLevels(e.cls), checks=QBHomebrew.checkSubclass(e,hb.subclasses), power=QBHomebrew.subclassPowerCheck(e), all=[...checks,power], ok=all.every(x=>x.ok);
  const subs=c?(c.subclasses||[c.subclass]):[], chk=(path,v,on,label)=>`<label class="cr-check ${on?'on':''}"><input type="checkbox" data-act="hb-ctoggle" data-p="${path}" data-v="${esc(v)}" ${on?'checked':''}> ${label}</label>`;
  const txt=(bind,v,ph,w)=>`<input data-bind="hbEdit.${bind}" value="${esc(v||'')}" placeholder="${ph}" maxlength="${w||80}">`;
  return `<div class="cr-layout"><div class="cr-main">
    <section class="card stack"><h3>The subclass</h3><label class="f">Class<select data-bind="hbEdit.cls" data-rerender>${crOpt('','Choose…',!e.cls)}${QBHERO.classes.filter(x=>!x.homebrew).map(x=>crOpt(x.id,x.name,e.cls===x.id)).join('')}</select></label>
      <label class="f">Name${txt('name',e.name,c?'Like '+c.subclass.name+'…':'Path of …, College of …')}</label>
      <label class="f">In one line (the creator shows it)${txt('summary',e.summary,'What it is about.',500)}</label></section>
    <section class="card stack"><h3>Features</h3>${c?`<p class="small muted">${esc(c.name)} subclasses gain features at levels ${lv.join(', ')}. Describe each in your own words; the sheet shows them.</p>`:'<p class="small muted">Choose a class first.</p>'}
      ${e.features.map((x,i)=>`<div class="row hb-item"><select data-bind="hbEdit.features.${i}.level" data-rerender aria-label="Level">${(lv.length?lv:[3]).map(l=>crOpt(l,'Level '+l,Number(x.level)===l)).join('')}</select>${txt(`features.${i}.name`,x.name,'Name')}<textarea data-bind="hbEdit.features.${i}.desc" rows="2" maxlength="2000" placeholder="What it does">${esc(x.desc||'')}</textarea><button class="btn sm ghost" data-act="hb-crow-del" data-k="features" data-v="${i}" aria-label="Remove">×</button></div>`).join('')}
      <button class="btn sm" data-act="hb-scfeature" ${c?'':'disabled'}>Add a feature</button></section>
    <section class="card stack"><h3>Calculated parts</h3><p class="small muted">These change the sheet and combat, and the comparison on the right measures them.</p>
      <div class="cr-checks">${Object.entries(QBHomebrew.SUB_TRAINING).map(([k,l])=>chk('training',k,e.training.includes(k),l+' training at level 3')).join('')}</div>
      <details><summary class="small"><b>Tools at level 3</b> (${e.tools.length?esc(e.tools.join(', ')):'none'})</summary><div class="cr-checks">${QBHomebrew.tools().map(n=>chk('tools',n,e.tools.includes(n),esc(n))).join('')}</div></details>
      <label class="f">Extra Attack<select data-bind="hbEdit.extraAttackAt" data-rerender>${[[0,'None (or the class has it already)'],[5,'At level 5'],[6,'At level 6 (like the College of Valor)']].map(([v,l])=>crOpt(v,l,Number(e.extraAttackAt)===v)).join('')}</select></label>
      <label><input type="checkbox" data-act="hb-cflag" data-p="hpPerLevel" ${e.hpPerLevel?'checked':''}> +1 hit point per level from level 3 (like Draconic Resilience)</label>
      ${c&&!c.spellAbility?`<label><input type="checkbox" data-act="hb-cflag" data-p="caster" ${e.caster?'checked':''}> Spellcasting of its own from level 3 (a third caster, like the Eldritch Knight)</label>
        ${e.caster?`<div class="row"><label class="f">Casting ability<select data-bind="hbEdit.spellAbility" data-rerender>${['INT','WIS','CHA'].map(k=>crOpt(k,APPROACH[k].name+' ('+k+')',e.spellAbility===k)).join('')}</select></label><label class="f">Spell list<select data-bind="hbEdit.spellList" data-rerender>${QBHERO.classes.filter(x=>x.spellAbility).map(x=>crOpt(x.id,x.name+' spells',e.spellList===x.id)).join('')}</select></label></div>`:''}`:''}</section>
    <div class="cr-foot"><button class="btn" data-act="hb-cancel">Cancel</button><button class="btn primary" data-act="hb-save">Save subclass</button></div></div>
    <aside class="cr-sheet"><div class="eyebrow">Compared with the ${c?esc(c.name)+'’s '+subs.length:''} subclasses</div><h3>${ok?'Within their range':'Not finished, or outside the range'}</h3>
      <ul class="hb-checks">${all.map(x=>`<li class="${x.ok?'ok':'warn'}">${x.ok?'✓':'⚠'} <b>${esc(x.label)}</b>${x.detail?' · '+esc(x.detail):''}</li>`).join('')}</ul>
      ${power.rows.length?`<table class="cr-table"><tr><th>Level</th><th>HP</th><th>AC</th><th>Damage / action</th></tr>${power.rows.map(r=>`<tr class="${r.flags.length?'hb-over':''}"><td>${r.level}</td><td><b>${r.mine.hp}</b> <span class="small muted">${r.min.hp}–${r.max.hp}</span></td><td><b>${r.mine.ac}</b> <span class="small muted">${r.min.ac}–${r.max.ac}</span></td><td><b>${r.mine.dpa}</b> <span class="small muted">${r.min.dpa}–${r.max.dpa}</span></td></tr>`).join('')}</table>
      <p class="small muted">Bold: the ${esc(c.name)}’s Quick build hero with your subclass. Grey: the weakest and strongest of its subclasses. Written features aren’t measured, so compare them with the ones below.</p>`:''}
      ${c?`<details><summary class="small"><b>What the ${esc(c.name)}’s subclasses get</b></summary>${lv.map(l=>`<p class="small"><b>Level ${l}:</b> ${subs.map(s=>`${esc(s.name)}: ${esc(s.features.filter(f=>f.level===l).map(f=>f.name).join(', ')||'—')}`).join(' · ')}</p>`).join('')}</details>`:''}</aside></div>`;
}
// Printable character sheet (src/app/sheet-export.js): an overlay over the app that the browser prints, or saves as PDF.
// The language switch is remembered in this browser only.
function sheetSpells(b){ const all=globalThis.QBSPELLS||[]; return [...(b.spells?.cantrips||[]),...(b.spells?.prepared||[])].map(id=>all.find(x=>x.id===id)).filter(Boolean).map(x=>({name:x.name,level:x.level})); }
function openSheet(build,story){
  if((build.spells?.cantrips?.length||build.spells?.prepared?.length)&&!crSpells(()=>openSheet(build,story))) return; // spell names load first
  QBHeroRules.setHomebrew(QBHomebrew.forCreator(S.homebrew,build)); const s=QBHeroRules.derive({...build,name:build.name||'Hero'});
  let lang='de'; try{ lang=localStorage.getItem('qb-sheet-lang')||'de'; }catch{}
  const show=()=>{ let o=document.getElementById('print-sheet'); if(!o){ o=document.createElement('div'); o.id='print-sheet'; document.body.appendChild(o); } document.body.classList.add('ps-open');
    o.innerHTML=`<div class="ps-bar" role="toolbar" aria-label="Character sheet"><div class="ps-seg" role="group" aria-label="Language">${[['de','Deutsch'],['en','English']].map(([k,l])=>`<button class="btn sm ${lang===k?'primary':''}" data-l="${k}" aria-pressed="${lang===k}">${l}</button>`).join('')}</div>
      <button class="btn primary" data-p>Print / save as PDF</button><button class="btn" data-x>Close</button><span class="small">In the print dialog, choose “Save as PDF” to get a file.</span></div>${QBSheet.html(s,{lang,spells:sheetSpells(build),story})}`;
    o.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{ lang=b.dataset.l; try{ localStorage.setItem('qb-sheet-lang',lang); }catch{} show(); });
    o.querySelector('[data-p]').onclick=()=>{ try{ window.print(); }catch{ toast('Printing is blocked here. Open Quillbound in its own tab to print.'); } };
    o.querySelector('[data-x]').onclick=()=>{ o.remove(); document.body.classList.remove('ps-open'); };
    o.scrollTop=0; };
  show(); }
function vHomebrew(){
  QBHeroRules.setHomebrew(QBHomebrew.forCreator(hbState())); // approved homebrew feats can be chosen and required here too
  const hb=hbState(), kind=S.hbKind||'backgrounds', one=kind==='species'?'species':kind==='classes'?'class':kind==='subclasses'?'subclass':kind==='feats'?'feat':'background';
  if(S.hbEdit?.kind==='feat') return `<div class="pagehead"><div><div class="eyebrow">Homebrew · feat</div><h2>${esc(S.hbEdit.name||'New feat')}</h2><p>Name it, choose its kind and level, and describe what it does. Approved feats appear in the creator wherever a feat of that kind is chosen.</p></div></div>${hbFeatEditor()}`;
  if(S.hbEdit?.kind==='subclass') return `<div class="pagehead"><div><div class="eyebrow">Homebrew · subclass</div><h2>${esc(S.hbEdit.name||'New subclass')}</h2><p>A new subclass for one of the classes. The panel on the right measures it against that class’s subclasses at levels 3, 5, 11 and 17.</p></div></div>${hbSubclassEditor()}`;
  if(S.hbEdit?.kind==='class') return `<div class="pagehead"><div><div class="eyebrow">Homebrew · class</div><h2>${esc(S.hbEdit.name||'New class')}</h2><p>Build the class from a base, a progression and features. The panel on the right measures it against all 12 SRD classes at levels 1, 5, 11 and 17.</p></div></div>${hbClassEditor()}`;
  if(S.hbEdit) return S.hbEdit.kind==='species'
    ?`<div class="pagehead"><div><div class="eyebrow">Homebrew · species</div><h2>${esc(S.hbEdit.name||'New species')}</h2><p>Pick traits from building blocks. Each has a weight; the panel on the right places your species among the SRD ones.</p></div></div>${hbSpeciesEditor()}`
    :`<div class="pagehead"><div><div class="eyebrow">Homebrew · background</div><h2>${esc(S.hbEdit.name||'New background')}</h2><p>Build inside the 2024 structure. The panel on the right checks each part and compares it with the SRD backgrounds.</p></div></div>${hbEditor()}`;
  const list=hb[kind]||[], fits=b=>kind==='species'?QBHomebrew.speciesFits(b):kind==='classes'?QBHomebrew.classFits(b):kind==='subclasses'?QBHomebrew.subclassFits(b,hb.subclasses):kind==='feats'?QBHomebrew.featFits(b,hb.feats.filter(y=>y.id!==b.id)):QBHomebrew.fits(b);
  const line=b=>kind==='feats'?`${esc(QBHomebrew.FEAT_TYPES[b.type]?.label.split(' (')[0]||'')} · level ${QBHomebrew.FEAT_TYPES[b.type]?.minLevel||1}+${b.abilities.length?' · +1 '+esc(b.abilities.length===6?'any ability':b.abilities.join(' or ')):''}${b.repeatable?' · repeatable':''}`
    :kind==='subclasses'?`${esc(QBHERO.classes.find(c=>c.id===b.cls)?.name||'no class yet')} · ${b.features.length} feature${b.features.length===1?'':'s'}${b.training.length?' · '+esc(b.training.map(k=>QBHomebrew.SUB_TRAINING[k]).join(', ')):''}${b.extraAttackAt?' · Extra Attack at '+b.extraAttackAt:''}${b.hpPerLevel?' · +1 HP per level':''}${b.caster?' · casts spells':''}`
    :kind==='classes'?`d${b.hitDie} · ${esc(b.primary.join(', '))} · saves ${esc(b.saves.join(', '))} · ${b.caster==='none'?'no spells':esc(b.caster)+' caster'}${b.extraAttack?' · Extra Attack':''} · subclass ${esc(b.subclass.name||'?')}`
    :kind==='species'
    ?`${esc(b.size)} · ${Number(b.speed)+(b.traits.some(t=>t.block==='speed')?5:0)} ft · score ${QBHomebrew.speciesScore(b)} (SRD ${QBHomebrew.BAND.min}–${QBHomebrew.BAND.max}) · ${esc(QBHomebrew.speciesToSrd(b).traits.map(t=>t.name).join(', '))}`
    :`${esc(b.abilities.join(', '))} · ${esc(QBHERO.feats.find(f=>f.id===b.feat)?.name||'no feat')} · ${esc(b.skills.map(s=>QBHERO.skills.find(k=>k.id===s)?.name||s).join(', '))} · ${esc(b.tool||'no tool')} · kit ${QBHomebrew.kitValue(b.kit)} GP`;
  const dm=S.role==='dm', any=hbAll(hb).length;
  return `<div class="pagehead"><div><div class="eyebrow">${dm?'Homebrew · DM':'My homebrew'}</div><h2>${dm?'Your own options':'Your own ideas'}</h2><p>${dm?'Make your own backgrounds, species, classes, subclasses and feats inside the 2024 rules. The app compares them with the SRD; you decide what players may use by approving it. <b>Publish to the table…</b> puts everything approved on the site for every player.':'Invent a background, species, class, subclass or feat inside the 2024 rules; the app checks it as you go. <b>Send to DM</b> saves it as a file for your DM. What your DM approves and publishes appears here and in the creator by itself.'}</p></div>
      <div class="row">${dm?`<button class="btn" data-act="hb-export" ${any?'':'disabled'}>Export…</button><button class="btn" data-act="hb-publish" ${hbAll(hb).some(x=>x.approved)?'':'disabled'}>Publish to the table…</button>`:''}<label class="btn">Import…<input type="file" id="hb-file" accept=".json,application/json" hidden></label></div></div>
    <div class="cr-tabs" role="tablist">${HB_KINDS.map(([k,l,ready])=>`<button role="tab" aria-selected="${kind===k}" data-act="hb-kind" data-v="${k}" ${ready?'':'disabled'}>${l}${ready?'':' · coming next'}</button>`).join('')}</div>
    <div class="row" style="margin:12px 0"><button class="btn primary" data-act="hb-new">New ${one}</button></div>
    <div class="results">${list.map(b=>{const fit=fits(b);return `<article class="card stack"><div class="row" style="justify-content:space-between"><h3>${esc(b.name||'Unnamed '+one)}</h3><span class="chip ${fit?'ok':'warn'}">${fit?(kind==='backgrounds'||kind==='feats'?'Fits the 2024 structure':kind==='subclasses'?'Within the class’s range':'Within the SRD range'):'Draft: not finished'}</span></div>
      <p class="small">${line(b)}</p>${b.desc?`<p class="small muted">${esc(b.desc)}</p>`:''}
      ${b.fromPlayer?'<p class="small"><span class="chip acc">From a player</span> Check it, then approve it if it fits your table.</p>':''}${b.fromTable?'<p class="small"><span class="chip">Published by the DM</span></p>':hbShipped(b.id)?'<p class="small"><span class="chip">Built into Quillbound</span></p>':''}
      <div class="row">${dm?`<label class="cr-check ${b.approved?'on':''}"><input type="checkbox" data-act="hb-approve" data-v="${b.id}" ${b.approved?'checked':''}> Approved by the DM: players can choose it</label>`:`<span class="chip ${b.approved?'ok':''}">${b.approved?'Approved by your DM':'Your idea: not approved yet'}</span>${b.fromTable||hbShipped(b.id)?'':`<button class="btn sm primary" data-act="hb-send" data-v="${b.id}">Send to DM</button>`}`}<button class="btn sm" data-act="hb-edit" data-v="${b.id}">Edit</button><button class="btn sm ghost" data-act="hb-del" data-v="${b.id}">Delete</button></div></article>`;}).join('')||`<div class="empty">No homebrew ${kind} yet. Choose New ${one} to make one.</div>`}</div>
    <p class="small muted">Heroes keep a copy of the homebrew they were made with, so editing or deleting it later doesn’t change existing heroes.</p>`;
}
// Read an import file, then let the DM decide about every clash before anything changes.
function hbImportFile(file){ file.text().then(text=>{ const hb=hbState(), parsed=QBHomebrew.parseImport(text,hb); if(parsed.error){ toast(parsed.error); return; }
  const dlg=openDialog('Import homebrew',`<p>${parsed.items.length} item${parsed.items.length===1?'':'s'} in this file. Imported homebrew starts unapproved.</p>
    <ul>${parsed.items.map(b=>`<li><b>${esc(b.name)}</b>${parsed.clashes.includes(b.id)?` · you already have one with this name<select data-clash="${esc(b.id)}">${crOpt('skip','Keep mine, skip this one',true)}${crOpt('copy','Keep both (import as a copy)',false)}${crOpt('replace','Replace mine with this one',false)}</select>`:''}</li>`).join('')}</ul>
    <div class="row"><button class="btn primary" id="hb-import-go">Import</button><button class="btn" id="hb-import-cancel">Cancel</button></div>`);
  dlg.querySelector('#hb-import-cancel').onclick=()=>dlg.close();
  dlg.querySelector('#hb-import-go').onclick=()=>{ const decisions={}; dlg.querySelectorAll('[data-clash]').forEach(s=>decisions[s.dataset.clash]=s.value); const r=QBHomebrew.applyImport(hb,parsed,decisions); S.homebrew=r.hb; dlg.close(); render(); toast(`Imported: ${r.done.added} added, ${r.done.replaced} replaced, ${r.done.skipped} skipped.`); };
}).catch(()=>toast('This file could not be read.')); }
function homebrewActions(){ const find=id=>{const hb=hbState(); for(const k of ['backgrounds','species','classes','subclasses','feats']){const x=hb[k].find(b=>b.id===id); if(x) return {k,x};} return {};};
  const fitsOf=x=>x.kind==='species'?QBHomebrew.speciesFits(x):x.kind==='class'?QBHomebrew.classFits(x):x.kind==='subclass'?QBHomebrew.subclassFits(x,hbState().subclasses):x.kind==='feat'?QBHomebrew.featFits(x,hbState().feats.filter(y=>y.id!==x.id)):QBHomebrew.fits(x);
  return {
  'hb-kind':d=>{ S.hbKind=d.v; },
  'hb-new':()=>{ S.hbEdit=hbNew(S.hbKind); window.scrollTo(0,0); },
  'hb-edit':d=>{ S.hbEdit=JSON.parse(JSON.stringify(find(d.v).x)); window.scrollTo(0,0); },
  'hb-cancel':()=>{ S.hbEdit=null; },
  'hb-save':()=>{ const hb=hbState(), src=S.hbEdit, e={...src,name:String(src.name||'').trim(),updated:Date.now()};
    if(e.kind==='species') Object.assign(e,{speed:Number(e.speed)||30});
    if(e.kind==='class') for(const k of ['hitDie','cantrips','fightingStyle','mastery','sneakFrom','martialArtsFrom']) e[k]=Number(e[k])||0;
    if(e.kind==='feat'){ e.minLevel=QBHomebrew.FEAT_TYPES[e.type]?.minLevel||4; if(!['general','epic-boon'].includes(e.type)) e.abilities=[]; }
    if(e.kind==='subclass') e.extraAttackAt=Number(e.extraAttackAt)||0;
    if(e.kind==='background'||e.kind==='class') e.kit={items:src.kit.items.map(i=>({id:i.id,count:Math.max(1,Math.round(Number(i.count)||1))})),gp:Math.max(0,Math.round(Number(src.kit.gp)||0))};
    if(!e.name){ toast('Give it a name first.'); return; }
    const list=e.kind==='species'?hb.species:e.kind==='class'?hb.classes:e.kind==='subclass'?hb.subclasses:e.kind==='feat'?hb.feats:hb.backgrounds, i=list.findIndex(b=>b.id===e.id); if(i>=0) list[i]=e; else list.push(e);
    if(e.approved&&!fitsOf(e)) { e.approved=false; toast('Saved. It no longer fits, so it is unapproved until you approve it again.'); } else toast('Saved.');
    S.hbEdit=null; },
  'hb-toggle':d=>{ const list=S.hbEdit[d.k], i=list.indexOf(d.v); if(i>=0) list.splice(i,1); else if(list.length<+d.max) list.push(d.v); else toast(`Choose ${d.max}. Untick one first.`); },
  'hb-additem':d=>{ if(!d.v) return; const it=S.hbEdit.kit.items.find(x=>x.id===d.v); if(it) it.count=(Number(it.count)||1)+1; else S.hbEdit.kit.items.push({id:d.v,count:1}); },
  'hb-delitem':d=>{ S.hbEdit.kit.items.splice(+d.v,1); },
  'hb-addtrait':d=>{ if(!d.v) return; const t={block:d.v}; if(d.v==='darkvision') t.range='60'; if(d.v==='natural') Object.assign(t,{name:'Claws',dice:'1d6',type:'Slashing',finesse:false}); if(d.v==='spell') t.level='3'; if(d.v==='custom'||d.v==='drawback') t.weight='1'; S.hbEdit.traits.push(t); },
  'hb-deltrait':d=>{ S.hbEdit.traits.splice(+d.v,1); },
  // feat editor: the kind sets the level (origin and Fighting Style 1, general 4, Epic Boon 19) and drops a +1 it can't have
  'hb-feattype':d=>{ const e=S.hbEdit, min=QBHomebrew.FEAT_TYPES[d.v]?.minLevel||1; e.type=d.v; e.minLevel=min; if(d.v==='origin'||d.v==='fighting-style') e.abilities=[]; },
  // class editor: toggles in nested lists ("skills.from"), flags, and rows (features, attacks, expertise)
  'hb-ctoggle':d=>{ const path=d.p.split('.'); let o=S.hbEdit; for(const k of path.slice(0,-1)) o=o[k]; const list=o[path[path.length-1]], i=list.indexOf(d.v); if(i>=0) list.splice(i,1); else if(list.length<(+d.max||99)) list.push(d.v); else toast(`Choose ${d.max}. Untick one first.`); },
  'hb-cflag':d=>{ const path=d.p.split('.'); let o=S.hbEdit; for(const k of path.slice(0,-1)) o=o[k]; const k=path.at(-1); o[k]=!o[k]; },
  'hb-crow-add':d=>{ const blank={expertise:{level:1,count:1},attacks:{level:1,name:'',dice:'1d6',ability:'INT',type:''},features:{level:1,name:'',desc:''},'subclass.features':{level:3,name:'',desc:''}}[d.k]; const list=d.k==='subclass.features'?S.hbEdit.subclass.features:S.hbEdit[d.k]; list.push({...blank}); },
  'hb-crow-del':d=>{ const list=d.k==='subclass.features'?S.hbEdit.subclass.features:S.hbEdit[d.k]; list.splice(+d.v,1); },
  'hb-fighttest':()=>{ const e=S.hbEdit, lv=5; crSpells(()=>render()); const r=QBHomebrew.fightTest(e,lv,150);
    S.hbFight={id:e.id,html:`<p class="small"><b>Level ${r.level}</b>, parties of four identical heroes, 150 fights each: ${esc(r.encounters.join(' · '))}.</p><table class="cr-table"><tr><th>Party</th>${r.encounters.map(x=>'<th>'+esc(x.split(':')[0])+'</th>').join('')}</tr>${r.rows.map(row=>'<tr class="'+(row.name===(e.name||'Yours')?'hb-mine':'')+'"><td>'+esc(row.name)+'</td>'+row.cells.map(c=>'<td>'+c.rounds+' rounds · '+c.dropped+'% drop · '+c.wiped+'% wiped</td>').join('')+'</tr>').join('')}</table><p class="small muted">Stakes rules, fair dice; no healing, stamina or breaking points, so it compares classes rather than tactics.</p>`}; },
  'hb-approve':d=>{ if(S.role!=='dm') return; const {x:b}=find(d.v); if(!b) return; if(!b.approved&&!fitsOf(b)){ toast('Finish it first: every check needs a ✓ before players can use it.'); return; } b.approved=!b.approved; toast(b.approved?`${b.name} is now available in the hero creator.`:`${b.name} is hidden from the hero creator. Heroes already made with it keep their copy.`); },
  'hb-del':d=>{ const {k,x:b}=find(d.v); if(!b) return; clConfirm(`Delete ${b.name||'this homebrew'}?`,'This removes it from your homebrew and from the hero creator. Heroes already made with it keep their copy. This cannot be undone; export it first if you might want it back.',()=>{ S.homebrew[k]=S.homebrew[k].filter(x=>x.id!==d.v); if(b.fromTable) S.homebrew.tableDismissed=[...new Set([...(S.homebrew.tableDismissed||[]),b.id])]; /* a deleted table item isn't added again */ },'Delete'); },
  // feat editor: building blocks for the power check
  'hb-addfblock':d=>{ if(!d.v) return; const B=QBHomebrew.FEAT_BLOCKS[d.v]; S.hbEdit.blocks??=[]; S.hbEdit.blocks.push({block:d.v,n:1,...(B.weight===null?{weight:0.5}:{})}); },
  'hb-delfblock':d=>{ S.hbEdit.blocks.splice(+d.v,1); },
  // subclass editor: a new feature at the first subclass level that has none yet
  'hb-scfeature':()=>{ const e=S.hbEdit, lv=QBHomebrew.subLevels(e.cls), have=new Set(e.features.map(f=>Number(f.level))); e.features.push({level:lv.find(l=>!have.has(l))||lv[0]||3,name:'',desc:''}); e.features.sort((a,b)=>a.level-b.level); },
  // from the creator's "Make your own …": open a new one of that kind in the Homebrew tab
  'hb-start':d=>{ S.tab='homebrew'; S.hbKind=d.v; S.hbEdit=hbNew(d.v,d.c); window.scrollTo(0,0); },
  // a player's idea, as a file for the DM (Homebrew → Import there)
  'hb-send':d=>{ const {x:b}=find(d.v); if(!b) return; saveFile(`${(b.name||'homebrew').replace(/[^\w-]+/g,'-').toLowerCase()}.quillbound-homebrew.json`,QBHomebrew.exportJson(hbState(),[b.id],{from:'player'}),`Saved ${b.name}. Send the file to your DM.`); },
  // everything the DM approved, for homebrew/table.json on the site: every browser adds it by itself
  'hb-publish':()=>{ saveFile('table.json',QBHomebrew.exportJson(hbState(),null,{approved:true}),'Saved table.json. Upload it to the homebrew folder of the Quillbound repository on GitHub (or send it to Claude); players get it on their next visit.'); },
  'hb-export':()=>{ saveFile('quillbound-homebrew.json',QBHomebrew.exportJson(hbState()),'Exported. The file holds your homebrew without approvals; whoever imports it decides what to approve.'); }
}; }
