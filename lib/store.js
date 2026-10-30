import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {readInput} from '../audit.js';
import {propose,hash} from './bookmarks.js';
export function validateProposal(p){if(!p||typeof p.title!=='string'||p.title.length>1000||!Array.isArray(p.path)||p.path.length>20||p.path.some(s=>typeof s!=='string'||!s.trim()||s.length>200)||!['keep','remove'].includes(p.action)||!['pending','approved','rejected'].includes(p.status)||typeof p.reason!=='string'||p.reason.length>5000||!Number.isFinite(p.confidence)||p.confidence<0||p.confidence>1)throw Error('Proposta inválida');return p;}
export class Store {
 constructor(dir='data',input=readInput){this.dir=dir;fs.mkdirSync(dir,{recursive:true});this.file=dir+'/state.json';if(fs.existsSync(this.file)){this.state=JSON.parse(fs.readFileSync(this.file));const current=input();if(hash(JSON.stringify(current.sources))!==hash(JSON.stringify(this.state.sources)))throw Error('input/ mudou: preserve data/ e inicie outro diretório de dados para uma nova importação.');}else{const {sources,nodes}=input();this.state={sources,original:nodes,proposals:propose(nodes),checks:{},history:[],revision:0};this.write(this.state);}}
 write(state){const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(tmp,this.file);}
 commit(label,mutate,revision){if(revision!==this.state.revision)throw Error('Estado mudou; atualize a página antes de tentar novamente');const next=structuredClone(this.state);mutate(next);const backup=randomUUID()+'.json';fs.mkdirSync(this.dir+'/backups',{recursive:true});fs.writeFileSync(this.dir+'/backups/'+backup,JSON.stringify(this.state),{mode:0o600,flag:'wx'});next.revision++;next.history.push({at:new Date().toISOString(),label,backup});this.write(next);this.state=next;}
 undo(revision){const h=this.state.history.at(-1);if(!h)throw Error('Sem alterações para desfazer');const previous=JSON.parse(fs.readFileSync(this.dir+'/backups/'+h.backup));this.commit('Reversão: '+h.label,next=>{next.proposals=previous.proposals;next.checks=previous.checks;},revision);}
}
