(function(root){
 const CHUNK=240000,MAX=2880000;
 function split(url){if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url || '')||url.length>MAX)throw Error('Karte zu groß oder ungültig. Maximal etwa 2 MB Bilddaten.');return Array.from({length:Math.ceil(url.length/CHUNK)},(_,i)=>url.slice(i*CHUNK,(i+1)*CHUNK));}
 function join(parts,count){if(!Number.isInteger(count)||count<1||count>12||parts.length!==count||parts.some(x=>typeof x!=='string'||!x||x.length>CHUNK))throw Error('Die Karte wurde noch nicht vollständig übertragen.');const url=parts.join('');split(url);return url;}
 const active=(session,now=Date.now())=>!!session?.active&&Number(session.expiresAt?.toMillis?.() ?? session.expiresAt)>now;
 const member=(session,uid)=>!!uid&&(session?.dmUid===uid||(session?.members || []).includes(uid));
 root.QBLiveSession={split,join,active,member};
})(globalThis);
