function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value!==null&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,stable(value[k])]));
  }
  return value;
}
async function sha256(text){
  const bytes=new TextEncoder().encode(text);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
}
// Browser storage may deserialize object keys in a different order. Hash a
// canonical structure, not JSON's insertion order, to make backups portable.
export async function digest(value){return sha256(JSON.stringify(stable(value)));}
async function legacyDigest(value){return sha256(JSON.stringify(value));}
export function validateTree(tree){
  if(!Array.isArray(tree)||tree.length!==1||tree[0].parentId!==undefined)throw Error('Invalid bookmark root');
  const ids=new Set(),stack=tree.map(n=>[n,undefined]);let count=0;
  while(stack.length){const [n,parent]=stack.pop();if(!n||typeof n.id!=='string'||ids.has(n.id)||typeof n.title!=='string'||n.parentId!==parent||++count>100000)throw Error('Invalid or duplicate bookmark node');ids.add(n.id);if(n.url!==undefined&&typeof n.url!=='string')throw Error('Invalid URL');if(n.url!==undefined&&n.children)throw Error('Bookmark cannot contain children');for(const c of n.children||[])stack.push([c,n.id]);}return tree;
}
export async function snapshot(tree,profile,label='Manual backup') {validateTree(tree);const payload={version:2,id:crypto.randomUUID(),at:new Date().toISOString(),profile,label,tree:structuredClone(tree)};return {...payload,checksum:await digest(payload)};}
export async function verifySnapshot(value){const {checksum,...payload}=value;if(payload.version!==2||(await digest(payload)!==checksum&&await legacyDigest(payload)!==checksum))throw Error('Backup integrity validation failed');validateTree(payload.tree);return value;}
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const un64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function keyFor(password,salt){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encryptBackup(value,password){if(password.length<12)throw Error('Use a passphrase of at least 12 characters');const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await keyFor(password,salt),bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value))));let encoded='';for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));return {encrypted:2,salt:b64(salt),iv:b64(iv),data:btoa(encoded)};}
export async function decryptBackup(value,password){if(value.encrypted!==2)throw Error('Unknown encrypted backup format');const key=await keyFor(password,un64(value.salt));const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(value.iv)},key,un64(value.data));return verifySnapshot(JSON.parse(new TextDecoder().decode(bytes)));}
export function comparable(tree){return tree.map(n=>({id:n.id,parentId:n.parentId,title:n.title,url:n.url,children:n.children?comparable(n.children):undefined}));}
