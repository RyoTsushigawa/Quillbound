/* Personal HP is play state, separate from the saved character build. */
(function(root){
  function read(hero,max){
    if(!Number.isInteger(max)||max<1||max>100000)throw Error('This character needs a valid maximum HP first.');
    const value=hero.hpTracker?.current;
    return {max,current:Number.isInteger(value)?Math.max(0,Math.min(max,value)):max,history:(hero.hpTracker?.history || []).filter(Number.isInteger).slice(0,10)};
  }
  function change(hero,max,action,amount){
    const state=read(hero,max);let current=state.current,history=[...state.history];
    if(action==='undo'){if(history.length)current=Math.max(0,Math.min(max,history.shift()));}
    else {
      if(!['damage','heal','set','full'].includes(action))throw Error('Choose damage, healing, set HP or full HP.');
      if(action!=='full'&&(!Number.isInteger(amount)||amount<0||amount>100000))throw Error('Enter a whole number from 0 to 100,000.');
      current=action==='full'?max:action==='set'?Math.min(max,amount):action==='damage'?Math.max(0,current-amount):Math.min(max,current+amount);
      if(current!==state.current)history=[state.current,...history].slice(0,10);
    }
    hero.hpTracker={current,history};return read(hero,max);
  }
  root.QBPlayerHP={read,change};
})(globalThis);
