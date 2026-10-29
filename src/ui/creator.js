/* Quillbound hero creator screen: moved out of index.html so character creation and combat can change independently
   (see AGENTS.md). A plain script, loaded before the main script in index.html: it only defines functions and constants,
   and uses the main script's globals (S, esc, render, toast, …) when they run. Rules: src/app/hero-rules.js. CLASS_PITCH and SPECIES_BLURB stay in index.html, next to the class and species data they are built from. */
/* ---------- views: creator ---------- */
/* ---------- views: hero creator (two panels) ----------
   Left: guided steps that record choices. Right: the live sheet, always calculated by src/app/hero-rules.js
   from those choices (data: src/app/srd-heroes.js, SRD 5.2; spells load when the Spells step opens). */
const CR_STEPS=[['species','Species'],['class','Class & level'],['abilities','Abilities'],['background','Background'],['skills','Skills'],['spells','Spells'],['equipment','Equipment'],['story','Story'],['review','Review']];
const CR_HEAD={species:['Where do you come from?','Your species is your hero’s people. Each one gives a few traits. You can’t pick wrong.'],
  class:['What kind of hero do you picture?','Your class is what you do in a fight and outside it. Pick the description that sounds most fun, then the level your DM asked for.'],
  abilities:['What are you good at?','Six abilities. Higher is better. Choose how to get your scores; we place the best ones where your class needs them.'],
  background:['What did you do before adventuring?','Your background raises abilities, gives an origin feat, skills and a little gear.'],
  skills:['What have you trained?','Skills you are trained in add your proficiency bonus.'],
  spells:['Which spells do you know?','Cantrips can be cast any time. Prepared spells use spell slots.'],
  equipment:['What do you carry?','Take a starting kit, then choose what you wear and wield. The sheet works out armor class and attacks.'],
  story:['Who are you?','A name and three questions that give your hero a past. The DM will use them.'],
  review:['Your hero is ready','Check the sheet with your DM, then add the hero to the party.']};
const firstSentence=t=>(String(t||'').split(/(?<=[.!?])\s/)[0]||'').replace(/\*\*/g,'');
const crData=()=>QBHeroRules.data(); // SRD plus approved homebrew
function crNew(){return {v:2,step:'species',tab:'summary',swap:null,boostUI:{mode:'2-1',plus2:'',plus1:''},asiUI:{},
  build:{name:'',level:1,abilities:{method:'array',base:null},boost:{},skills:[],expertise:[],mastery:[],asi:{},hp:{method:'average',rolls:{}},gear:{cls:0,bg:0},spells:{cantrips:[],prepared:[]},featPicks:{}},
  story:{left:'',want:'',fear:''}};}
function crState(){ if(S.creator?.v!==2) S.creator=crNew(); return S.creator; }
// Ability priority for a class: its primary abilities, its spellcasting ability, then Constitution and Dexterity.
function crPriority(clsId){ const c=crData().classes.find(x=>x.id===clsId); return [...new Set([...(c?.primary||[]),...(c?.spellAbility?[c.spellAbility]:[]),'CON','DEX','WIS','STR','CHA','INT'])].slice(0,6); }
function crRecommended(clsId){ return Object.fromEntries(crPriority(clsId).map((k,i)=>[k,QBHeroRules.ARRAY[i]])); }
// A feat's text without its Prerequisite and Ability Score Increase lines, for a one-line summary.
const featBlurb=f=>String(f?.desc||'').split('\n').filter(l=>!/^\*\*(Prerequisite|Ability Score Increase)/.test(l)).join(' ');
// Which abilities a feat's own +1 can raise, read from its "Ability Score Increase" line (Grappler: STR or DEX; Epic Boons: any). null: the feat has no +1.
const AB_NAME={Strength:'STR',Dexterity:'DEX',Constitution:'CON',Intelligence:'INT',Wisdom:'WIS',Charisma:'CHA'};
function featAbilities(id){ const m=(crData().feats.find(x=>x.id===id)?.desc||'').match(/Ability Score Increase\.\*\*([^\n]*)/); if(!m) return null; if(/of your choice/.test(m[1])) return ABIL.slice(); const ks=Object.entries(AB_NAME).filter(([n])=>m[1].includes(n)).map(([,k])=>k); return ks.length?ks:null; }
// Turn the helper fields of the screen (+2/+1 pickers, improvement pickers) into the build the rules read.
function crSync(c){
  const b=c.build, bg=crData().backgrounds.find(x=>x.id===b.background);
  b.level=Math.max(1,Math.min(20,Number(b.level)||1));
  if(bg){ const u=c.boostUI; if(u.mode==='1-1-1') b.boost=Object.fromEntries(bg.abilities.map(k=>[k,1]));
    else { b.boost={}; if(bg.abilities.includes(u.plus2)) b.boost[u.plus2]=2; if(bg.abilities.includes(u.plus1)&&u.plus1!==u.plus2) b.boost[u.plus1]=1; } }
  for(const lv of QBHeroRules.asiLevels(b)){ const u=c.asiUI[lv]||{}; if(!u.feat){ delete b.asi[lv]; continue; }
    const plus={}; if(u.feat==='ability-score-improvement'){ if(u.mode==='1-1'){ if(u.a) plus[u.a]=(plus[u.a]||0)+1; if(u.b) plus[u.b]=(plus[u.b]||0)+1; } else if(u.a) plus[u.a]=2; } else if(u.a&&featAbilities(u.feat)?.includes(u.a)) plus[u.a]=1;
    b.asi[lv]={feat:u.feat,plus}; }
  for(const lv of Object.keys(b.asi)) if(!QBHeroRules.asiLevels(b).includes(+lv)) delete b.asi[lv];
  if(b.equip){ if(b.equip.armor==='') b.equip.armor=null; }
}
function crSheet(c){ QBHeroRules.setHomebrew(QBHomebrew.forCreator(S.homebrew,c.build)); crSync(c); return QBHeroRules.derive({...c.build,name:c.build.name||'Your hero'}); }
const crOpenIn=(sheet,c,k)=>k==='story'?(c.build.name.trim()?0:1):sheet.open.filter(o=>o.step===k).reduce((n,o)=>n+o.left,0);
const crSteps=sheet=>CR_STEPS.filter(([k])=>k!=='spells'||sheet.spellcasting);
// Spells are a large file: load them only when needed (the check loads them directly).
function crSpells(then){ if(globalThis.QBSPELLS) return globalThis.QBSPELLS; if(then) (crSpells.waiting||=[]).push(then);
  if(!crSpells.loading&&typeof document.createElement==='function'){ crSpells.loading=true; const s=document.createElement('script'); s.src='src/app/srd-spells.js'; s.onload=()=>{ (crSpells.waiting||[]).splice(0).forEach(f=>f()); render(); }; document.head.appendChild(s); } return null; }
