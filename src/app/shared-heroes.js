/* Only explicit character data crosses the network. Never serialize the campaign. */
(function(root){
 const clone=x=>JSON.parse(JSON.stringify(x));
 function stable(x){return JSON.stringify(sort(x));}
 function sort(x){return Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,sort(x[k])])):x;}
 function sheet(record,party=false){
  if(!record?.build)throw Error('This character does not have a complete sheet yet.');
  const build=clone(record.build);if(party)build.name=record.name;
  const story=party?{...record.heroStory,want:record.want || ''}:record.story || {};
  const out={build,story:{want:String(story.want || '').slice(0,500),fear:String(story.fear || '').slice(0,500),left:String(story.left || '').slice(0,500)}};
  const json=stable(out);if(json.length>120000)throw Error('The character is too large to sync (maximum 120,000 characters).');return json;
 }
 function read(json,derive){
  if(typeof json!=='string'||json.length>120000)throw Error('Invalid shared character.');
  const data=JSON.parse(json);if(!data?.build?.cls||!data.build.species||!data.build.name)throw Error('The shared sheet is missing a name, class or species.');
  const s=derive(data.build);if(!s?.cls)throw Error('This shared character uses a class unavailable in this browser.');
  return {build:clone(data.build),story:{want:String(data.story?.want || '').slice(0,500),fear:String(data.story?.fear || '').slice(0,500),left:String(data.story?.left || '').slice(0,500)},sheet:s};
 }
 function state(local,remote){
  if(!local?.cloudLink)return 'unlinked';
  if(!remote)return 'waiting';
  const current=sheet(local,!!local.cloudParty),link=local.cloudLink;
  if(current===remote.sheetJson)return 'same';
  if(current===link.baseJson)return 'incoming';
  return remote.revision===link.revision?'outgoing':'conflict';
 }
 async function update(adapter,id,expected,sheetJson,uid){
  return adapter.transaction(id,old=>{
   if(!old || ![old.dmUid,old.playerUid].includes(uid))throw Error('No access to this character.');
   if(old.revision!==expected)throw Error('CONFLICT');
   return {...old,sheetJson,revision:expected+1,updatedBy:uid};
  });
 }
 root.QBSharedHeroes={sheet,read,state,update,stable};
})(globalThis);
