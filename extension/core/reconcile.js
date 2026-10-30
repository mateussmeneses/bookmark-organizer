import {indexTree} from './classifier.js';
import {canonical,consolidate} from './taxonomy.js';
import {digest,comparable,snapshot,verifySnapshot} from './backup.js';

export async function buildPlan(tree,proposals,profile,options={}) {
  const {byId,nodes}=indexTree(tree),operations=[],folders=new Map();let sequence=0;
  for(const n of nodes)if(n.url===undefined&&n.parentId) {
    const key=n.parentId+'|'+canonical(n.title);
    // Ambiguous sibling folders are retained; the first is a stable destination.
    if(!folders.has(key))folders.set(key,n.id);
  }
  const seen=new Set(),sourceFolders=new Map();
  for(const p of proposals.filter(p=>p.status==='approved')){
    if(seen.has(p.id))throw Error('Duplicate proposal ID');seen.add(p.id);
    const n=byId.get(p.id);if(!n||!n.url||n.unmodifiable)throw Error('Bookmark missing or managed');
    if(p.action==='remove')throw Error('Automatic deletion is not supported; review duplicates manually');
    let root=n;while(root.parentId&&byId.get(root.parentId)?.parentId!==undefined)root=byId.get(root.parentId);
    if(root.unmodifiable)throw Error('Managed bookmark root');
    let parentId=root.id;
    for(const title of consolidate(p.path||[p.category])){
      if(title==='Review Inbox')throw Error('Uncertain classifications cannot be applied');
      const key=parentId+'|'+title;let id=folders.get(key);
      if(!id){id='@folder'+sequence++;operations.push({kind:'create',ref:id,parentId,title});folders.set(key,id);}
      else if(byId.get(id)&&byId.get(id).title!==title&&!operations.some(o=>o.kind==='update'&&o.id===id))operations.push({kind:'update',id,title});
      parentId=id;
    }
    if(n.parentId!==parentId){
      operations.push({kind:'move',id:n.id,parentId});
      // Collect only the original ancestor chain; never modify managed roots.
      let ancestor=byId.get(n.parentId);
      while(ancestor&&ancestor.parentId&&byId.get(ancestor.parentId)?.parentId!==undefined){
        if(ancestor.unmodifiable)break;
        sourceFolders.set(ancestor.id,ancestor);
        ancestor=byId.get(ancestor.parentId);
      }
    }
    if(typeof p.title==='string'&&p.title!==n.title)operations.push({kind:'update',id:n.id,title:p.title});
  }
  if(options.cleanupEmptySourceFolders===true){
    const depthOf=node=>{let depth=0,p=node;while(p?.parentId){depth++;p=byId.get(p.parentId);}return depth;};
    for(const folder of [...sourceFolders.values()].sort((a,b)=>depthOf(b)-depthOf(a))){
      operations.push({kind:'removeEmpty',id:folder.id,expectedTitle:folder.title,expectedParentId:folder.parentId});
    }
  }
  return {id:crypto.randomUUID(),profile,base:await digest(comparable(tree)),operations,approved:proposals.filter(p=>p.status==='approved').map(p=>p.id)};
}

export async function restorePlan(current,backup,profile,organizerFolders=[]){
  await verifySnapshot(backup);if(backup.profile!==profile)throw Error('Backup belongs to a different browser profile');
  const now=indexTree(current),target=indexTree(backup.tree),operations=[],refs=new Map();
  for(const n of target.nodes){
    if(n.parentId===undefined){if(!now.byId.has(n.id))throw Error('Root ID mismatch');continue;}
    const root=target.byId.get(n.parentId)?.parentId===undefined;
    if(root){if(!now.byId.has(n.id))throw Error('Browser root is unavailable');continue;}
    const parentId=refs.get(n.parentId)||n.parentId,existing=now.byId.get(n.id);
    if(n.unmodifiable)continue;
    if(!existing){const ref='@restore-'+n.id;refs.set(n.id,ref);operations.push({kind:'create',ref,parentId,title:n.title,...(n.url?{url:n.url}:{}),index:n.index});}
    else {
      if(existing.unmodifiable||!!existing.url!==!!n.url)throw Error('Node type or managed state conflicts with backup');
      if(existing.title!==n.title||existing.url!==n.url)operations.push({kind:'update',id:n.id,title:n.title,...(n.url?{url:n.url}:{})});
      operations.push({kind:'move',id:n.id,parentId,index:n.index});
    }
  }
  // Restore never removes unknown user additions. Only folders created by this exact
  // organizer operation can be considered for cleanup, and only when empty.
  for(const folder of organizerFolders) {
    if(folder && typeof folder.id==='string' && typeof folder.title==='string' && typeof folder.parentId==='string')
      operations.push({kind:'removeEmpty',id:folder.id,expectedTitle:folder.title,expectedParentId:folder.parentId});
  }
  return {id:crypto.randomUUID(),profile,base:await digest(comparable(current)),operations,approved:[],restores:backup.id};
}
const fields=n=>({id:n.id,parentId:n.parentId,index:n.index,title:n.title,url:n.url});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function desired(n,op){if(op.kind==='update')return n.title===op.title&&(op.url===undefined||n.url===op.url);if(op.kind==='move')return n.parentId===op.parentId&&(op.index===undefined||n.index===op.index);return false;}

