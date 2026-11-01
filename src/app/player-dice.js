/* Standalone player rolls share the creator's fair rejection-sampled die. */
(function(root){
  function roll(expression,{mode='normal',die=sides=>root.QBHeroRules.die(sides)}={}){
    const formula=String(expression).replace(/\s+/g,'').toLowerCase();
    if(formula.length>150 || !/^[+-]?(?:\d*d(?:4|6|8|10|12|20|100)|\d+)(?:[+-](?:\d*d(?:4|6|8|10|12|20|100)|\d+))*$/.test(formula))throw Error('Use dice such as 1d20+5, 2d6+3 or 1d6+4+3d6.');
    if(!['normal','advantage','disadvantage'].includes(mode))throw Error('Choose Normal, Advantage or Disadvantage.');
    const terms=formula.match(/[+-]?[^+-]+/g),groups=[];let total=0,diceCount=0;
    for(const term of terms){
      const sign=term[0]==='-'?-1:1,raw=term.replace(/^[+-]/,''),match=raw.match(/^(\d*)d(\d+)$/);
      if(!match){const value=Number(raw);if(!Number.isSafeInteger(value)||value>10000)throw Error('Use a modifier of 10,000 or less.');groups.push({sign,value});continue;}
      const count=Number(match[1]||1),sides=Number(match[2]);diceCount+=count;
      if(count<1 || diceCount>100)throw Error('Roll between 1 and 100 dice at a time.');
      groups.push({sign,count,sides});
    }
    if(!diceCount)throw Error('Include at least one die.');
    const check=groups.filter(g=>g.sides),singleD20=check.length===1 && check[0].sides===20 && check[0].count===1 && check[0].sign===1;
    if(mode!=='normal'&&!singleD20)throw Error('Advantage applies to one d20 check. Choose Normal for damage or other dice.');
    let natural=null;const detail=[];
    for(const g of groups){
      if(!g.sides){total+=g.sign*g.value;detail.push((g.sign<0?'-':'+')+g.value);continue;}
      const values=Array.from({length:g.count+(mode!=='normal'?1:0)},()=>die(g.sides));
      const kept=mode==='advantage'?Math.max(...values):mode==='disadvantage'?Math.min(...values):values.reduce((n,v)=>n+v,0);
      if(singleD20)natural=kept;
      total+=g.sign*kept;detail.push((g.sign<0?'-':'+')+'['+values.join(', ')+']'+(mode!=='normal'?' keep '+kept:''));
    }
    return {formula,mode,total,natural,detail:detail.join(' ').replace(/^\+/,''),diceCount};
  }
  root.QBPlayerDice={roll};
})(globalThis);