const crPick=(act,attrs,on,label,body)=>`<button class="choice ${on?'on':''}" data-act="${act}" ${attrs} aria-pressed="${on}">${label}${body||''}</button>`;
// The optional extra (a spell's description) sits outside the label, so opening it doesn't tick the box.
const crCheck=(k,v,on,label,max,extra='')=>`<div class="cr-check ${on?'on':''}"><label><input type="checkbox" data-act="cr-toggle" data-k="${k}" data-v="${esc(v)}" data-max="${max}" ${on?'checked':''}> <span>${label}</span></label>${extra}</div>`;
const crOpt=(v,label,sel)=>`<option value="${esc(v)}" ${sel?'selected':''}>${esc(label)}</option>`;
// Everything that can be bought, grouped by kind, with its price (granted items show no price).
function crShop(free){ const D=crData(), order={armor:0,shield:1,weapon:2,gear:3,pack:4,tool:5,focus:6};
  return Object.entries(D.equipment).filter(([,e])=>e.cost).sort((a,b)=>(order[a[1].kind]??9)-(order[b[1].kind]??9)||a[1].name.localeCompare(b[1].name))
    .map(([id,e])=>crOpt(id,`${e.name}${e.kind==='armor'?' (AC '+e.ac+')':e.kind==='weapon'?' ('+e.dice+')':''}${free?'':' · '+QBHeroRules.priceOf(id,e.bundle||1)+' GP'+(e.bundle?' for '+e.bundle:'')}`,false)).join(''); }
function crCount(have,want,what){ return `<p class="cr-count ${have>=want?'done':''}">${have>=want?'✓':'Choose'} ${have} of ${want} ${what}</p>`; }

