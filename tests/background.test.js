import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MockBookmarks,MemoryStorage} from './fixtures/browser.js';

test('Background rejects changed approvals and revoked previews without bookmark writes',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage();let listener;
 const event={addListener(){}};
 for(const name of ['onCreated','onChanged','onMoved','onRemoved','onChildrenReordered','onImportEnded'])api[name]=event;
 globalThis.chrome={bookmarks:api,storage:{local:storage},runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener:fn=>listener=fn},onInstalled:event,onStartup:event},alarms:{create(){},onAlarm:event},action:{onClicked:event},tabs:{create(){}}};
 try{
  await import('../extension/background.js');
  const send=message=>new Promise(resolve=>listener(message,{id:'test',url:'chrome-extension://test/dashboard.html'},resolve));
  assert.ok((await send({type:'analyze'})).data);
  assert.ok((await send({type:'review',ids:['10'],status:'approved'})).data);
  const preview=await send({type:'preview'});assert.ok(preview.data,preview.error);
  await send({type:'review',ids:['10'],status:'rejected'});
  assert.match((await send({type:'apply',planId:preview.data.id})).error,/Preview/);assert.equal(api.calls.length,0);
  await api.update('11',{title:'External edit'});
  assert.match((await send({type:'review',ids:['11'],status:'approved'})).error,/changed/);
 }finally{delete globalThis.chrome;}
});
