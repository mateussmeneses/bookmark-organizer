export function fixture(count=8){return [{id:'0',title:'',children:[{id:'1',parentId:'0',index:0,title:'Bookmarks bar',children:[{id:'2',parentId:'1',index:0,title:'Mixed',children:Array.from({length:count},(_,i)=>({id:String(i+10),parentId:'2',index:i,title:['Video Games','Pirataria warez','Emulation emulator','Reverse engineering ghidra','Torrent client','Machine learning','Books library','Unclear'][i%8],url:`https://example.org/item/${i}`}))}]}]}];}
export class MemoryStorage {
 constructor(){this.data={};this.fail=null;}
 async get(key){if(key===null)return structuredClone(this.data);const keys=Array.isArray(key)?key:[key];return structuredClone(Object.fromEntries(keys.filter(k=>k in this.data).map(k=>[k,this.data[k]])));}
 async set(value){if(this.fail?.(value))throw Error('Simulated storage interruption');Object.assign(this.data,structuredClone(value));}
 async remove(key){delete this.data[key];}
}
export class MockBookmarks {
 constructor(tree=fixture()){this.tree=structuredClone(tree);this.next=100000;this.calls=[];}
 all(){const list=[];const walk=n=>{list.push(n);for(const c of n.children||[])walk(c);};this.tree.forEach(walk);return list;}
 node(id){const n=this.all().find(n=>n.id===id);if(!n)throw Error('Not found: '+id);return n;}
 indices(id){this.node(id).children.forEach((n,i)=>n.index=i);}
 async getTree(){return structuredClone(this.tree);}
 async get(id){return [structuredClone(this.node(id))];}
 async getChildren(id){return structuredClone(this.node(id).children||[]);}
 async create(args){const n={id:String(this.next++),...args};if(!n.url)n.children=[];const parent=this.node(args.parentId);parent.children.splice(args.index??parent.children.length,0,n);this.indices(parent.id);this.calls.push(['create',n.id]);return structuredClone(n);}
 async update(id,changes){const n=this.node(id);Object.assign(n,changes);this.calls.push(['update',id]);return structuredClone(n);}
 async move(id,destination){const n=this.node(id),old=this.node(n.parentId),parent=this.node(destination.parentId);old.children.splice(old.children.findIndex(c=>c.id===id),1);this.indices(old.id);n.parentId=parent.id;parent.children.splice(destination.index??parent.children.length,0,n);this.indices(parent.id);this.calls.push(['move',id]);return structuredClone(n);}
 async remove(id){const n=this.node(id);if(n.children?.length)throw Error('Folder not empty');const p=this.node(n.parentId);p.children=p.children.filter(c=>c.id!==id);this.indices(p.id);this.calls.push(['remove',id]);}
}
