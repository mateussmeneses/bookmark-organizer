import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MockBookmarks,MemoryStorage} from './fixtures/browser.js';

test('Full-library AI covers high-confidence rules, caches results and preserves approval',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage();let listener;
 const event={addListener(){}},oldFetch=globalThis.fetch;
 for(const name of ['onCreated','onChanged','onMoved','onRemoved','onChildrenReordered','onImportEnded'])api[name]=event;
 globalThis.chrome={bookmarks:api,storage:{local:storage},
   runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener:fn=>listener=fn},onInstalled:event,onStartup:event},
   alarms:{create(){},onAlarm:event},action:{onClicked:event},tabs:{create(){}}};
 const calls=[];
 globalThis.fetch=async(url,init)=>{
   assert.equal(url,'http://127.0.0.1:3210/api/bridge');
   const body=JSON.parse(init.body);calls.push(body);
   assert.equal(body.action,'ai');
   return {ok:true,json:async()=>body.nodes.map(n=>({id:n.id,title:n.title,path:['Piracy'],
     confidence:0.87,reason:'Semantic model classification'}))};
 };
 try{
   await import('../extension/background.js?semantic-integration');
   const send=async msg=>{
     const response=await new Promise(resolve=>listener(msg,{id:'test',url:'chrome-extension://test/dashboard.html'},resolve));
     if(response.error)throw Error(response.error);
     return response.data;
   };
   await send({type:'analyze'});
   const initial=await send({type:'state'});
   assert.equal(initial.proposals.length,8);
   assert.ok(initial.proposals.some(p=>p.confidence>=0.8));
   await send({type:'settings',settings:{bridgeToken:'pair-token',provider:'ollama',model:'semantic-mock'}});
   const first=await send({type:'aiAll',consent:true});
   assert.equal(first.processed,8);
   assert.equal(first.classified,8);
   assert.equal(calls.length,1);
   const after=await send({type:'state'});
   assert.ok(after.proposals.every(p=>p.engine==='ai'&&p.category==='Piracy'));
   assert.equal((await send({type:'aiAll',consent:true})).processed,0);
   assert.equal(calls.length,1,'Cached classification must not call model again');
   await send({type:'review',ids:['10'],status:'approved'});
   await send({type:'settings',settings:{model:'semantic-model-2'}});
   const changed=await send({type:'aiAll',consent:true});
   assert.equal(changed.processed,7,'Model changes do not override approved decisions');
   assert.equal(calls.length,2);
   assert.equal(api.calls.length,0,'AI analysis must never mutate browser bookmarks');
 }finally{globalThis.fetch=oldFetch;delete globalThis.chrome;}
});
