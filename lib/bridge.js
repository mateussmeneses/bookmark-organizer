import {inspect,classify} from './network.js';
import {validateProposal} from './store.js';

export async function bridge(body){
 const {nodes,action}=body;
 if(body.consent!==true||!Array.isArray(nodes)||!nodes.length||nodes.length>20||nodes.some(n=>!n||typeof n.id!=='string'||typeof n.title!=='string'||n.title.length>1000||typeof n.url!=='string'||n.url.length>10000)||new Set(nodes.map(n=>n.id)).size!==nodes.length)throw Error('Consent and 1–20 distinct bookmarks required');
 if(action==='health'){
  const results=new Array(nodes.length);let next=0;
  await Promise.all(Array.from({length:Math.min(4,nodes.length)},async()=>{
   while(next<nodes.length){const i=next++,n=nodes[i];try{results[i]={url:n.url,...await inspect(n.url)};}catch(e){results[i]={url:n.url,error:e.message};}}
  }));return results;
 }
 if(action==='ai'){
  const checks=Object.fromEntries(nodes.map(n=>[n.id,{excerpt:typeof body.metadata?.[n.url]?.excerpt==='string'?body.metadata[n.url].excerpt.slice(0,4000):''}]));
  const proposals=await classify(nodes,[],checks,{...body.config,consent:true});proposals.forEach(validateProposal);return proposals;
 }
 throw Error('Unknown companion action');
}
