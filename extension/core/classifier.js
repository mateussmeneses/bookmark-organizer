import {categories,normalize,canonical,categoryPath} from './taxonomy.js';
export const CLASSIFIER_VERSION = 2;
export function indexTree(tree) {
  const nodes=[],byId=new Map(),paths=new Map(),stack=[...tree].reverse().map(n=>[n,[]]);
  while(stack.length){const [node,path]=stack.pop();const {children,...data}=node;nodes.push(data);byId.set(node.id,data);paths.set(node.id,path);for(const child of [...(children||[])].reverse())stack.push([child,node.parentId===undefined?[]:[...path,node.title]]);}
  return {nodes,byId,paths,links:nodes.filter(n=>typeof n.url==='string')};
}
export function cacheKey(node,metadata={},rules=[],learned={}) {
  return JSON.stringify([CLASSIFIER_VERSION,node.url,node.title,metadata.title,metadata.description,metadata.excerpt,rules,learned[node.url]]);
}
// Sparse multilingual concept vectors are local embeddings; they do not require a model.
export function embed(text) {
  const normalized=' '+normalize(text)+' ';
  return categories.map(c=>c.terms.reduce((score,t)=>score+(normalized.includes(' '+normalize(t)+' ')?1:0),0));
}
export function cosine(a,b){let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]**2;bb+=b[i]**2;}return aa&&bb?dot/Math.sqrt(aa*bb):0;}
export function classifyOne(node,{metadata={},rules=[],learned={},folder=[]}={}) {
  let url;try{url=new URL(node.url);}catch{return {id:node.id,category:'Review Inbox',path:['Review Inbox'],tags:[],confidence:0,reason:'Invalid URL; manual review required.',engine:'rules'};}
  const correction=learned[node.url];
  if(correction && categories.some(c=>c.name===canonical(correction)))return decision(node,canonical(correction),1,'Exact-URL correction approved by you.','learned');
  const rule=rules.find(r=>r.domain===url.hostname&&categories.some(c=>c.name===canonical(r.category)));
  if(rule)return {...decision(node,canonical(rule.category),.99,'Your exact-domain rule.','user-rule'),authorized:rule.auto===true};
  const title=embed(node.title),host=embed(url.hostname.replace(/[.\-/]/g,' ')),content=embed([metadata.title,metadata.description,metadata.excerpt].filter(Boolean).join(' '));
  const scores=categories.map((c,i)=>({category:c.name,score:title[i]*3+host[i]*4+Math.min(content[i],3),index:i})).filter(x=>x.score).sort((a,b)=>b.score-a.score);
  if(!scores.length)return {...decision(node,'Review Inbox',.1,'No reliable topic evidence. Original folders are context, not authority.','rules'),context:folder};
  const top=scores[0],second=scores[1],specific=['Piracy','Emulation','Modding','Torrents & P2P','Reverse Engineering'];
  const specialized=scores.filter(s=>specific.includes(s.category));
  const chosen=specialized.length===1&&top.category==='Gaming'?specialized[0]:top;
  const ambiguous=second&&second.score===top.score&&chosen===top;
  const result=decision(node,chosen.category,ambiguous?.45:Math.min(.92,.55+chosen.score*.045),`Evidence from ${title[chosen.index]?'title, ':''}${host[chosen.index]?'domain, ':''}${content[chosen.index]?'page metadata, ':''}normalized to ${chosen.category}. ${ambiguous?'Competing topics require review.':''}`,'rules');
  result.tags=scores.filter(s=>s.category!==chosen.category).map(s=>s.category);
  result.vector=title.map((x,i)=>x+host[i]+content[i]);return result;
}
function decision(node,category,confidence,reason,engine){return {id:node.id,title:node.title,category,path:categoryPath(category),tags:[],confidence,reason,engine,status:'pending'};}
export function analyze(tree,options={}) {
  const index=indexTree(tree),cache=options.cache||{},proposals=[],clusters=new Map();let hits=0;
  for(const node of index.links){const metadata=options.metadata?.[node.url]||{},key=cacheKey(node,metadata,options.rules,options.learned);let p=cache[node.id];if(p?.key===key){hits++;p={...p.value,id:node.id};}else{p=classifyOne(node,{...options,metadata,folder:index.paths.get(node.id)});cache[node.id]={key,value:p};}proposals.push(p);const group=clusters.get(p.category)||[];group.push(p.id);clusters.set(p.category,group);}
  const live=new Set(index.links.map(n=>n.id));for(const id of Object.keys(cache))if(!live.has(id))delete cache[id];
  return {proposals,cache,hits,clusters:Object.fromEntries(clusters),stats:quality(tree,proposals)};
}
export function duplicateGroups(links,metadata={}) {
  const exact=new Map(),variants=new Map(),redirects=new Map(),near=new Map();
  const add=(map,key,id)=>{if(!key)return;let group=map.get(key);if(!group){group=[];map.set(key,group);}group.push(id);};
  for(const n of links){add(exact,n.url,n.id);try{const u=new URL(n.url);for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);add(variants,u.href,n.id);}catch{}add(redirects,metadata[n.url]?.finalUrl,n.id);const text=metadata[n.url]?.excerpt;if(text&&text.length>200)add(near,normalize(text).slice(0,1500),n.id);}
  return {exact:[...exact.values()].filter(g=>g.length>1),tracking:[...variants.values()].filter(g=>g.length>1),redirects:[...redirects.values()].filter(g=>g.length>1),near:[...near.values()].filter(g=>g.length>1)};
}
export function quality(tree,proposals=[]) {
  const {nodes,links,paths}=indexTree(tree),duplicates=duplicateGroups(links),folders=nodes.filter(n=>!n.url&&n.parentId),aliases=new Map();
  for(const n of folders){const key=n.parentId+'|'+canonical(n.title);aliases.set(key,[...(aliases.get(key)||[]),n.id]);}
  const overlaps=[...aliases.values()].filter(g=>g.length>1),deep=links.filter(n=>(paths.get(n.id)||[]).length>3).length,empty=links.filter(n=>!n.title.trim()).length,uncertain=proposals.filter(p=>p.confidence<.8).length;
  const penalty=links.length?(empty+deep+duplicates.exact.reduce((sum,g)=>sum+g.length-1,0))/links.length:0;
  return {links:links.length,folders:folders.length,emptyTitles:empty,deep,uncertain,overlaps,duplicates,score:Math.max(0,Math.round(100*(1-penalty))),explanation:'Score penalizes empty titles, exact duplicate excess and paths deeper than three folders. It does not certify semantic correctness.'};
}
