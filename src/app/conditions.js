(function(root){
  const entries={
    Disarmed:['You cannot use the weapon you lost. Recover it, draw another weapon, or act another way.','Recover a weapon or have an ally return it.'],
    Pinned:['Something holds you or your equipment in place. You cannot freely move the pinned thing.','Break free, remove the obstacle, or get help.'],
    'Sword pinned':['Your sword is trapped. It cannot be swung until freed; you can still use another weapon or action.','Free the sword or abandon it.'],
    Exposed:['You have lost safety or cover. Enemies can reach or threaten you more easily. There is no hidden numerical penalty.','Reach cover, create distance, or have an ally protect you.'],
    Distracted:['Your attention is pulled away. An opponent may exploit what you are overlooking.','Deal with the distraction or have someone warn you.'],
    Hidden:['The opposition does not know your exact position. You can use that uncertainty to act.','Ends when you reveal your position or are discovered.'],
    Separated:['You are cut off from your allies and cannot immediately receive close support.','Rejoin the group or make a safe route between you.'],
    'Separated and pinned':['You are isolated and held in place. You must deal with the restraint or obtain help before moving freely.','Break free and rejoin your allies.'],
    'Spell interrupted':['The spell being attempted does not finish. This does not permanently remove spellcasting.','Begin a new casting when able; agree any spent resource with the DM.'],
    'Knocked down':['You are on the ground and must account for that position before moving or fighting normally.','Get back up when the situation allows, or accept risk to rise under pressure.'],
    Shaken:['Fear or shock makes it hard to commit to the threat that caused it. You can still retreat, help, or act around it.','Receive reassurance, gain safety, or confront the cause.'],
    Bleeding:['An untreated injury is bleeding. It matters in the fiction; this tracker does not automatically tick extra damage.','Apply first aid, receive healing, or stop the bleeding.'],
    Protected:['An ally covers you: your next defense roll gets an opening (roll two fair d20s, keep the higher).','Spent on your next defense roll that uses it.'],
    Opening:['Roll two fair d20s for the next roll and keep the higher. The opening is consumed when that roll is confirmed.','Consumed on the next confirmed roll.'],
    Winded:['Your stamina is spent. You can still push a roll by spending a Hit Die instead (overexert). Nothing else changes.','A long rest restores stamina.'],
    Dying:['At 0 hit points. Make a death save at the start of each of your turns: 10 or higher succeeds, a natural 20 brings you back with 1 HP, a natural 1 counts as two failures. Damage counts as a failure.','Healing, three successes (stable), or an ally’s help.'],
    Wavering:['This enemy has reached its breaking point. It may flee, surrender, offer a deal, or fight on; the DM decides.','The DM’s decision, or a clear change in the fiction.'],
    fighting:['Still participating in the encounter.','Changes when defeated, when fleeing, surrendering, or making a deal.'],
    down:['Out of this fight at 0 hit points. This does not automatically mean death.','Healing or recovery as agreed with the DM.'],
    fled:['Has left the immediate fight. They may appear again later.','Return to the scene or be pursued.'],
    surrendered:['Has stopped fighting and yielded. They can be questioned or negotiated with.','A clear change in the fiction.'],
    bargained:['Has agreed to stop fighting as part of a deal.','Resolve or break that deal in the fiction.']
  };
  function get(name,custom){const clean=String(name||'').replace(/\s*\([^)]*\)\s*$/,'').trim();const key=Object.keys(entries).find(k=>k.toLowerCase()===clean.toLowerCase())||(/pinned/i.test(clean)?'Pinned':/disarm/i.test(clean)?'Disarmed':null);const entry=entries[key];return {name:String(name||''),description:custom?.description||entry?.[0]||'A custom change to the situation. Agree what this makes possible or prevents before the next action.',clears:custom?.clears||entry?.[1]||'Resolve the cause in the fiction with the DM.'};}
  root.ConditionGuide={get,entries};
})(globalThis);
