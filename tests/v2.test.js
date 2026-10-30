import {test} from 'node:test';
import assert from 'node:assert/strict';
import {categories,canonical,categoryPath} from '../extension/core/taxonomy.js';
import {analyze,classifyOne,duplicateGroups,indexTree,embed,cosine} from '../extension/core/classifier.js';
import {snapshot,verifySnapshot,encryptBackup,decryptBackup,comparable} from '../extension/core/backup.js';
import {Executor,buildPlan,restorePlan} from '../extension/core/reconcile.js';
import {fixture,MockBookmarks,MemoryStorage} from './fixtures/browser.js';
test('Canonical bilingual aliases converge without collapsing specialized topics',()=>{
 for(const name of ['Gaming','Jogos','Video Games'])assert.equal(canonical(name),'Gaming');
 for(const name of ['IA','AI','Inteligência Artificial'])assert.equal(canonical(name),'Artificial Intelligence');
 for(const name of ['Pirataria','Warez','Pirates'])assert.equal(canonical(name),'Piracy');
 assert.equal(new Set(['Gaming','Emulation','Modding','Piracy','Torrents & P2P','Reverse Engineering'].map(canonical)).size,6);
 assert.deepEqual(categoryPath('Jogos'),['Entertainment','Gaming']);
});
test('Purpose evidence beats folder context, detects Piracy, and abstains',()=>{
 const classify=(title,folder=[])=>classifyOne({id:'x',url:'https://example.org',title},{folder});
 assert.equal(classify('Pirataria warez',['Coding']).category,'Piracy');
 assert.equal(classify('Emulator ROMs',['Gaming']).category,'Emulation');
 assert.equal(classify('Game mods homebrew').category,'Modding');
 assert.equal(classify('qBittorrent torrent').category,'Torrents & P2P');
 assert.equal(classify('unknown',['Programming']).category,'Review Inbox');
 assert.equal(classify('games repacks').category,'Piracy');
 assert.ok(cosine(embed('gaming jogos'),embed('video games'))>0);
});
test('Local learning, exact-domain automation and configuration-aware caching',()=>{
 const tree=fixture(),first=analyze(tree),second=analyze(tree,{cache:first.cache});assert.equal(second.hits,8);
 tree[0].children[0].children[0].children[0].title='new';assert.equal(analyze(tree,{cache:first.cache}).hits,7);
 const n={id:'a',url:'https://example.org/a',title:'Unknown'};
 assert.equal(classifyOne(n,{learned:{[n.url]:'Jogos'}}).category,'Gaming');
 assert.equal(classifyOne(n,{rules:[{domain:'example.org',category:'Gaming',auto:true}]}).authorized,true);
 assert.equal(classifyOne({...n,url:'https://evil-example.org/a'},{rules:[{domain:'example.org',category:'Gaming',auto:true}]}).authorized,undefined);
});
test('Duplicate variants retain resource IDs, fragments and nontracking query values',()=>{
 const links=[{id:'1',url:'https://example.org/a?id=1&utm_source=x'},{id:'2',url:'https://example.org/a?id=1'},{id:'3',url:'https://example.org/a?id=2'},{id:'4',url:'https://example.org/a?id=1#part'}];
 assert.deepEqual(duplicateGroups(links).tracking,[['1','2']]);assert.deepEqual(duplicateGroups(links).exact,[]);
});
test('Snapshots validate, reject tampering and support authenticated encryption',async()=>{
 const s=await snapshot(fixture(),'profile');await verifySnapshot(s);const bad=structuredClone(s);bad.tree[0].title='Changed';await assert.rejects(verifySnapshot(bad));
 const encrypted=await encryptBackup(s,'a sufficiently long password');assert.deepEqual(await decryptBackup(encrypted,'a sufficiently long password'),s);await assert.rejects(decryptBackup(encrypted,'wrong password'));assert.equal(JSON.stringify(encrypted).includes('example.org'),false);
});
test('Approved reconciliation is idempotent, preserves IDs and restores hierarchy/order',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),original=await api.getTree(),p=analyze(original).proposals.filter(p=>p.category!=='Review Inbox').map(p=>({...p,status:'approved'})),plan=await buildPlan(original,p,'profile'),runner=new Executor(api,storage,'profile');
 const j=await runner.start(plan);assert.equal(j.status,'complete');assert.equal(indexTree(await api.getTree()).links.length,8);
 const again=await buildPlan(await api.getTree(),p,'profile');assert.equal(again.operations.length,0);
 const backup=storage.data['backup:'+j.backup];await runner.start(await restorePlan(await api.getTree(),backup,'profile'));
 const restored=await api.getTree();const keep=new Set(indexTree(original).nodes.map(n=>n.id));const prune=nodes=>nodes.filter(n=>keep.has(n.id)).map(n=>({...n,...(n.children?{children:prune(n.children)}:{})}));assert.deepEqual(comparable(prune(restored)),comparable(original));
});
test('Stale previews and foreign profile restores fail before browser mutation',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),p=analyze(await api.getTree()).proposals.slice(0,1).map(p=>({...p,status:'approved'})),plan=await buildPlan(await api.getTree(),p,'profile');await api.update('10',{title:'External edit'});const count=api.calls.length;
 await assert.rejects(new Executor(api,storage,'profile').start(plan));assert.equal(api.calls.length,count);
 await assert.rejects(restorePlan(await api.getTree(),await snapshot(fixture(),'other'),'profile'));
});
test('Crash after API create is reconciled without creating a duplicate',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),plan=await buildPlan(await api.getTree(),[{...analyze(await api.getTree()).proposals[0],status:'approved'}],'profile');let failed=false;
 storage.fail=value=>{if(value.journal?.cursor===1&&!failed){failed=true;return true;}return false;};
 await assert.rejects(new Executor(api,storage,'profile').start(plan));storage.fail=null;
 const j=storage.data.journal;j.cursor=0;j.pending={op:plan.operations[0],before:['2']};j.map={};j.status='running';await storage.set({journal:j});
 await new Executor(api,storage,'profile').resume();assert.equal(api.calls.filter(([kind])=>kind==='create').length,2);
});
test('Write-ahead backup failure leaves the browser untouched',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),plan=await buildPlan(await api.getTree(),[{...analyze(await api.getTree()).proposals[0],status:'approved'}],'profile');storage.fail=value=>Object.keys(value).some(k=>k.startsWith('backup:'));await assert.rejects(new Executor(api,storage,'profile').start(plan));assert.equal(api.calls.length,0);
});
test('Restore preserves external additions rather than silently deleting them',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),backup=await snapshot(await api.getTree(),'profile');const added=await api.create({parentId:'2',url:'https://external.example',title:'External'});const runner=new Executor(api,storage,'profile');await runner.start(await restorePlan(await api.getTree(),backup,'profile'));assert.equal((await api.get(added.id))[0].url,'https://external.example');
});

