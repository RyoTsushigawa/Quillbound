/* Dramatic events use a separate chance check. They never reroll or alter a d20. */
(function(root){
  const R=root.CombatLite,init=R.init,apply=R.apply,prepare=R.prepare,condition=R.condition;
  R.init=function(s){const l=init(s);if(!l)return l;l.dramaUsed??={};l.dramaTried??={};l.conditionNotes??={};l.secretRolls??=[];s.dramaSettings??={enabled:true,heightened:false};return l;};
  R.describe=function(s,id,label){return root.ConditionGuide.get(label,R.init(s)?.conditionNotes?.[id]?.[label]);};
  R.condition=function(s,id,label,notes){condition(s,id,label);const l=R.init(s);if(notes){l.conditionNotes[id]??={};l.conditionNotes[id][label.trim().slice(0,80)]={description:String(notes.description||'').slice(0,1000),clears:String(notes.clears||'').slice(0,500)};}};
  R.configure=function(s,d){const p=s.party.find(p=>p.id===(d.mode==='enemy'?d.target:d.actor));if(!p)return;
    const primary={Fighter:'STR',Rogue:'DEX',Barbarian:'STR',Paladin:'STR',Cleric:'WIS',Bard:'CHA',Ranger:'DEX',Warlock:'CHA',Wizard:'INT',Druid:'WIS'}[p.cls]||'STR';
    const best=keys=>keys.reduce((a,b)=>(Number(p.abil?.[b])||10)>(Number(p.abil?.[a])||10)?b:a);
    const action=d.mode==='enemy'?'defend':d.action;let ability=action==='move'?'DEX':action==='defend'?best(['DEX','CON']):primary;
    if(action==='improvise'&&d.effect==='condition'){const label=d.condition||'';if(/pin|disarm|knock|push|hold/i.test(label))ability=best(['STR','DEX']);else if(/fear|shak|distract|intimidat/i.test(label))ability='CHA';else if(/hidden|hide|sneak/i.test(label))ability='DEX';else if(/spell|confus|plan/i.test(label))ability=best(['INT','WIS']);}
    const sheet=p.combatActions?.[action];d.ability=sheet?.ability&&p.abil?.[sheet.ability]!==undefined?sheet.ability:ability;d.trained=typeof sheet?.trained==='boolean'?sheet.trained:(p.trained||[]).includes(d.ability);
  };
  R.prepare=function(s,d,die,second){R.init(s);R.configure(s,d);const p=prepare(s,d,die,second);s.publicRolls??=[];s.publicRolls.push({id:root.crypto.randomUUID?.()||String(Date.now())+'-'+s.publicRolls.length,die:p.die,dice:p.dice.slice(),total:p.total,band:p.band,roller:R.actor(s,p.roller)?.name||'Hero'});if(s.publicRolls.length>20)s.publicRolls.shift();return p;};
  function chance(){const a=new Uint32Array(1);do{root.crypto.getRandomValues(a);}while(a[0]>=4294967200);return 1+a[0]%100;}
  const hindrance=t=>!['defiant','second wind','hidden','protected','opening'].includes(String(t).toLowerCase());
  function eligible(s,id,kind){const l=R.init(s);if(!s.dramaSettings.enabled||l.dramaUsed[id])return false;const key=id+':'+s.combat.round+':'+kind;if(l.dramaTried[key])return false;l.dramaTried[key]=true;return chance()<=(s.dramaSettings.heightened?25:10);}
  function syncWounds(s,a){const l=R.init(s);if(R.hero(s,a.id))a.conds=Array.from({length:4},(_,i)=>i<l.wounds[a.id]?'Wounded':null);else if(a.status==='down')a.status='fighting';}
  function moment(s,a,kind){const l=R.init(s);l.dramaUsed[a.id]=true;let recovered=0,cleared='';
    if(kind==='laststand'){l.wounds[a.id]=R.capacity(s,a)-1;syncWounds(s,a);R.condition(s,a.id,'Defiant');}
    else{recovered=Math.min(1,l.wounds[a.id]);l.wounds[a.id]=Math.max(0,l.wounds[a.id]-1);syncWounds(s,a);const i=l.conditions[a.id].findIndex(hindrance);if(i>=0)cleared=l.conditions[a.id].splice(i,1)[0];R.condition(s,a.id,'Second wind');}
    const title=kind==='laststand'?'LAST STAND':'POWER THROUGH';const text=kind==='laststand'?`${a.name} withstands the finishing blow and stays in the fight with one wound box remaining.`:`${a.name} pushes through${recovered?', recovering one wound':''}${cleared?' and clearing '+cleared:''}.`;
    l.lastDrama={title,text,actor:a.id};R.log(s,title+': '+text,'drama');return true;
  }
  R.apply=function(s){const l=R.init(s),p=l.pending;if(!p)return;const before={...l.wounds},copy={...p};const result=apply(s);let fired=false;
    if(copy.mode!=='enemy'&&copy.action==='improvise'&&copy.effect==='condition'&&['crit','success','mixed'].includes(copy.band))R.condition(s,copy.target,copy.condition,{description:copy.intent,clears:'Resolve the cause in the fiction with the DM.'});
    for(const a of [...s.party,...s.combat.foes]){if((before[a.id]||0)<R.capacity(s,a)&&l.wounds[a.id]>=R.capacity(s,a)&&eligible(s,a.id,'laststand')){moment(s,a,'laststand');fired=true;break;}}
    const a=R.actor(s,copy.actor),landed=copy.mode==='enemy'?['mixed','setback','disaster'].includes(copy.band):['crit','success','mixed'].includes(copy.band);
    if(!fired&&a&&landed&&R.active(s,a)&&(l.wounds[a.id]>0||l.conditions[a.id].some(hindrance))&&eligible(s,a.id,'surge'))moment(s,a,'surge');
    return result;
  };
  R.secret=function(s,label,bonus){const l=R.init(s);bonus=Number(bonus);if(!Number.isInteger(bonus)||Math.abs(bonus)>100)throw Error('Use a whole-number bonus between −100 and 100.');const die=R.d20();const r={label:String(label||'Secret check').slice(0,120),die,bonus,total:die+bonus};l.secretRolls.unshift(r);l.secretRolls.length=Math.min(l.secretRolls.length,20);return r;};
  R.dramaChance=chance;
})(globalThis);
