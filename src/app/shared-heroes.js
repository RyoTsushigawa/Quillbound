/* Only explicit character data crosses the network. Never serialize the campaign. */
(function(root){
 const clone=x=>JSON.parse(JSON.stringify(x));
 function stable(x){return JSON.stringify(sort(x));}
 function sort(x){return Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,sort(x[k])])):x;}
 function sheet(record,party=false){
  if(!record?.build)throw Error('Dieser Charakter hat noch keinen vollständigen Bogen.');
  const build=clone(record.build);if(party)build.name=record.name;
  const story=party?{...record.heroStory,want:record.want || ''}:record.story || {};
  const out={build,story:{want:String(story.want || '').slice(0,500),fear:String(story.fear || '').slice(0,500),left:String(story.left || '').slice(0,500)}};
  const json=stable(out);if(json.length>120000)throw Error('Der Charakter ist für die Synchronisierung zu groß (maximal 120.000 Zeichen).');return json;
 }
 function read(json,derive){
  if(typeof json!=='string'||json.length>120000)throw Error('Ungültiger gemeinsamer Charakter.');
  const data=JSON.parse(json);if(!data?.build?.cls||!data.build.species||!data.build.name)throw Error('Im gemeinsamen Bogen fehlen Name, Klasse oder Spezies.');
  const s=derive(data.build);if(!s?.cls)throw Error('Die Klasse des gemeinsamen Bogens ist hier nicht verfügbar.');
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
   if(!old || ![old.dmUid,old.playerUid].includes(uid))throw Error('Kein Zugriff auf diesen Charakter.');
   if(old.revision!==expected)throw Error('CONFLICT');
   return {...old,sheetJson,revision:expected+1,updatedBy:uid};
  });
 }
 root.QBSharedHeroes={sheet,read,state,update,stable};
})(globalThis);
