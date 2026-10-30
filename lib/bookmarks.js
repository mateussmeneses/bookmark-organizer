import {createHash} from 'node:crypto';
export const hash = s => createHash('sha256').update(s).digest('hex');
export const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode = s => s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m,e) => e[0]==='#' ? String.fromCodePoint(Math.min(0x10ffff,parseInt(e.slice(e[1]?.toLowerCase()==='x'?2:1),e[1]?.toLowerCase()==='x'?16:10))) : ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[e.toLowerCase()]));
export function parse(html, source='import') {
  const nodes=[], stack=[]; let pending=null, capture=null, depth=0;
  for(const token of html.match(/<!--[\s\S]*?-->|<(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+/g)||[]) {
    if(token.startsWith('<!--')) continue;
    const tag=token.match(/^<\s*(\/?)\s*([\w]+)/);
    if(!tag) {if(capture) capture.title+=decode(token); continue;}
    const closing=!!tag[1], name=tag[2].toLowerCase();
    if(!closing && ['h3','a'].includes(name)) {
      const attrs={}; for(const m of token.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]);
      capture={id:hash(source+':'+nodes.length).slice(0,20),type:name==='a'?'link':'folder',title:'',parent:stack.at(-1)?.id??null,attrs,source};
      if(name==='a') capture.url=attrs.href??'';
    } else if(closing && ['h3','a'].includes(name) && capture) {nodes.push(capture);pending=capture.type==='folder'?capture:null;capture=null;}
    else if(name==='dl' && !closing) {depth++;if(pending){stack.push({id:pending.id,depth});pending=null;}}
    else if(name==='dl' && closing) {if(stack.at(-1)?.depth===depth)stack.pop();depth--;}
  }
  return nodes;
}
export function pathOf(n,nodes) {const parts=[], map=new Map(nodes.map(x=>[x.id,x]));let p=map.get(n.parent);while(p){parts.unshift(p.title);p=map.get(p.parent);}return parts;}
export function audit(nodes) {
  const links=nodes.filter(n=>n.type==='link'),folders=nodes.filter(n=>n.type==='folder'), groups=new Map(), domains={}, suspicious=[];
  for(const n of links){let key=n.url;try{const u=new URL(n.url);if(!['http:','https:'].includes(u.protocol))suspicious.push({id:n.id,reason:'Protocolo não HTTP; revisar manualmente'});else if(!u.hostname)suspicious.push({id:n.id,reason:'Host ausente'});domains[u.hostname]=(domains[u.hostname]||0)+1;key=u.href;}catch{suspicious.push({id:n.id,reason:'URL inválida'});}groups.set(key,[...(groups.get(key)||[]),n.id]);}
  const duplicateGroups=[...groups.values()].filter(g=>g.length>1);
  const names=new Map();for(const n of folders){const key=n.title.normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase();names.set(key,[...(names.get(key)||[]),n.id]);}
  return {links:links.length,folders:folders.length,maxDepth:Math.max(0,...nodes.map(n=>pathOf(n,nodes).length)),emptyTitles:links.filter(n=>!n.title.trim()).map(n=>n.id),emptyFolders:folders.filter(n=>!nodes.some(x=>x.parent===n.id)).map(n=>n.id),duplicateGroups,duplicateExtras:duplicateGroups.reduce((a,g)=>a+g.length-1,0),similarFolderNames:[...names.values()].filter(g=>g.length>1),suspicious,domains:Object.entries(domains).sort((a,b)=>b[1]-a[1]),networkStatus:'Não verificado: nenhuma requisição externa foi feita'};
}
const rules=[
 ['Pessoal','Vídeos e música',/youtube\.com|youtu\.be|spotify\.com|deezer\.com|netflix\.com/],
 ['Pessoal','Compras',/amazon\.com|mercadolivre\.com|aliexpress\.com|shopee\.com/],
 ['Pessoal','Jogos',/steampowered\.com|gog\.com|epicgames\.com|xbox\.com|playstation\.com/],
 ['Conhecimento','Cursos',/coursera\.org|udemy\.com|edx\.org|khanacademy\.org/],
 ['Ferramentas','Comunicação',/mail\.google\.com|outlook\.live\.com|web\.whatsapp\.com/],
 ['Tecnologia','Desenvolvimento',/developer\.mozilla\.org|stackoverflow\.com|npmjs\.com|pypi\.org/],
 ['Ferramentas','Inteligência artificial',/chatgpt\.com|claude\.ai|gemini\.google\.com/]
];
const purposeRules=[
 ['Pessoal','Jogos',/\b(roms?|playstation|ps[345]|xbox|game repack|games?|gaming|emulator|emulation|bloodborne|zelda|shadps4)\b/i],
 ['Conhecimento','Livros e bibliotecas',/\b(ebooks?|books?|livros?|biblioteca|gutenberg|z-library|libgen)\b/i],
 ['Pessoal','Religião',/\b(bible|bíblia|pregações|adventistas?|teológico|culto|deus)\b/i],
 ['Conhecimento','Idiomas',/\b(grammarly|youglish|cambridge dictionary|reverso|tradução)\b/i],
 ['Tecnologia','Segurança e engenharia reversa',/\b(whois|osint|dns|xss|pentester|ghidra|reverse engineering|engenharia reversa|apktool|security scanner|shodan|censys|virustotal)\b/i],
 ['Tecnologia','Qualidade de software',/\b(testing|testes?|qa|jmeter|appium|selenium|istqb|pairwise|browserstack|sonarqube|acessibilidade)\b/i],
 ['Conhecimento','Cursos',/\b(cursos?|course|academy|aprendizado|pluralsight)\b/i],
 ['Ferramentas','Inteligência artificial',/\b(llms?|genai|chatgpt|gemini|deepseek|grok|copilot|rag|ai agents|voice cloning)\b/i],
 ['Ferramentas','Arquivos e conversão',/\b(conversor|converter|formatter|beautify|editar pdf|remove\.bg|base64|diffchecker|mp3 cutter)\b/i]
];
export function propose(nodes) {
 const dup=new Set(audit(nodes).duplicateGroups.flatMap(g=>g.slice(1)));
 return nodes.filter(n=>n.type==='link').map(n=>{let host='';try{host=new URL(n.url).hostname;}catch{}
 const evidence=n.title+' '+host, matches=purposeRules.filter(r=>r[2].test(evidence));
 const domainRule=rules.find(r=>{const m=r[2].exec(host);return m&&m.index+m[0].length===host.length&&(m.index===0||host[m.index-1]==='.');}), rule=matches.length===1?matches[0]:matches.length===0?domainRule:null, old=pathOf(n,nodes), professional=old.some(x=>/trabalho|iatec|profissional/i.test(x));
 const path=professional?['Profissional',...old.filter(x=>!/barra de favoritos/i.test(x))]:rule?rule.slice(0,2):old;
 return {id:n.id,title:n.title.trim()?n.title:host||'Sem título',path,action:'keep',confidence:professional?0.65:rule?0.7:0.2,reason:professional?'Contexto profissional indicado pela pasta original, ainda não validado; subpastas preservadas para revisão.':rule?`Indício em título/domínio para ${rule[1]}; conteúdo não consultado. Confiança heurística, não probabilidade calibrada.`:matches.length>1?'Indícios de finalidades diferentes: mantida a pasta até revisão semântica.':'Sem evidência suficiente: mantida a localização original.',duplicate:dup.has(n.id),status:'pending',engine:'rules'};});
}
export function materialize(original,proposals,preview=false) {
 const nodes=structuredClone(original),map=new Map(nodes.map(n=>[n.id,n]));
 for(const p of proposals){if(p.status!=='approved' && !(preview&&p.status==='pending'))continue;const n=map.get(p.id);if(!n)continue;if(p.action==='remove'){nodes.splice(nodes.indexOf(n),1);continue;}
 if(JSON.stringify(pathOf(n,nodes))!==JSON.stringify(p.path)){let parent=null;for(const title of p.path){let f=nodes.find(x=>x.type==='folder'&&x.parent===parent&&x.title===title);if(!f){f={id:'new-'+hash(JSON.stringify([parent,title])).slice(0,20),type:'folder',title,parent,attrs:{}};nodes.push(f);}parent=f.id;}n.parent=parent;}n.title=p.title;
 }return nodes;
}
export function exportHTML(nodes) {
 const render=parent=>nodes.filter(n=>n.parent===parent).map(n=>{const attrs={...n.attrs};if(n.type==='link')attrs.href=n.url;const a=Object.entries(attrs).map(([k,v])=>` ${k.toUpperCase()}="${escape(v)}"`).join('');return n.type==='folder'?`<DT><H3${a}>${escape(n.title)}</H3>\n<DL><p>\n${render(n.id)}</DL><p>\n`:`<DT><A${a}>${escape(n.title)}</A>\n`;}).join('');
 return '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n'+render(null)+'</DL><p>\n';
}
