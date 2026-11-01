function playerDiceDialog(id){
  const hero=cmHero(id),sheet=hero?cmSheet(hero.build):null,choices=new Map();
  if(sheet){
    choices.set('initiative',{label:'Initiative',formula:'1d20'+fmt(sheet.initiative)});
    for(const [key,bonus] of Object.entries(sheet.mods))choices.set('ability:'+key,{label:key+' ability check',formula:'1d20'+fmt(bonus)});
    for(const [key,skill] of Object.entries(sheet.skills))choices.set('skill:'+key,{label:skill.name,formula:'1d20'+fmt(skill.bonus)});
    for(const [key,save] of Object.entries(sheet.saves))choices.set('save:'+key,{label:key+' saving throw',formula:'1d20'+fmt(save.bonus)});
    sheet.attacks.forEach((attack,i)=>{if(!attack.save)choices.set('attack:'+i,{label:attack.name+' · attack',formula:'1d20'+fmt(attack.bonus)});choices.set('damage:'+i,{label:attack.name+' · damage',formula:attack.damage});});
  }
  const dlg=openDialog(hero?'Roll dice · '+hero.build.name:'Roll dice',`<p>Roll here, then tell your DM or copy the result into Discord. Rolls are not sent automatically and do not change HP or resources.</p><label class="f">What are you rolling?<select id="player-dice-choice"><option value="custom">Custom dice</option>${[...choices].map(([key,value])=>`<option value="${esc(key)}">${esc(value.label)} (${esc(value.formula)})</option>`).join('')}</select></label><label class="f" id="player-dice-custom">Dice<input id="player-dice-formula" value="1d20" maxlength="150" placeholder="2d6+3"></label><div class="row">${[4,6,8,10,12,20,100].map(n=>`<button class="btn sm" data-player-die="${n}">d${n}</button>`).join('')}</div><label class="f">D20 check mode<select id="player-dice-mode"><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select></label><button class="btn primary" id="player-dice-roll">Roll</button><div id="player-dice-result" role="status" aria-live="polite"></div><button class="btn" id="player-dice-copy" disabled>Copy result</button><details><summary>Recent rolls on this device</summary><div id="player-dice-history"></div></details>`);
  const field=name=>dlg.querySelector('#player-dice-'+name);let latest='';
  const history=()=>{field('history').innerHTML=(S.playerDiceLog || []).slice(0,10).map(x=>`<p>${esc(x)}</p>`).join('') || '<p>No rolls yet.</p>';};history();
  field('choice').onchange=()=>{const custom=field('choice').value==='custom';field('formula').disabled=!custom;field('formula').value=choices.get(field('choice').value)?.formula || '1d20';field('mode').value='normal';field('mode').disabled=field('choice').value.startsWith('damage:');};
  dlg.querySelectorAll('[data-player-die]').forEach(button=>button.onclick=()=>{field('choice').value='custom';field('formula').disabled=false;field('formula').value='1d'+button.dataset.playerDie;field('mode').value='normal';field('mode').disabled=false;});
  field('roll').onclick=()=>{
    try{
      const selected=choices.get(field('choice').value),result=QBPlayerDice.roll(selected?.formula || field('formula').value,{mode:field('mode').value});
      const label=selected?.label || 'Custom dice',natural=result.natural===20?' · natural 20':result.natural===1?' · natural 1':'';
      latest=(hero?hero.build.name+' · ':'')+label+': '+result.formula+(result.mode==='normal'?'':' ('+result.mode+')')+' = '+result.total+' · '+result.detail+natural;
      field('result').innerHTML=`<h2>${result.total}</h2><p>${esc(latest)}</p>`;field('copy').disabled=false;S.playerDiceLog=[latest,...(S.playerDiceLog || [])].slice(0,20);save();history();
    }catch(error){field('result').textContent=error.message;field('copy').disabled=true;}
  };
  field('copy').onclick=()=>{if(!latest)return;(navigator.clipboard?.writeText(latest) || Promise.reject()).then(()=>toast('Roll copied. Paste it into Discord.'),()=>{field('result').innerHTML=`<label class="f">Copy this result<textarea readonly rows="3">${esc(latest)}</textarea></label>`;});};
}
