import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';

const executable=process.argv[2];
if(!executable)throw Error('Usage: node tools/browser-smoke.js /path/to/chromium-browser');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'bookmark-smoke-'));
const child=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--disable-sync','--remote-debugging-pipe','--enable-unsafe-extension-debugging','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe'],windowsHide:true});
let sequence=0,buffer='';const pending=new Map();
child.stderr.on('data',chunk=>process.stderr.write(chunk));
child.stdio[4].on('data',chunk=>{
 buffer+=chunk;let end;
 while((end=buffer.indexOf('\0'))>=0){const message=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);const call=pending.get(message.id);if(call){pending.delete(message.id);clearTimeout(call.timer);message.error?call.reject(Error(message.error.message)):call.resolve(message.result);}}
});
function command(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Timed out: '+method));},15000);pending.set(id,{resolve,reject,timer});child.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});}
try{
 const version=await command('Browser.getVersion');
 const {id}=await command('Extensions.loadUnpacked',{path:path.resolve('extension')});
 const {targetId}=await command('Target.createTarget',{url:`chrome-extension://${id}/dashboard.html`});
 const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 for(let i=0;i<40;i++){if(await evaluate("document.readyState==='complete' && document.getElementById('browser')?.textContent.includes('profile')"))break;await delay(100);}
 assert.equal(await evaluate("document.readyState"),'complete');
 const result=await evaluate(`(async()=>{
  const call=async(type,body={})=>{const r=await chrome.runtime.sendMessage({type,...body});if(r.error)throw Error(r.error);return r.data;};
  const tree=await chrome.bookmarks.getTree();
  const walk=n=>[n,...(n.children||[]).flatMap(walk)];
  if(walk(tree[0]).some(n=>n.url))throw Error('Disposable profile must have no bookmarks');
  const folder=await chrome.bookmarks.create({parentId:tree[0].children[0].id,title:'Synthetic smoke'});
  const link=await chrome.bookmarks.create({parentId:folder.id,title:'Video Games',url:'https://example.org/synthetic'});
  await call('analyze');await call('review',{ids:[link.id],status:'approved'});
  const plan=await call('preview');if(!plan.operations.length)throw Error('Empty plan');
  await call('apply',{planId:plan.id});
  if((await chrome.bookmarks.get(link.id))[0].parentId===folder.id)throw Error('Bookmark did not move');
  await call('rollback');
  if((await chrome.bookmarks.get(link.id))[0].parentId!==folder.id)throw Error('Rollback failed');
  const backup=await call('backup',{password:'synthetic smoke passphrase'});
  if(backup.value.encrypted!==2)throw Error('Encryption failed');
  await call('restore',{value:backup.value,password:'synthetic smoke passphrase'});
  await load();
  if(!document.querySelector('#rows .card'))throw Error('Dashboard did not render');
  return {links:walk((await chrome.bookmarks.getTree())[0]).filter(n=>n.url).length,operations:plan.operations.length,cards:document.querySelectorAll('#rows .card').length};
 })()`);
 assert.equal(result.links,1);assert.equal(result.cards,1);
 fs.mkdirSync('dist',{recursive:true});
 const shot=await command('Page.captureScreenshot',{format:'png'},sessionId);
 const name=path.basename(executable).replace(/[^a-z0-9]/gi,'-');fs.writeFileSync(`dist/smoke-${name}.png`,Buffer.from(shot.data,'base64'));
 console.log(JSON.stringify({browser:version.product,...result,status:'passed',profile},null,2));
}finally{
 await command('Browser.close').catch(()=>{});child.kill();
 for(const call of pending.values()){clearTimeout(call.timer);call.reject(Error('Browser closed'));}pending.clear();
 // Keep the disposable profile for diagnosis; never delete or open a user's profile.
}