function crStepBody(c,sheet){
  const b=c.build, D=crData(), cls=D.classes.find(x=>x.id===b.cls), sp=D.species.find(x=>x.id===b.species), bg=D.backgrounds.find(x=>x.id===b.background);
  switch(c.step){
  case 'species': return `<div class="choices">${D.species.map(s=>crPick('cr-species',`data-v="${s.id}"`,b.species===s.id,`<div class="cls">${esc(s.name)}${s.homebrew?' <span class="chip acc">Homebrew</span>':''}</div>`,`<div class="desc">${esc(SPECIES_BLURB[s.name]||firstSentence(s.desc)||'')}</div><div class="small"><span class="muted">You get:</span> ${esc(s.traits.map(t=>t.name).join(', '))}. Speed ${s.speed} ft.</div>`)).join('')}</div>
    ${sp?`<div class="card stack cr-detail"><h3>${esc(sp.name)} traits</h3>${sp.traits.map(t=>`<details><summary><b>${esc(t.name)}</b> · ${esc(firstSentence(t.desc))}</summary><p class="small">${esc(t.desc)}</p></details>`).join('')}
      ${sp.sub.length?`<h4>Choose a lineage</h4><div class="choices small-cards">${sp.sub.map(x=>crPick('cr-sub',`data-v="${x.id}"`,b.sub===x.id,`<div class="cls">${esc(x.name.replace(/^[^:]+:\s*/,''))}</div>`,`<div class="small">${esc(x.traits.map(t=>t.name).join(', ')||x.damage)}</div>`)).join('')}</div>`:''}
      ${!sp.size?`<label class="f">Size<select data-bind="creator.build.size" data-rerender>${crOpt('','Choose…',!b.size)}${['Small','Medium'].map(x=>crOpt(x,x,b.size===x)).join('')}</select></label>`:''}
      ${sp.traits.some(t=>t.id==='versatile')?`<label class="f">Versatile: choose an origin feat<select data-bind="creator.build.speciesFeat" data-rerender>${crOpt('','Choose…',!b.speciesFeat)}${D.feats.filter(f=>f.type==='origin').map(f=>crOpt(f.id,f.name+(f.id==='skilled'?' (recommended)':''),b.speciesFeat===f.id)).join('')}</select></label>`:''}</div>`:''}`;
  case 'class': {
    const asi=QBHeroRules.asiLevels(b), styles=D.feats.filter(f=>f.type==='fighting-style'), hd=cls?.hitDie||8;
    return `<div class="row cr-quick"><span class="small muted">New to D&D? Choose a class card, then <b>Quick build</b> fills every other choice with a sensible default you can change.</span>${cls?`<button class="btn sm" data-act="cr-quick" data-v="${cls.id}">Quick build: ${esc(cls.name)}</button>`:''}</div>
      <div class="choices">${D.classes.map(x=>{const p=CLASS_PITCH[x.name]||{pitch:firstSentence(x.desc),blurb:''};return crPick('cr-class',`data-v="${x.id}"`,b.cls===x.id,`<div class="meta"><span class="eyebrow">${esc(x.name)}</span>${x.homebrew?'<span class="chip acc">Homebrew</span>':''}${p.diff?`<span class="chip ${p.diff.startsWith('Eas')?'ok':p.diff==='Medium'?'warn':'bad'}">${p.diff}</span>`:''}</div><div class="pitch">${esc(p.pitch||'')}</div>`,`<div class="desc">${esc(p.blurb||'')}</div><div class="small muted">Hit die d${x.hitDie} · ${esc(x.primary.join(' or '))}</div>`);}).join('')}</div>
      ${cls?`<div class="card stack cr-detail"><label class="f">Level<select data-act-change="cr-level">${Array.from({length:20},(_,i)=>crOpt(i+1,'Level '+(i+1),b.level===i+1)).join('')}</select><span class="small muted">Use the level your DM asked for. New adventures usually start at level 1.</span></label>
        ${b.level>=3&&cls.subclass?`<p><b>Subclass at level 3:</b> ${esc(cls.subclass.name)} · ${esc(cls.subclass.summary)} <span class="small muted">(the SRD has one subclass per class)</span></p>`:''}
        ${({fighter:1,paladin:2,ranger:2})[b.cls]<=b.level?`<label class="f">Fighting Style feat<select data-bind="creator.build.fightingStyle" data-rerender>${crOpt('','Choose…',!b.fightingStyle)}${styles.map(f=>crOpt(f.id,f.name,b.fightingStyle===f.id)).join('')}</select><span class="small muted">${esc(firstSentence(styles.find(f=>f.id===b.fightingStyle)?.desc||'Defense adds 1 to armor class while you wear armor; Archery adds 2 to ranged attack rolls.'))}</span></label>`:''}
        ${asi.length?`<div class="row small"><label><input type="checkbox" data-act="cr-featview" data-v="featRec" ${c.featRec?'checked':''}> Only recommended feats (★: the +1 suits ${/^[AEIOU]/i.test(cls?.name||'')?'an':'a'} ${esc(cls?.name||'class')})</label><label><input type="checkbox" data-act="cr-featview" data-v="featFuture" ${c.featFuture?'checked':''}> Show future feats (not available yet, and why)</label></div>`:''}
        ${asi.map(lv=>{const u=(c.asiUI[lv]??={}), main=crPriority(b.cls).slice(0,2), rec=f=>f.id==='ability-score-improvement'||(featAbilities(f.id)||[]).some(k=>main.includes(k));
          const pool=D.feats.filter(f=>lv===19?(f.type==='epic-boon'||f.id==='ability-score-improvement'):f.type==='general'), avail=pool.filter(f=>u.feat===f.id||QBHeroRules.featAllowed(b,f,lv)), feats=avail.filter(f=>!c.featRec||rec(f)||u.feat===f.id);
          const future=c.featFuture?pool.filter(f=>!avail.includes(f)).map(f=>({f,why:QBHeroRules.featBlockers(b,f,lv)})):[];
          return `<fieldset class="cr-asi"><legend>Level ${lv}: ${lv===19?'Epic Boon or an improvement':'Ability Score Improvement or a feat'}</legend><select data-bind="creator.asiUI.${lv}.feat" data-rerender>${crOpt('','Choose…',!u.feat)}${feats.map(f=>crOpt(f.id,f.name+(rec(f)?' ★':''),u.feat===f.id)).join('')}</select>
            ${u.feat==='ability-score-improvement'?`<select data-bind="creator.asiUI.${lv}.mode" data-rerender>${crOpt('2','+2 to one ability',u.mode!=='1-1')}${crOpt('1-1','+1 to two abilities',u.mode==='1-1')}</select><select data-bind="creator.asiUI.${lv}.a" data-rerender>${crOpt('','Ability…',!u.a)}${ABIL.map(k=>crOpt(k,APPROACH[k].name+' ('+k+')',u.a===k)).join('')}</select>${u.mode==='1-1'?`<select data-bind="creator.asiUI.${lv}.b" data-rerender>${crOpt('','Ability…',!u.b)}${ABIL.map(k=>crOpt(k,APPROACH[k].name+' ('+k+')',u.b===k)).join('')}</select>`:''}`
            :featAbilities(u.feat)?`<select data-bind="creator.asiUI.${lv}.a" data-rerender>${crOpt('','+1 to an ability…',!u.a)}${featAbilities(u.feat).map(k=>crOpt(k,'+1 '+APPROACH[k].name+' ('+k+')',u.a===k)).join('')}</select>`:''}
            ${u.feat?`<p class="small muted">${esc(firstSentence(featBlurb(D.feats.find(f=>f.id===u.feat))))}</p>`:''}
            ${c.featFuture?(future.length?`<p class="small"><b>Not yet:</b></p><ul class="small muted">${future.map(x=>`<li>${esc(x.f.name)}${rec(x.f)?' ★':''}: ${esc(x.why.join(', '))}</li>`).join('')}</ul>`:'<p class="small muted">No other feats are waiting: you can already take every feat of this kind.</p>'):''}</fieldset>`;}).join('')}
        ${b.level>1?`<fieldset class="cr-asi"><legend>Hit points after level 1</legend><label><input type="radio" name="cr-hp" data-act="cr-hp" data-v="average" ${b.hp.method!=='roll'?'checked':''}> Take the average (${hd/2+1} + Constitution per level)</label><label><input type="radio" name="cr-hp" data-act="cr-hp" data-v="roll" ${b.hp.method==='roll'?'checked':''}> Roll a fair d${hd} per level (each roll is kept)</label>
          ${b.hp.method==='roll'?`<div class="pickrow">${Array.from({length:b.level-1},(_,i)=>i+2).map(lv=>Number.isInteger(b.hp.rolls[lv])?`<span class="chip">Level ${lv}: ${b.hp.rolls[lv]}</span>`:`<button class="btn sm" data-act="cr-hp-roll" data-v="${lv}">Roll level ${lv}</button>`).join('')}</div>`:''}</fieldset>`:''}</div>`:''}`; }
  case 'abilities': {
    const a=b.abilities, m=a.method, scores=sheet.scores, top=crPriority(b.cls).slice(0,2);
    const methods=[['array','Standard array','15, 14, 13, 12, 10, 8'],['pointbuy','Point buy','27 points, scores 8–15'],['roll','Roll 4d6','drop the lowest, fair dice, once'],['set','Set values','type in scores you already have']];
    let body='';
    if(m==='array'||m==='roll'){
      if(m==='roll'&&!a.rolls) body=`<p>Roll six times: four fair d6 each, the lowest die is dropped. The result is kept with this hero; it can’t be quietly rolled again.</p><button class="btn primary" data-act="cr-roll">Roll ability scores</button>`;
      else body=`<p class="muted small">We placed the best scores where a ${esc(cls?.name||'hero')} needs them. <b>Click two abilities to swap them.</b></p><div class="abil-table">${ABIL.map(k=>{const base=m==='roll'?QBHeroRules.rollTotal(a.rolls[a.order[k]]):a.base?.[k];
        return `<button class="abil" data-act="cr-swap" data-v="${k}" aria-pressed="${c.swap===k}"><span class="score">${scores[k]}</span><span class="mod">${fmt(mod(scores[k]))}</span><span class="what"><b>${APPROACH[k].name} <span class="muted small">(${k})</span>${top.includes(k)?' <span class="chip acc">Key for '+esc(cls?.name||'')+'</span>':''}</b><span>${APPROACH[k].plain}${scores[k]!==base?` · ${base} before increases`:''}${m==='roll'?` · dice ${a.rolls[a.order[k]].join(', ')}`:''}</span></span></button>`;}).join('')}</div>`;
    } else if(m==='pointbuy'){
      const spent=ABIL.reduce((n,k)=>n+(QBHeroRules.POINT_COST[a.base[k]]??0),0);
      body=`<p class="cr-count ${spent<=27?'done':''}">${27-spent} of 27 points left</p><div class="cr-pb">${ABIL.map(k=>`<div><b>${APPROACH[k].name} (${k})</b><button class="btn sm" data-act="cr-pb" data-k="${k}" data-d="-1" ${a.base[k]<=8?'disabled':''} aria-label="Lower ${k}">−</button><span class="score">${a.base[k]}</span><button class="btn sm" data-act="cr-pb" data-k="${k}" data-d="1" ${a.base[k]>=15||spent+((QBHeroRules.POINT_COST[a.base[k]+1]??99)-QBHeroRules.POINT_COST[a.base[k]])>27?'disabled':''} aria-label="Raise ${k}">+</button><span class="small muted">→ ${scores[k]} (${fmt(mod(scores[k]))})</span></div>`).join('')}</div>`;
    } else body=`<div class="cr-pb">${ABIL.map(k=>`<label><b>${APPROACH[k].name} (${k})</b> <input type="number" min="3" max="20" step="1" data-bind="creator.build.abilities.base.${k}" value="${esc(a.base?.[k]??10)}"> <span class="small muted">→ ${scores[k]} (${fmt(mod(scores[k]))}) after increases</span></label>`).join('')}</div>`;
    return `<div class="cr-methods">${methods.map(([k,t,s])=>crPick('cr-method',`data-v="${k}"`,m===k,`<b>${t}</b>`,`<span class="small muted">${s}</span>`)).join('')}</div>${body}
      <p class="small muted">Your background (next step) adds +2 and +1, or +1 to three abilities. Scores can’t go above 20.</p>`; }
  case 'background': {
    const u=c.boostUI;
    return `<div class="choices">${D.backgrounds.map(x=>crPick('cr-bg',`data-v="${x.id}"`,b.background===x.id,`<div class="cls">${esc(x.name)}${x.homebrew?' <span class="chip acc">Homebrew</span>':''}</div>`,`<div class="small">${x.desc?esc(firstSentence(x.desc))+'<br>':''}<span class="muted">Raises</span> ${x.abilities.join(', ')}<br><span class="muted">Feat</span> ${esc(x.feat?.name||'')}${x.feat?.note?' ('+esc(x.feat.note)+')':''}<br><span class="muted">Skills</span> ${esc(x.skills.map(s=>D.skills.find(k=>k.id===s)?.name).join(', '))}</div>`)).join('')}</div>
      ${bg?`<div class="card stack cr-detail"><fieldset class="cr-asi"><legend>Raise your abilities</legend><label><input type="radio" name="cr-boost" data-act="cr-boost" data-v="2-1" ${u.mode!=='1-1-1'?'checked':''}> +2 to one and +1 to another</label><label><input type="radio" name="cr-boost" data-act="cr-boost" data-v="1-1-1" ${u.mode==='1-1-1'?'checked':''}> +1 to all three (${bg.abilities.join(', ')})</label>
        ${u.mode!=='1-1-1'?`<div class="row"><select data-bind="creator.boostUI.plus2" data-rerender>${crOpt('','+2 to…',!u.plus2)}${bg.abilities.map(k=>crOpt(k,'+2 '+APPROACH[k].name+' ('+k+')',u.plus2===k)).join('')}</select><select data-bind="creator.boostUI.plus1" data-rerender>${crOpt('','+1 to…',!u.plus1)}${bg.abilities.filter(k=>k!==u.plus2).map(k=>crOpt(k,'+1 '+APPROACH[k].name+' ('+k+')',u.plus1===k)).join('')}</select></div>`:''}</fieldset>
        ${bg.feat?`<details open><summary><b>Origin feat: ${esc(bg.feat.name)}</b>${bg.feat.note?' ('+esc(bg.feat.note)+')':''}</summary><p class="small">${esc(D.feats.find(f=>f.id===bg.feat.id)?.desc||'')}</p></details>`:''}
        ${bg.toolChoice?`<label class="f">${esc(bg.toolChoice.desc)}<select data-bind="creator.build.toolChoice" data-rerender>${crOpt('','Choose…',!b.toolChoice)}${bg.toolChoice.from.map(x=>crOpt(x,x,b.toolChoice===x)).join('')}</select></label>`:''}</div>`:''}`; }
  case 'skills': {
    const prof=Object.entries(sheet.skills).filter(([,v])=>v.prof).map(([k])=>k), want=QBHeroRules.expertiseCount(b), fromBg=new Set(bg?.skills||[]);
    const name=id=>D.skills.find(k=>k.id===id)?.name||id, feats=sheet.feats;
    return `<div class="stack">${cls?.skillChoice?`<section class="card stack"><h3>${esc(cls.name)} skills</h3>${crCount((b.skills||[]).filter(x=>cls.skillChoice.from.includes(x)).length,cls.skillChoice.choose,'skills')}<div class="cr-checks">${cls.skillChoice.from.map(id=>crCheck('skills',id,(b.skills||[]).includes(id),esc(name(id))+(fromBg.has(id)?' <span class="small muted">(already from background)</span>':''),cls.skillChoice.choose)).join('')}</div></section>`:''}
      ${sp?.traits.some(t=>t.id==='skillful')?`<section class="card stack"><h3>Skillful (${esc(sp.name)})</h3><select data-bind="creator.build.speciesSkill" data-rerender>${crOpt('','Choose a skill…',!b.speciesSkill)}${D.skills.map(k=>crOpt(k.id,k.name,b.speciesSkill===k.id)).join('')}</select></section>`:''}
      ${sp?.traits.some(t=>t.id==='keen-senses')?`<section class="card stack"><h3>Keen Senses (${esc(sp.name)})</h3><div class="cr-checks">${['insight','perception','survival'].map(id=>`<label class="cr-check ${b.keenSense===id?'on':''}"><input type="radio" name="cr-keen" data-act="cr-keen" data-v="${id}" ${b.keenSense===id?'checked':''}> ${esc(name(id))}</label>`).join('')}</div></section>`:''}
      ${feats.includes('skilled')?`<section class="card stack"><h3>Skilled feat</h3>${crCount((b.featPicks.skilled||[]).length,3,'skills')}<div class="cr-checks">${D.skills.map(k=>crCheck('skilled',k.id,(b.featPicks.skilled||[]).includes(k.id),esc(k.name),3)).join('')}</div></section>`:''}
      ${b.cls==='bard'&&b.level>=3?`<section class="card stack"><h3>College of Lore: Bonus Proficiencies</h3><p class="small muted">Three skills of your choice.</p>${crCount((b.featPicks.lore||[]).length,3,'skills')}<div class="cr-checks">${D.skills.map(k=>crCheck('lore',k.id,(b.featPicks.lore||[]).includes(k.id),esc(k.name),3)).join('')}</div></section>`:''}
      ${want?`<section class="card stack"><h3>Expertise</h3><p class="small muted">Double your proficiency bonus in skills you are already trained in.</p>${crCount((b.expertise||[]).filter(x=>prof.includes(x)).length,want,'skills')}<div class="cr-checks">${prof.map(id=>crCheck('expertise',id,(b.expertise||[]).includes(id),esc(name(id)),want)).join('')||'<p class="small muted">Choose trained skills first.</p>'}</div></section>`:''}
      <p class="small muted">From your background: ${esc([...fromBg].map(name).join(', ')||'none yet')}.</p></div>`; }
  case 'spells': {
    const list=crSpells(); if(!list) return '<p>Loading the spell list…</p>';
    const sc=sheet.spellcasting, maxLevel=sc.slots.reduce((m,n,i)=>n?i+1:m,0), mine=list.filter(s=>s.classes.includes(QBHeroRules.spellList(b)));
    const row=(k,s,max)=>crCheck(k,s.id,(b.spells[k]||[]).includes(s.id),`<b>${esc(s.name)}</b> <span class="small muted">${s.level?'level '+s.level:'cantrip'} · ${esc(s.school)}${s.conc?' · concentration':''}${s.ritual?' · ritual':''}</span>`,max,`<details><summary class="small">What it does</summary><p class="small">${esc(s.desc)}</p>${s.higher?`<p class="small">${esc(s.higher)}</p>`:''}<p class="small muted">${esc([s.time,s.range,s.duration].join(' · '))}</p></details>`);
    return `<p class="small">Spell save DC <b>${sc.dc}</b> · spell attack <b>${fmt(sc.attack)}</b> · slots ${sc.slots.map((n,i)=>n?`${n}×${i+1}`:'').filter(Boolean).join(', ')||'none yet'}</p>
      ${sc.cantrips?`<section class="card stack"><h3>Cantrips</h3>${crCount(b.spells.cantrips.length,sc.cantrips,'cantrips')}<div class="cr-checks">${mine.filter(s=>s.level===0).map(s=>row('cantrips',s,sc.cantrips)).join('')}</div></section>`:''}
      <section class="card stack"><h3>Prepared spells (level 1–${maxLevel})</h3>${crCount(b.spells.prepared.length,sc.prepared,'spells')}<div class="cr-checks">${mine.filter(s=>s.level>=1&&s.level<=maxLevel).map(s=>row('prepared',s,sc.prepared)).join('')}</div></section>`; }
  case 'equipment': {
    const it=id=>D.equipment[id], own=sheet.gear.items, eq=b.equip||sheet.gear.equipped, armors=[...new Set(own.filter(x=>it(x.id)?.kind==='armor').map(x=>x.id))], hasShield=own.some(x=>it(x.id)?.kind==='shield'), weapons=[...new Set(own.filter(x=>it(x.id)?.kind==='weapon').map(x=>x.id))];
    const kit=(opt,k,label)=>opt?`<fieldset class="cr-asi"><legend>${label}</legend>${opt.choices.map((ch,i)=>`<label><input type="radio" name="cr-gear-${k}" data-act="cr-gear" data-k="${k}" data-v="${i}" ${(b.gear[k]??0)===i?'checked':''}> ${String.fromCharCode(65+i)}: ${esc(ch.items.map(x=>(x.count>1?x.count+' ':'')+x.name).join(', ')||'')}${ch.gp?`${ch.items.length?', ':''}${ch.gp} GP`:''}${ch.other.length?' (plus a choice from the description)':''}</label>`).join('')}</fieldset>`:'';
    const mCount=(sheet.open.find(o=>o.label==='Weapon Mastery')?.left||0)+(b.mastery||[]).length;
    return `${kit(cls?.equipment,'cls',`${esc(cls?.name||'Class')} starting kit`)}${kit(bg?.equipment,'bg',`${esc(bg?.name||'Background')} kit`)}
      <section class="card stack"><h3>More gear</h3><p class="small muted">Buy more with the kits’ gold, or add what your DM gives you.</p>
        ${(b.gear.extra||[]).map((x,i)=>`<div class="row hb-item"><span>${esc(it(x.id)?.name||x.id)}${x.count>1?' × '+x.count:''} <span class="small muted">${x.how==='grant'?'granted by the DM':'bought for '+QBHeroRules.priceOf(x.id,x.count)+' GP'}</span></span><button class="btn sm ghost" data-act="cr-extra-del" data-v="${i}" aria-label="Remove">×</button></div>`).join('')}
        <div class="row"><label class="f">Buy with gold<select data-act-change="cr-buy">${crOpt('','Choose an item…',true)}${crShop()}</select></label><label class="f">Granted by the DM<select data-act-change="cr-grant">${crOpt('','Choose an item…',true)}${crShop(true)}</select></label></div>
        <p class="cr-count ${sheet.gear.gp>=0?'done':''}">Gold left: ${sheet.gear.gp} GP (the kits give ${sheet.gear.startGp} GP)</p></section>
      <section class="card stack"><h3>Training granted by the DM</h3><p class="small muted">A house rule: only add training your DM allowed (for example a bard who learned the longbow). It shows on the sheet as a house rule.</p>
        <div class="cr-checks">${Object.entries(QBHeroRules.TRAINING).filter(([k,l])=>!(cls?.profs||[]).some(p=>p.toLowerCase()===l.toLowerCase()||p==='All armor'&&/armor/i.test(l))).map(([k,l])=>`<label class="cr-check ${(b.training||[]).includes(k)?'on':''}"><input type="checkbox" data-act="cr-train" data-v="${k}" ${(b.training||[]).includes(k)?'checked':''}> ${esc(l)}</label>`).join('')}</div>
        ${(b.training||[]).filter(g=>it(g)).map(g=>`<span class="chip">${esc(it(g).name)} <button class="linklike" data-act="cr-train" data-v="${esc(g)}" aria-label="Remove">×</button></span>`).join(' ')}
        <label class="f">One weapon only<select data-act-change="cr-train">${crOpt('','Choose a weapon…',true)}${Object.entries(D.equipment).filter(([id,w])=>w.kind==='weapon'&&!QBHeroRules.proficientWith(b,id)).sort((x,y)=>x[1].name.localeCompare(y[1].name)).map(([id,w])=>crOpt(id,w.name,false)).join('')}</select></label></section>
      <section class="card stack"><h3>Worn and wielded</h3><label class="f">Armor<select data-act-change="cr-armor">${crOpt('','No armor',!eq.armor)}${armors.map(id=>crOpt(id,`${it(id).name} (AC ${it(id).ac}${it(id).dex?it(id).maxDex!=null?' + Dex, max '+it(id).maxDex:' + Dex':''})`,eq.armor===id)).join('')}</select></label>
        ${hasShield?`<label><input type="checkbox" data-act="cr-shield" ${eq.shield?'checked':''}> Carry the shield (+2 AC)</label>`:''}
        <div class="cr-checks">${weapons.map(id=>`<label class="cr-check ${eq.weapons.includes(id)?'on':''}"><input type="checkbox" data-act="cr-weapon" data-v="${id}" ${eq.weapons.includes(id)?'checked':''}> ${esc(it(id).name)} <span class="small muted">${esc(it(id).dice)} ${esc(it(id).type)}${QBHeroRules.proficientWith(b,id)?'':' · not trained'}</span></label>`).join('')||'<p class="small muted">No weapons in this kit.</p>'}</div>
        <p class="small muted">AC ${sheet.ac} from ${esc(sheet.acFrom)}. Gold: ${sheet.gear.gp} GP.</p></section>
      ${mCount?`<section class="card stack"><h3>Weapon Mastery</h3><p class="small muted">Choose kinds of weapon whose mastery property you can use.</p>${crCount((b.mastery||[]).length,mCount,'weapons')}<div class="cr-checks">${Object.entries(D.equipment).filter(([id,w])=>w.kind==='weapon'&&w.mastery&&QBHeroRules.proficientWith(b,id)).map(([id,w])=>crCheck('mastery',id,(b.mastery||[]).includes(id),`${esc(w.name)} <span class="small muted">· ${esc(D.mastery.find(x=>x.id===w.mastery)?.name||'')}</span>`,mCount)).join('')}</div></section>`:''}`; }
  case 'story': {
    const q=(k,label,help)=>`<label class="f" for="cr-${k}">${label}<textarea id="cr-${k}" data-bind="creator.story.${k}" rows="2" placeholder="${help}">${esc(c.story[k])}</textarea></label><div class="pickrow">${PROMPTS[k].map(p=>`<button class="chip" data-act="cr-chip" data-k="${k}" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>`;
    return `<div class="prompts card"><div><label class="f" for="cr-name">Name</label><div class="row" style="flex-wrap:nowrap"><input id="cr-name" data-bind="creator.build.name" value="${esc(b.name)}" placeholder="What do people call you?"><button class="btn sm" data-act="cr-randname">Suggest</button></div></div>
      ${q('left','Who did you leave behind?','Someone who matters, and who might show up later')}${q('want','What do you want more than anything?','A goal the DM can put in your way')}${q('fear','What are you afraid of?','The DM will use this. Gently.')}
      <p class="small muted">Not sure? Tap a suggestion. Your answers become personal leads on the DM desk.</p></div>`; }
  default: {
    const open=[...sheet.open,...(b.name.trim()?[]:[{step:'story',label:'Name',left:1}])];
    return `<div class="card stack"><h3>${esc(b.name||'Your hero')}</h3><p>Level ${sheet.level} ${esc(sheet.species)} ${esc(sheet.cls)}${sheet.subclass?' ('+esc(sheet.subclass)+')':''} · ${esc(sheet.background)}</p>
      ${open.length?`<div class="cl-error" role="alert"><b>Still to choose:</b><ul>${open.map(o=>`<li><button class="linklike" data-act="cr-step" data-v="${o.step}">${esc(o.label)}${o.left>1?' ('+o.left+')':''}</button></li>`).join('')}</ul></div>`:'<p class="cr-count done">✓ Every choice is made.</p>'}
      ${sheet.warnings.length?`<ul class="small lt-warning">${sheet.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}
      <div class="row"><button class="btn discord" data-act="discord" data-v="sheet">Preview Discord message</button><button class="btn" data-act="cr-printsheet">Character sheet (print / PDF)</button><button class="btn" data-act="cr-new">Start another</button><button class="btn primary" data-act="cr-add" ${open.length?'disabled':''}>Add to party</button></div></div>`; }
  }
}
// The live sheet: every number calculated from the choices so far.
function crSheetPanel(c,sheet){
  const tabs=[['summary','Summary'],['combat','Combat'],['skills','Skills'],...(sheet.spellcasting?[['spells','Spells']]:[]),['features','Features'],['gear','Gear']], t=tabs.some(([k])=>k===c.tab)?c.tab:'summary';
  const D=crData(), name=id=>D.skills.find(k=>k.id===id)?.name||id, list=globalThis.QBSPELLS||[];
  let body='';
  if(t==='summary') body=`<div class="stats"><div class="stat"><b>${sheet.hp.max}</b><span>Hit points</span></div><div class="stat"><b>${sheet.ac}</b><span>Armor class</span></div><div class="stat"><b>${sheet.speed}</b><span>Speed (ft)</span></div><div class="stat"><b>${fmt(sheet.prof)}</b><span>Proficiency</span></div><div class="stat"><b>${fmt(sheet.initiative)}</b><span>Initiative</span></div><div class="stat"><b>${sheet.passive}</b><span>Passive Perception</span></div></div>
    <div class="abils6">${ABIL.map(k=>`<div><small>${k}</small><b>${sheet.scores[k]}</b><small>${fmt(sheet.mods[k])} · save ${fmt(sheet.saves[k].bonus)}${sheet.saves[k].prof?' ●':''}</small></div>`).join('')}</div>
    <p class="small muted">${esc(sheet.acFrom)}${sheet.senses.length?' · '+esc(sheet.senses.join(', ')):''}${sheet.size?' · '+esc(sheet.size):''}</p>`;
  if(t==='combat') body=`<table class="cr-table"><tr><th>Attack</th><th>Bonus</th><th>Damage</th><th>Per action</th></tr>${sheet.attacks.map(a=>`<tr><td>${esc(a.name)}${a.note?' <span class="small lt-warning">'+esc(a.note)+'</span>':''}</td><td>${fmt(a.bonus)}</td><td>${esc(a.damage)} ${esc(a.type||'')}</td><td>${a.count}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">Choose weapons or attack cantrips.</td></tr>'}</table>
    <p class="small">In Stakes combat: HP ${sheet.hp.max}, AC ${sheet.ac}, stamina ${sheet.stamina}, Hit Dice ${sheet.hitDice.count} × d${sheet.hitDice.die}. The first attack in this list is the one the Combat tab uses.</p>${sheet.spellcasting?`<p class="small">Spell save DC ${sheet.spellcasting.dc} · spell attack ${fmt(sheet.spellcasting.attack)}</p>`:''}`;
  if(t==='skills') body=`${sheet.tools.length?`<p class="small"><b>Tools:</b> ${esc(sheet.tools.join(', '))}</p>`:''}<ul class="cr-skills">${Object.entries(sheet.skills).map(([id,s])=>`<li class="${s.prof?'on':''}"><span>${s.expert?'◆':s.prof?'●':'○'} ${esc(s.name)} <span class="small muted">${s.ability}</span></span><b>${fmt(s.bonus)}</b></li>`).join('')}</ul><p class="small muted">● trained · ◆ expertise</p>`;
  if(t==='spells'){ const sc=sheet.spellcasting, nm=id=>list.find(s=>s.id===id)?.name||id; body=`<p>DC ${sc.dc} · attack ${fmt(sc.attack)} · ${esc(sc.ability)}</p><p class="small">Slots: ${sc.slots.map((n,i)=>n?`level ${i+1} × ${n}`:'').filter(Boolean).join(', ')||'none yet'}</p><p class="small"><b>Cantrips:</b> ${esc((c.build.spells.cantrips||[]).map(nm).join(', ')||'none')}</p><p class="small"><b>Prepared:</b> ${esc((c.build.spells.prepared||[]).map(nm).join(', ')||'none')}</p>`; }
  if(t==='features') body=sheet.features.map(f=>`<details><summary><b>${esc(f.name)}</b> <span class="small muted">${esc(f.source)}${f.level>1?' · level '+f.level:''}</span></summary><p class="small">${esc(f.desc)}</p></details>`).join('')||'<p class="muted">Choose a species and class.</p>';
  if(t==='gear') body=`<p class="small">${esc(sheet.gear.items.map(x=>(x.count>1?x.count+' × ':'')+x.name+(x.from==='Granted by the DM'?' (granted)':'')).join(', ')||'Nothing yet')} · ${sheet.gear.gp} GP left</p><p class="small muted">Wearing: ${esc(D.equipment[sheet.gear.equipped.armor]?.name||'no armor')}${sheet.gear.equipped.shield?', shield':''}.</p>`;
  return `<aside class="cr-sheet" aria-label="Live character sheet"><div class="eyebrow">Live sheet</div><h3>${esc(c.build.name||'Your hero')}</h3><p class="small muted">${sheet.cls?`Level ${sheet.level} ${esc(sheet.species||'')} ${esc(sheet.cls)}${sheet.subclass?' · '+esc(sheet.subclass):''}`:'Choose a species and class'}${sheet.background?' · '+esc(sheet.background):''}</p>
    <div class="cr-tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${t===k}" data-act="cr-tab" data-v="${k}">${l}</button>`).join('')}</div><div class="cr-tabbody">${body}</div>
    ${sheet.open.length?`<p class="small lt-warning">${sheet.open.reduce((n,o)=>n+o.left,0)} choice${sheet.open.reduce((n,o)=>n+o.left,0)>1?'s':''} still open</p>`:''}</aside>`;
}
function vCreate(){
  const c=crState(), sheet=crSheet(c), steps=crSteps(sheet); if(!steps.some(([k])=>k===c.step)) c.step='species';
  const i=steps.findIndex(([k])=>k===c.step), head=CR_HEAD[c.step];
  const stepper=`<div class="cr-steps" role="list">${steps.map(([k,l])=>{const n=crOpenIn(sheet,c,k);return `<button role="listitem" data-act="cr-step" data-v="${k}" ${k===c.step?'aria-current="step"':''} class="${n?'':'done'}">${l}${k==='review'?'':n?` <span class="badge">${n}</span>`:' ✓'}</button>`;}).join('')}</div>`;
  const foot=`<div class="cr-foot"><button class="btn" data-act="cr-step" data-v="${steps[i-1]?.[0]||''}" ${i===0?'disabled':''}>Back</button>${i<steps.length-1?`<button class="btn primary" data-act="cr-step" data-v="${steps[i+1][0]}">Next: ${steps[i+1][1]}</button>`:''}</div>`;
  return `<div class="pagehead"><div><div class="eyebrow">Character creator · SRD 5.2 rules</div><h2>${head[0]}</h2><p>${head[1]}</p></div></div>
    <div class="cr-layout"><div class="cr-main">${stepper}${crStepBody(c,sheet)}${foot}</div>
    <details class="cr-sheet-wrap" open><summary>View sheet</summary>${crSheetPanel(c,sheet)}</details></div>`;
}
// Creator actions; spread into ACT where it is defined.
function creatorActions(){ const B=()=>crState().build, D=()=>crData();
  return {
  'cr-step':d=>{ if(d.v) crState().step=d.v; window.scrollTo(0,0); },
  'cr-tab':d=>{ crState().tab=d.v; },
  'cr-species':d=>{ const b=B(); if(b.species!==d.v){ Object.assign(b,{species:d.v,sub:'',size:'',speciesSkill:'',keenSense:'',speciesFeat:''}); } },
  'cr-sub':d=>{ B().sub=d.v; },
  'cr-class':d=>{ const c=crState(), b=c.build; if(b.cls===d.v) return; Object.assign(b,{cls:d.v,skills:[],expertise:[],fightingStyle:'',mastery:[],asi:{},spells:{cantrips:[],prepared:[]},gear:{cls:0,bg:b.gear?.bg||0},equip:undefined}); c.asiUI={};
    if(b.abilities.method==='array') b.abilities.base=crRecommended(d.v); if(b.abilities.method==='roll'&&b.abilities.rolls) ACT['cr-order'](); },
  'cr-quick':d=>{ const c=crState(); crSpells(()=>{ const b=crState().build; if(b.cls===d.v&&!b.spells.cantrips.length&&!b.spells.prepared.length) QBHeroRules.fillDefaults(b); }); const q=QBHeroRules.quickBuild(d.v,c.build.name,c.build.level,c.build.species?c.build:{}); c.build={...c.build,...q,equip:undefined};
    const bg=D().backgrounds.find(x=>x.id===q.background), two=Object.entries(q.boost); c.boostUI=two.length===3?{mode:'1-1-1',plus2:'',plus1:''}:{mode:'2-1',plus2:two.find(([,v])=>v===2)?.[0]||'',plus1:two.find(([,v])=>v===1)?.[0]||''};
    c.asiUI=Object.fromEntries(Object.entries(q.asi||{}).map(([lv,x])=>[lv,{feat:x.feat,mode:'2',a:Object.keys(x.plus)[0]||''}]));
    toast(`Quick build: ${D().species.find(x=>x.id===q.species)?.name}, ${bg.name} background, standard array. Change anything you like.`); },
  'cr-printsheet':()=>{ const c=crState(); crSheet(c); openSheet(c.build,{want:c.story?.want,fear:c.story?.fear}); },
  'sheet-print':d=>{ const p=pc(d.id); if(!p?.build){ toast('This hero was made before the hero creator. Rebuild them there to print a sheet.'); return; } openSheet({...p.build,name:p.name},{want:p.want}); },
  'cr-featview':d=>{ const c=crState(); c[d.v]=!c[d.v]; },
  'cr-level':d=>{ B().level=Number(d.v)||1; },
  'cr-hp':d=>{ B().hp.method=d.v; },
  'cr-hp-roll':d=>{ const b=B(), hd=D().classes.find(x=>x.id===b.cls)?.hitDie||8; if(!Number.isInteger(b.hp.rolls[d.v])) b.hp.rolls[d.v]=QBHeroRules.rollHp(hd); },
  'cr-method':d=>{ const a=B().abilities; a.method=d.v; if(d.v==='array') a.base=crRecommended(B().cls); if(d.v==='pointbuy') a.base=Object.fromEntries(ABIL.map(k=>[k,8])); if(d.v==='set'&&!a.base) a.base=Object.fromEntries(ABIL.map(k=>[k,10])); crState().swap=null; },
  'cr-roll':()=>{ const a=B().abilities; if(a.rolls) return; a.rolls=QBHeroRules.rollAbilities(); ACT['cr-order'](); },
  // Highest rolls go where the class needs them most; the player can swap afterwards.
  'cr-order':()=>{ const a=B().abilities, idx=a.rolls.map((r,i)=>i).sort((x,y)=>QBHeroRules.rollTotal(a.rolls[y])-QBHeroRules.rollTotal(a.rolls[x])); a.order=Object.fromEntries(crPriority(B().cls).map((k,i)=>[k,idx[i]])); },
  'cr-swap':d=>{ const c=crState(), a=c.build.abilities, map=a.method==='roll'?a.order:a.base; if(!c.swap){c.swap=d.v;return;} if(c.swap!==d.v){const t=map[c.swap]; map[c.swap]=map[d.v]; map[d.v]=t;} c.swap=null; },
  'cr-pb':d=>{ const base=B().abilities.base; base[d.k]=Math.max(8,Math.min(15,base[d.k]+(+d.d))); },
  'cr-bg':d=>{ const c=crState(), bg=D().backgrounds.find(x=>x.id===d.v); if(c.build.background===d.v) return; c.build.background=d.v; c.build.toolChoice='';
    const top=crPriority(c.build.cls).filter(k=>bg.abilities.includes(k)); c.boostUI={mode:'2-1',plus2:top[0]||bg.abilities[0],plus1:top[1]||bg.abilities[1]}; },
  'cr-boost':d=>{ crState().boostUI.mode=d.v; },
  'cr-keen':d=>{ B().keenSense=d.v; },
  'cr-toggle':d=>{ const b=B(), k=d.k, list=k==='cantrips'||k==='prepared'?(b.spells[k]||=[]):k==='skilled'||k==='lore'?(b.featPicks[k]||=[]):(b[k]||=[]); const i=list.indexOf(d.v);
    if(i>=0) list.splice(i,1); else if(list.length<(+d.max||99)) list.push(d.v); else toast(`You can choose ${d.max}. Untick one first.`); },
  'cr-gear':d=>{ const b=B(); b.gear[d.k]=+d.v; b.equip=undefined; },
  'cr-buy':d=>{ if(!d.v) return; const b=B(); (b.gear.extra||=[]).push({id:d.v,count:crData().equipment[d.v]?.bundle||1,how:'buy'}); b.equip=undefined; },
  'cr-grant':d=>{ if(!d.v) return; const b=B(); (b.gear.extra||=[]).push({id:d.v,count:crData().equipment[d.v]?.bundle||1,how:'grant'}); b.equip=undefined; },
  'cr-extra-del':d=>{ const b=B(); b.gear.extra.splice(+d.v,1); b.equip=undefined; },
  'cr-train':d=>{ if(!d.v) return; const b=B(), t=b.training||=[], i=t.indexOf(d.v); if(i>=0) t.splice(i,1); else t.push(d.v); b.equip=undefined; },
  'cr-armor':d=>{ const b=B(); b.equip=b.equip||QBHeroRules.equipped(b); b.equip.armor=d.v||null; },
  'cr-shield':()=>{ const b=B(); b.equip=b.equip||QBHeroRules.equipped(b); b.equip.shield=!b.equip.shield; },
  'cr-weapon':d=>{ const b=B(); b.equip=b.equip||QBHeroRules.equipped(b); const w=b.equip.weapons=[...b.equip.weapons], i=w.indexOf(d.v); if(i>=0) w.splice(i,1); else w.push(d.v); },
  'cr-chip':d=>{ crState().story[d.k]=d.v; },
  'cr-randname':()=>{ B().name=NAMES[Math.floor(Math.random()*NAMES.length)]; },
  'cr-new':()=>{ S.creator=crNew(); },
  'cr-add':()=>{ const c=crState(), sheet=crSheet(c); if(sheet.open.length||!c.build.name.trim()) { toast('Finish the open choices first.'); return; }
    const used=crData().backgrounds.find(x=>x.id===c.build.background&&x.homebrew); const usedSp=crData().species.find(x=>x.id===c.build.species&&x.homebrew), usedCl=crData().classes.find(x=>x.id===c.build.cls&&x.homebrew); const copy=x=>x?[JSON.parse(JSON.stringify(x))]:[]; const featIds=new Set([crData().backgrounds.find(x=>x.id===c.build.background)?.feat?.id,c.build.speciesFeat,c.build.fightingStyle,...Object.values(c.build.asi||{}).map(x=>x.feat)].filter(Boolean)), usedFt=crData().feats.filter(x=>x.homebrew&&featIds.has(x.id)).map(x=>JSON.parse(JSON.stringify(x)));
    if(used||usedSp||usedCl||usedFt.length) c.build.hbData={backgrounds:copy(used),species:copy(usedSp),classes:copy(usedCl),feats:usedFt}; // the hero keeps its own copy
    const p=QBHeroRules.toHero(JSON.parse(JSON.stringify(c.build)),sheet,{id:uid('p'),want:c.story.want}); p.name=c.build.name.trim(); heroDefaults(p); S.party.push(p);
    [['want','wants'],['left','left behind'],['fear','fears']].forEach(([k,l])=>{ if(c.story[k].trim()) S.hooks.push({id:uid('h'),text:`${p.name} ${l}: ${c.story[k].trim()}`,status:'dangling',clock:0,source:'Character'}); });
    toast(`${p.name} joined the party. Their story answers are now leads on the DM desk.`); S.creator=crNew(); }
  };
}
