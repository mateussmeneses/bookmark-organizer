import {analyze,indexTree,classifyOne,cacheKey,quality} from './core/classifier.js';
import {categories,canonical,categoryPath} from './core/taxonomy.js';
import {snapshot,verifySnapshot,encryptBackup,decryptBackup} from './core/backup.js';
import {Executor,buildPlan,restorePlan} from './core/reconcile.js';

const storage=chrome.storage.local;
let queue=Promise.resolve(),executor,cancel=false;
const serial=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
async function read(){const s=await storage.get(['profile','settings','learned','cache','proposals','metadata','collections','job']);if(!s.profile){s.profile=crypto.randomUUID();await storage.set({profile:s.profile});}return {settings:{auto:false,rules:[],provider:'ollama',endpoint:'http://127.0.0.1:11434',model:'',...s.settings},learned:{},cache:{},metadata:{},proposals:[],collections:[],...s};}
async function sync(full=false){
  await storage.remove('plan');
  const s=await read(),tree=await chrome.bookmarks.getTree(),index=indexTree(tree),proposals=[],cache=full?{}:s.cache;
  cancel=false;let done=0,hits=0;
  await storage.set({job:{status:'running',done,total:index.links.length}});
  const previous=new Map(s.proposals.map(p=>[p.id,p]));
  for(let i=0;i<index.links.length;i+=100){
    if(cancel){await storage.set({cache,proposals,job:{status:'paused',done,total:index.links.length}});return;}
    for(const node of index.links.slice(i,i+100)){
      const metadata=s.metadata[node.url]||{},key=cacheKey(node,metadata,s.settings.rules,s.learned);let p;
      if(cache[node.id]?.key===key){p={...cache[node.id].value,id:node.id};hits++;}else{p=classifyOne(node,{metadata,rules:s.settings.rules,learned:s.learned,folder:index.paths.get(node.id)});cache[node.id]={key,value:p};}
      const old=previous.get(node.id);if(old&&old.key===key)p={...p,...old};
      proposals.push({...p,key});done++;
    }
    await storage.set({cache,proposals,job:{status:'running',done,total:index.links.length,hits}});
    await new Promise(r=>setTimeout(r,0));
  }
  const live=new Set(index.links.map(n=>n.id));for(const id of Object.keys(cache))if(!live.has(id))delete cache[id];
  await storage.set({tree,cache,proposals,lastSync:new Date().toISOString(),stats:quality(tree,proposals),job:{status:'complete',done,total:done,hits}});
  const journal=(await storage.get('journal')).journal;
  if(s.settings.auto&&!journal?.status?.match(/running|paused|conflict/)){
    const eligible=proposals.filter(p=>p.engine==='user-rule'&&p.authorized&&p.confidence>=.95&&p.status!=='rejected').map(p=>({...p,status:'approved'}));
    if(eligible.length){const plan=await buildPlan(tree,eligible,s.profile);if(plan.operations.length){executor=new Executor(chrome.bookmarks,storage,s.profile);await executor.start(plan);}}
  }
}
async function relay(action,payload){
  const {settings}=await read();if(!settings.bridgeToken)throw Error('Pair the optional local companion first');
  const response=await fetch('http://127.0.0.1:3210/api/bridge',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':settings.bridgeToken},body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(180000)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Companion request failed');return data;
}
async function handle(message){
  const s=await read();executor ||= new Executor(chrome.bookmarks,storage,s.profile);
  switch(message.type){
    case 'state': {const stored=await storage.get(null);return {...s,...stored,categories};}
    case 'analyze': await sync(message.full===true);return {ok:true};
    case 'settings': {
      const settings={...s.settings,...message.settings};
      if(!Array.isArray(settings.rules)||settings.rules.some(r=>typeof r.domain!=='string'||r.domain.includes('/')||!categories.some(c=>c.name===canonical(r.category))))throw Error('Rules require an exact hostname and a known category');
      if(settings.auto&&message.authorize!==true&&!s.settings.auto)throw Error('Explicit automation authorization required');
      await storage.remove('plan');await storage.set({settings});return {ok:true};
    }
    case 'review': {
      if(!['approved','rejected','pending'].includes(message.status))throw Error('Invalid review status');
      const ids=new Set(message.ids),category=message.category?canonical(message.category):null;
      if(category&&!categories.some(c=>c.name===category))throw Error('Choose a canonical category');
      const live=indexTree(await chrome.bookmarks.getTree()).byId;
      for(const p of s.proposals)if(ids.has(p.id)){const node=live.get(p.id);if(!node||p.key!==cacheKey(node,s.metadata[node.url],s.settings.rules,s.learned))throw Error('Bookmark or classification changed; analyze again');}
      for(const p of s.proposals)if(ids.has(p.id)){
        if(category){p.category=category;p.path=categoryPath(category);p.reason='Category corrected by you.';p.engine='user';p.confidence=1;}
        if(message.title!==undefined){if(ids.size!==1||typeof message.title!=='string'||message.title.length>1000)throw Error('Rename one bookmark at a time');p.title=message.title;}
        p.status=message.status;
        if(p.status==='approved'&&p.category!=='Review Inbox'&&live.get(p.id))s.learned[live.get(p.id).url]=p.category;
      }
      for(const p of s.proposals)if(ids.has(p.id)){const n=live.get(p.id);p.key=cacheKey(n,s.metadata[n.url],s.settings.rules,s.learned);}
      await storage.remove('plan');await storage.set({proposals:s.proposals,learned:s.learned});return {ok:true};
    }
    case 'preview': {const tree=await chrome.bookmarks.getTree(),live=indexTree(tree).byId;for(const p of s.proposals.filter(p=>p.status==='approved')){const n=live.get(p.id);if(!n||p.key!==cacheKey(n,s.metadata[n.url],s.settings.rules,s.learned))throw Error('Bookmark or classification changed; analyze and approve again');}const plan=await buildPlan(tree,s.proposals,s.profile);await storage.set({plan});return plan;}
    case 'apply': {const {plan}=await storage.get('plan');if(!plan||plan.id!==message.planId)throw Error('Preview the current plan first');const result=await executor.start(plan);await sync();return result;}
    case 'resume': {const result=await executor.resume();await sync();return result;}
    case 'rollback': {const result=await executor.rollback();await sync();return result;}
    case 'backup': {
      let value=await snapshot(await chrome.bookmarks.getTree(),s.profile,'Manual backup');const id=value.id;
      if(message.password)value=await encryptBackup(value,message.password);
      await storage.set({['backup:'+id]:value});return {id,value};
    }
    case 'restore': {
      let backup=message.value||(await storage.get('backup:'+message.id))['backup:'+message.id];
      if(backup.encrypted)backup=await decryptBackup(backup,message.password||'');else await verifySnapshot(backup);
      const plan=await restorePlan(await chrome.bookmarks.getTree(),backup,s.profile);const result=await executor.start(plan);await sync();return result;
    }
    case 'resetLearning': await storage.remove('plan');await storage.set({learned:{},cache:{}});return {ok:true};
    case 'collection': {
      if(typeof message.name!=='string'||!message.name.trim()||typeof message.query!=='string')throw Error('Collection needs a name and query');
      s.collections=s.collections.filter(c=>c.name!==message.name);s.collections.push({name:message.name,query:message.query});await storage.set({collections:s.collections});return {ok:true};
    }
    case 'health': {
      if(message.consent!==true)throw Error('Site inspection consent required');
      const ids=new Set(message.ids),nodes=indexTree(await chrome.bookmarks.getTree()).links.filter(n=>ids.has(n.id));if(nodes.length>20)throw Error('Select at most 20 links');
      const results=await relay('health',{nodes,consent:true});for(const item of results)s.metadata[item.url]=item;
      await storage.set({metadata:s.metadata});await sync();return {ok:true};
    }
    case 'ai': {
      if(message.consent!==true)throw Error('Model consent required');
      const ids=new Set(message.ids),nodes=indexTree(await chrome.bookmarks.getTree()).links.filter(n=>ids.has(n.id));if(nodes.length>20||!nodes.length)throw Error('Select 1–20 bookmarks');
      const results=await relay('ai',{nodes,consent:true,metadata:Object.fromEntries(nodes.map(n=>[n.url,s.metadata[n.url]])),config:{provider:s.settings.provider,endpoint:s.settings.endpoint,model:s.settings.model,key:message.key,consent:true}});
      for(const p of results){const category=canonical(p.path.at(-1));if(!categories.some(c=>c.name===category))continue;const i=s.proposals.findIndex(x=>x.id===p.id);if(i<0)continue;s.proposals[i]={...s.proposals[i],...p,category,path:categoryPath(category),status:'pending'};const n=nodes.find(n=>n.id===p.id);s.cache[p.id]={key:cacheKey(n,s.metadata[n.url],s.settings.rules,s.learned),value:s.proposals[i]};}
      await storage.remove('plan');await storage.set({proposals:s.proposals,cache:s.cache});return {ok:true};
    }
    default: throw Error('Unknown command');
  }
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL('')))return false;
  if(message.type==='cancel'){cancel=true;if(executor)executor.cancelled=true;reply({ok:true});return false;}
  serial(()=>handle(message)).then(data=>reply({data}),error=>reply({error:error.message}));return true;
});
const schedule=()=>chrome.alarms.create('synchronize',{delayInMinutes:.5});
for(const event of [chrome.bookmarks.onCreated,chrome.bookmarks.onChanged,chrome.bookmarks.onMoved,chrome.bookmarks.onRemoved,chrome.bookmarks.onChildrenReordered,chrome.bookmarks.onImportEnded])event.addListener(schedule);
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='synchronize')serial(()=>sync()).catch(e=>storage.set({lastError:e.message}));});
chrome.runtime.onInstalled.addListener(()=>{serial(()=>sync()).catch(e=>storage.set({lastError:e.message}));chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')});});
chrome.runtime.onStartup.addListener(schedule);
chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')}));
