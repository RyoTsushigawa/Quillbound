function playerHpCard(hero,sheet){
  if(!sheet)return '';
  try{const hp=QBPlayerHP.read(hero,sheet.hp.max);if(hero.hpTracker)hero.hpTracker.current=hp.current;
    return `<div><div class="row" style="justify-content:space-between"><b>HP ${hp.current} / ${hp.max}${hp.current===0?' · at 0 HP':''}</b><button class="btn sm" data-act="player-hp" data-id="${esc(hero.id)}">Track HP</button></div><meter min="0" max="${hp.max}" value="${hp.current}" low="${Math.floor(hp.max/2)}" high="${hp.max}" optimum="${hp.max}" aria-label="HP for ${esc(hero.build.name)}" style="width:100%">${hp.current} / ${hp.max}</meter></div>`;
  }catch{return '<p class="small muted">Finish the character’s HP choices to enable tracking.</p>';}
}
function playerHpDialog(id){
  const hero=cmHero(id),sheet=hero?cmSheet(hero.build):null;if(!hero||!sheet)return;
  let expected=JSON.stringify(hero.build);
  const dlg=openDialog('HP · '+hero.build.name,`<p id="player-hp-value" role="status" aria-live="polite"></p><label class="f">Damage or healing amount<input id="player-hp-amount" type="number" min="0" max="100000" step="1" value="1"></label><div class="row"><button class="btn" id="player-hp-damage">Take damage</button><button class="btn primary" id="player-hp-heal">Heal</button><button class="btn" id="player-hp-undo">Undo HP change</button></div><details><summary>Set HP directly</summary><label class="f">Current HP<input id="player-hp-current" type="number" min="0" max="${sheet.hp.max}" step="1"></label><div class="row"><button class="btn" id="player-hp-set">Set current HP</button><button class="btn" id="player-hp-full">Set to full HP</button></div></details><p class="small muted">Saved for this character on this device. This does not sync to the DM or change the character’s build. At 0 HP, resolve death saves with your DM. Full HP changes only HP, not rest resources.</p>`);
  const field=name=>dlg.querySelector('#player-hp-'+name);
  function show(){const hp=QBPlayerHP.read(hero,sheet.hp.max);field('value').textContent=hp.current+' / '+hp.max+' HP'+(hp.current===0?' · At 0 HP: check with your DM.':'');field('current').value=hp.current;field('undo').disabled=!hp.history.length;}
  for(const action of ['damage','heal','set','full','undo'])field(action).onclick=()=>{
    if(cmHero(id)!==hero||JSON.stringify(hero.build)!==expected){toast('This character changed. Reopen HP tracking.');return;}
    try{const value=action==='set'?field('current').value:field('amount').value;if(!['full','undo'].includes(action)&&String(value).trim()==='')throw Error('Enter an amount first.');QBPlayerHP.change(hero,sheet.hp.max,action,Number(value));show();save();render();}catch(error){toast(error.message);}
  };
  show();
}