test('Restore preserves external empty folders and browser roots',async()=>{
 const api=new MockBookmarks(),backup=await snapshot(await api.getTree(),'profile');const added=await api.create({parentId:'1',title:'External empty folder'});
 await new Executor(api,new MemoryStorage(),'profile').start(await restorePlan(await api.getTree(),backup,'profile'));
 assert.equal((await api.get(added.id))[0].title,'External empty folder');
});

test('External edit between operations stops a batch before the next mutation',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),plan=await buildPlan(await api.getTree(),[{...analyze(await api.getTree()).proposals[0],status:'approved'}],'profile');
 const save=storage.set.bind(storage);let changed=false;
 storage.set=async value=>{await save(value);if(value.journal?.cursor===1&&!changed){changed=true;await api.update('10',{title:'External edit'});}};
 await assert.rejects(new Executor(api,storage,'profile').start(plan),/changed during/);
 assert.equal(api.calls.filter(([kind])=>kind==='move').length,0);
 assert.equal((await api.get('10'))[0].title,'External edit');
});

test('Rollback also cleans organizer-owned empty folders',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),original=await api.getTree();
 const proposals=analyze(original).proposals.filter(p=>p.category!=='Review Inbox').map(p=>({...p,status:'approved'}));
 const runner=new Executor(api,storage,'profile');
 const applied=await runner.start(await buildPlan(original,proposals,'profile'));
 assert.equal(applied.status,'complete');
 const result=await runner.rollback();
 assert.equal(result.status,'complete');
 assert.deepEqual(comparable(await api.getTree()),comparable(original));
});
test('Duplicate detection handles thousands of repeated URLs',()=>{
 const links=Array.from({length:10000},(_,i)=>({id:String(i),url:'https://example.org/duplicate?utm_source='+i}));
 const now=Date.now(),groups=duplicateGroups(links);
 assert.equal(groups.tracking[0].length,10000);
 assert.ok(Date.now()-now<10000,'Grouping must not be quadratic');
});

test('Backup integrity survives browser storage property reordering',async()=>{
 const backup=await snapshot(fixture(),'profile');
 const reverse=object=>{
   if(Array.isArray(object))return object.map(reverse);
   if(object&&typeof object==='object')
     return Object.fromEntries(Object.entries(object).reverse().map(([key,value])=>[key,reverse(value)]));
   return object;
 };
 const reordered=reverse(backup);
 assert.deepEqual(await verifySnapshot(reordered),reordered);
});

test('Opt-in cleanup removes only emptied source folders and restore keeps bookmarks',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),original=await api.getTree();
 const proposals=analyze(original).proposals.map(p=>p.category==='Review Inbox'?{...p,category:'Gaming',path:['Entertainment','Gaming'],status:'approved'}:{...p,status:'approved'});
 const plan=await buildPlan(original,proposals,'profile',{cleanupEmptySourceFolders:true});
 assert.ok(plan.operations.some(o=>o.kind==='removeEmpty'));
 const runner=new Executor(api,storage,'profile');
 const result=await runner.start(plan);
 assert.equal(result.status,'complete');
 assert.ok(!indexTree(await api.getTree()).nodes.some(n=>n.title==='Mixed'),'Empty source folder should be cleaned');
 const rollback=await runner.rollback();
 assert.equal(rollback.status,'complete');
 assert.equal(indexTree(await api.getTree()).links.length,indexTree(original).links.length);
 assert.ok(indexTree(await api.getTree()).nodes.some(n=>n.title==='Mixed'));
});
test('Opt-in cleanup preserves a source folder containing unapproved bookmarks',async()=>{
 const api=new MockBookmarks(),storage=new MemoryStorage(),original=await api.getTree();
 const proposals=analyze(original).proposals.slice(0,1).map(p=>({...p,status:'approved'}));
 const plan=await buildPlan(original,proposals,'profile',{cleanupEmptySourceFolders:true});
 await new Executor(api,storage,'profile').start(plan);
 assert.ok(indexTree(await api.getTree()).nodes.some(n=>n.title==='Mixed'));
});
