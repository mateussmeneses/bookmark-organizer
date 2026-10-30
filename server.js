import http from 'node:http';
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {Store,validateProposal} from './lib/store.js';
import {audit,materialize,exportHTML} from './lib/bookmarks.js';
import {inspect,classify} from './lib/network.js';
import {bridge} from './lib/bridge.js';
let store;
const token=randomBytes(24).toString('hex'),port=Number(process.env.PORT||3210),host='127.0.0.1:'+port;
const extensionOrigin=/^[a-p]{32}$/.test(process.env.BOOKMARK_EXTENSION_ID||'')?'chrome-extension://'+process.env.BOOKMARK_EXTENSION_ID:null;
const files={'/':['public/index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css']};
http.createServer(async(req,res)=>{
 const send=(status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(type==='application/json'?JSON.stringify(data):data);};
 try{
 if(req.headers.host!==host)return send(403,{error:'Host não autorizado; use http://'+host});
 if(req.url==='/api/bridge'){
  if(!extensionOrigin||req.headers.origin!==extensionOrigin)return send(403,{error:'Extension is not paired; configure BOOKMARK_EXTENSION_ID'});
  res.setHeader('Access-Control-Allow-Origin',extensionOrigin);res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-CSRF-Token');return send(204,'','text/plain');}
  if(req.method!=='POST'||req.headers['x-csrf-token']!==token)return send(403,{error:'Invalid companion token'});
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2000000)return send(413,{error:'Request too large'});}return send(200,await bridge(JSON.parse(raw)));
 }
 if(req.method==='GET'&&req.url==='/pair')return send(200,'<!doctype html><html lang="en"><meta charset="utf-8"><title>Pair bookmark extension</title><h1>Local companion pairing</h1><p>Copy this token into your extension. It expires when the server restarts. Keep it private.</p><code>'+token+'</code><p>Extension allowlist: '+(extensionOrigin||'Not configured; set BOOKMARK_EXTENSION_ID and restart.')+'</p></html>','text/html');
 if(!files[req.url])store ||= new Store(process.env.DATA_DIR||'data');
 if(req.method==='GET'){
 if(files[req.url]){const [file,type]=files[req.url];return send(200,fs.readFileSync(file),type);}
 if(req.url==='/api/state')return send(200,{...store.state,token,audit:audit(store.state.original)});
 if(req.url==='/api/export'){res.setHeader('Content-Disposition','attachment; filename="favoritos-organizados.html"');return send(200,exportHTML(materialize(store.state.original,store.state.proposals)),'text/html');}
 return send(404,{error:'Não encontrado'});}
 if(req.method!=='POST')return send(405,{error:'Método não permitido'});
 if(req.headers.origin!=='http://'+host||req.headers['x-csrf-token']!==token)return send(403,{error:'Origem ou token inválido'});
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2000000)return send(413,{error:'Pedido muito grande'});}const body=JSON.parse(raw);
 if(body.revision!==store.state.revision)throw Error('Estado mudou; atualize a página');
 if(req.url==='/api/undo'){store.undo(body.revision);return send(200,{ok:true});}
 const ids=body.ids;if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!store.state.proposals.some(p=>p.id===id)))throw Error('Seleção inválida');
 if(req.url==='/api/review')store.commit('Revisão de '+ids.length+' favorito(s)',s=>{for(const id of ids){const p=s.proposals.find(p=>p.id===id);const update=body.update||{};if(Object.keys(update).some(k=>!['title','path','action','status'].includes(k)))throw Error('Campo inválido');Object.assign(p,update);validateProposal(p);}},body.revision);
 else if(req.url==='/api/check'){
 if(body.consent!==true||ids.length>10)throw Error('Autorize a consulta e selecione até 10 links');const results={};for(const id of ids){try{results[id]=await inspect(store.state.original.find(n=>n.id===id).url);}catch(e){results[id]={assessment:e.message,checkedAt:new Date().toISOString()};}}store.commit('Consulta de disponibilidade e conteúdo',s=>Object.assign(s.checks,results),body.revision);
 }else if(req.url==='/api/ai'){
 if(ids.length>20)throw Error('Selecione até 20 links por consulta');const result=await classify(store.state.original.filter(n=>ids.includes(n.id)),store.state.proposals,store.state.checks,body.config);result.forEach(validateProposal);store.commit('Propostas semânticas: '+result.length,s=>{for(const p of result){const i=s.proposals.findIndex(x=>x.id===p.id);s.proposals[i]={...s.proposals[i],...p};}},body.revision);
 }else return send(404,{error:'Não encontrado'});
 console.log(new Date().toISOString(),req.url,'ok');send(200,{ok:true});
 }catch(e){console.error(new Date().toISOString(),'Operação falhou:',e.message);send(400,{error:e.message});}
}).listen(port,'127.0.0.1',()=>console.log('AI Bookmark Organizer: http://'+host));
