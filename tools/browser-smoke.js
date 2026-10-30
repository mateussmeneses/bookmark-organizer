// Real-browser smoke test: Chrome, Edge, Brave or Chromium using isolated profiles.
// Uses the browser's WebSocket DevTools endpoint instead of a fragile pipe transport.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';

const executable=process.argv[2];
if(!executable||!fs.existsSync(executable))throw Error('Usage: node tools/browser-smoke.js <absolute-browser-executable>');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'bookmark-smoke-'));
const server=net.createServer();
await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
const port=server.address().port;
await new Promise(resolve=>server.close(resolve));
const child=spawn(executable,[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--disable-sync','--remote-debugging-port='+port,'--remote-allow-origins=*',
  '--enable-unsafe-extension-debugging','--user-data-dir='+profile,'about:blank'
],{stdio:['ignore','ignore','pipe'],windowsHide:true});
let stderr='';
child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-10000);});
let ws,sequence=0;const pending=new Map();
function command(method,params={},sessionId){
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},30000);
    pending.set(id,{resolve,reject,timer});
    ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
}
try{
  let target;
  for(let retry=0;retry<120;retry++){
    if(child.exitCode!==null)throw Error('Browser exited: '+stderr);
    try{
      const response=await fetch('http://127.0.0.1:'+port+'/json/version',{signal:AbortSignal.timeout(1000)});
      if(response.ok){target=await response.json();break;}
    }catch{}
    await delay(250);
  }
  if(!target?.webSocketDebuggerUrl)throw Error('Browser debugging endpoint unavailable: '+stderr);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  ws.addEventListener('message',event=>{
    let value;try{value=JSON.parse(event.data);}catch{return;}
    if(!value.id)return;const task=pending.get(value.id);if(!task)return;
    pending.delete(value.id);clearTimeout(task.timer);
    value.error?task.reject(Error(value.error.message)):task.resolve(value.result);
  });
  await new Promise((resolve,reject)=>{
    if(ws.readyState===WebSocket.OPEN)return resolve();
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  const version=await command('Browser.getVersion');
  const {id}=await command('Extensions.loadUnpacked',{path:path.resolve('extension')});
  const {targetId}=await command('Target.createTarget',{url:`chrome-extension://${id}/dashboard.html`});
  const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
  await command('Runtime.enable',{},sessionId);
  const evaluate=async expression=>{
    const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result.value;
  };
  for(let retry=0;retry<100;retry++){
    const ready=await evaluate("document.readyState==='complete' && document.getElementById('browser')?.textContent.includes('profile')");
    if(ready)break;await delay(150);
  }
  assert.equal(await evaluate('document.readyState'),'complete');
  const result=await evaluate(`(async()=>{
    const call=async(type,body={})=>{const r=await chrome.runtime.sendMessage({type,...body});if(r.error)throw Error(r.error);return r.data;};
    const walk=n=>[n,...(n.children||[]).flatMap(walk)];
    const tree=await chrome.bookmarks.getTree();
    if(walk(tree[0]).some(n=>n.url))throw Error('Disposable profile must start without bookmarks');
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
    return {links:walk((await chrome.bookmarks.getTree())[0]).filter(n=>n.url).length,operations:plan.operations.length};
  })()`);
  assert.equal(result.links,1);
  await command('Page.enable',{},sessionId);
  await command('Page.reload',{ignoreCache:true},sessionId);
  let cards=0;
  for(let retry=0;retry<100;retry++){
    try{cards=await evaluate("document.querySelectorAll('#rows .card').length");}catch{}
    if(cards===1)break;await delay(100);
  }
  assert.equal(cards,1,'Dashboard failed to render bookmark card after restart');
  fs.mkdirSync('dist',{recursive:true});
  try{
    const metrics=await command('Page.getLayoutMetrics',{},sessionId);
    const bounds=metrics.cssContentSize;
    const shot=await command('Page.captureScreenshot',{
      format:'png',captureBeyondViewport:true,
      clip:{x:0,y:0,width:bounds.width,height:bounds.height,scale:1}
    },sessionId);
    const name=path.basename(executable).replace(/[^a-z0-9]/gi,'-');
    fs.writeFileSync(`dist/smoke-${name}.png`,Buffer.from(shot.data,'base64'));
  }catch(error){console.warn('Screenshot not available:',error.message);}
  console.log(JSON.stringify({browser:version.product,...result,cards,status:'passed',profile},null,2));
}finally{
  if(ws&&ws.readyState===WebSocket.OPEN)ws.close();
  for(const task of pending.values()){clearTimeout(task.timer);task.reject(Error('Browser closed'));}pending.clear();
  child.kill(); // Disposable browser only. Never touch a personal profile.
}