/** Each API call has a durable intent. Recovery reconciles intent before retrying. */
export class Executor {
  constructor(api,storage,profile){this.api=api;this.storage=storage;this.profile=profile;this.cancelled=false;}
  async save(journal){await this.storage.set({journal});}
  async start(plan){
    const existing=(await this.storage.get('journal')).journal;if(existing&&['running','paused','conflict'].includes(existing.status))throw Error('Recover or resolve the existing operation first');
    const tree=await this.api.getTree();if(plan.profile!==this.profile||await digest(comparable(tree))!==plan.base)throw Error('Browser changed after preview; analyze again');
    const backup=await snapshot(tree,this.profile,'Before organization');
    await this.storage.set({['backup:'+backup.id]:backup});
    const journal={id:plan.id,plan,backup:backup.id,cursor:0,map:{},expected:plan.base,status:'running',pending:null,completed:[],started:new Date().toISOString()};
    await this.save(journal);return this.resume();
  }
  async resume(){
    const j=(await this.storage.get('journal')).journal;if(!j||!['running','paused','conflict'].includes(j.status))throw Error('No interrupted operation');
    j.status='running';this.cancelled=false;
    try{
      while(j.cursor<j.plan.operations.length){
        if(this.cancelled){j.status='paused';await this.save(j);return j;}
        const raw=j.plan.operations[j.cursor],op={...raw,id:j.map[raw.id]||raw.id,parentId:j.map[raw.parentId]||raw.parentId};
        if(!j.pending){
          if(j.expected&&await digest(comparable(await this.api.getTree()))!==j.expected)throw Error('Browser changed during the batch; operation paused');
          const before=op.kind==='create'?await this.api.getChildren(op.parentId):await this.api.get(op.id).then(a=>a[0]).catch(()=>null);
          if(!before&&op.kind!=='removeEmpty')throw Error('Target removed externally');
          j.pending={op,before:op.kind==='create'?before.map(n=>n.id):before?fields(before):null};await this.save(j);
        }
        const intent=j.pending;let result,createdFolder;
        if(op.kind==='create'){
          const children=await this.api.getChildren(op.parentId),found=children.filter(n=>!intent.before.includes(n.id)&&n.title===op.title&&n.url===op.url);
          if(found.length>1)throw Error('Ambiguous interrupted create; manual conflict resolution required');
          if(found.length===1)result=found[0];
          else {const args={parentId:op.parentId,title:op.title};if(op.url!==undefined)args.url=op.url;if(op.index!==undefined)args.index=op.index;result=await this.api.create(args);if(op.url===undefined)createdFolder={id:result.id,title:op.title,parentId:op.parentId};}
          j.map[op.ref]=result.id;
        }else{
          const current=await this.api.get(op.id).then(a=>a[0]).catch(()=>null);
          if(op.kind==='removeEmpty'){
            if(current&&current.url===undefined&&current.title===op.expectedTitle&&current.parentId===op.expectedParentId&&same(fields(current),intent.before)&&(await this.api.getChildren(op.id)).length===0)await this.api.remove(op.id);
          }else{
            if(!current)throw Error('Target removed externally');
            if(!desired(current,op)){
              if(!same(fields(current),intent.before))throw Error('Target changed externally; operation paused');
              if(op.kind==='move'){const dest={parentId:op.parentId};if(op.index!==undefined)dest.index=op.index;await this.api.move(op.id,dest);}
              else {const update={title:op.title};if(op.url!==undefined)update.url=op.url;await this.api.update(op.id,update);}
            }
            const after=(await this.api.get(op.id))[0];if(!desired(after,op))throw Error('Browser did not apply the requested change');
          }
        }
        j.completed.push({operation:j.cursor,at:new Date().toISOString(),...(createdFolder?{createdFolder}:{})});j.cursor++;j.pending=null;j.expected=await digest(comparable(await this.api.getTree()));await this.save(j);
      }
      const tree=await this.api.getTree(),before=(await this.storage.get('backup:'+j.backup))['backup:'+j.backup];
      const live=indexTree(tree).byId;
      if(before.tree&&indexTree(before.tree).links.some(n=>!live.has(n.id)))throw Error('A bookmark disappeared during the batch; backup retained');
      j.status='complete';j.finished=new Date().toISOString();j.result=await digest(comparable(tree));await this.save(j);
      await this.storage.set({['operation:'+j.id]:j});return j;
    }catch(error){j.status='conflict';j.error=error.message;await this.save(j);throw error;}
  }
  async rollback(){const j=(await this.storage.get('journal')).journal;if(!j)throw Error('No operation to roll back');const backup=(await this.storage.get('backup:'+j.backup))['backup:'+j.backup];// Only clean folders whose creation was recorded as ours. An interrupted
    // create adopted on resume may belong to another actor.
    const organizerFolders=(j.completed||[]).map(c=>c.createdFolder).filter(Boolean).reverse();
    const plan=await restorePlan(await this.api.getTree(),backup,this.profile,organizerFolders);j.status='rolled-back-requested';await this.save(j);return this.start(plan);}
}
