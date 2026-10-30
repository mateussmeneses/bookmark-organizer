// @ts-check
/** @typedef {{name:string,parent:string,aliases:string[],terms:string[]}} Category */
/** @type {Category[]} */
export const categories = [
  {name:'Gaming',parent:'Entertainment',aliases:['Jogos','Video Games','Games'],terms:['gaming','video games','jogos','playstation','xbox','steam','gameplay']},
  {name:'Emulation',parent:'Entertainment',aliases:['Emulação','Emulacao','ROMs'],terms:['emulation','emulator','emulador','roms','shadps4','retrostic']},
  {name:'Modding',parent:'Entertainment',aliases:['Mods'],terms:['modding','game mods','mod loader','homebrew']},
  {name:'Piracy',parent:'Digital Media',aliases:['Pirataria','Warez','Pirates'],terms:['piracy','pirataria','warez','pirated','cracked games','repacks','fitgirl','dodi','skidrow']},
  {name:'Torrents & P2P',parent:'Digital Media',aliases:['Torrents','P2P'],terms:['bittorrent','torrent','torrents','peer to peer','qbittorrent']},
  {name:'Reverse Engineering',parent:'Technology',aliases:['Engenharia Reversa'],terms:['reverse engineering','engenharia reversa','ghidra','decompile','decompilation','apktool']},
  {name:'Artificial Intelligence',parent:'Technology',aliases:['AI','IA',"IA's",'Inteligência Artificial'],terms:['artificial intelligence','inteligencia artificial','llm','rag','chatgpt','claude','gemini','deepseek','machine learning']},
  {name:'Software Development',parent:'Technology',aliases:['Programming','Programação','Coding','Desenvolvimento'],terms:['programming','programacao','coding','software development','javascript','typescript','python','developer.mozilla','npmjs']},
  {name:'Software Testing',parent:'Technology',aliases:['QA','Testes','Qualidade de software'],terms:['software testing','test automation','testes','selenium','appium','jmeter','istqb','pairwise']},
  {name:'Security',parent:'Technology',aliases:['Cybersecurity','BugBounty','Segurança'],terms:['security','seguranca','pentest','bug bounty','osint','whois','xss','shodan','censys']},
  {name:'Tools & Utilities',parent:'Productivity',aliases:['Tools','Ferramentas','Utilitários','Utilitarios','conversor'],terms:['utility','utilities','formatter','converter','conversor','base64','pdf editor']},
  {name:'Books & Libraries',parent:'Knowledge',aliases:['Livros','Bibliotecas'],terms:['books','ebooks','livros','biblioteca','gutenberg','library']},
  {name:'Courses & Education',parent:'Knowledge',aliases:['Cursos','Faculdade','Education'],terms:['course','courses','curso','cursos','university','faculdade','udemy','coursera','academy']},
  {name:'Languages',parent:'Knowledge',aliases:['Idiomas','Inglês','Ingles'],terms:['dictionary','grammarly','youglish','reverso','traducao','language learning']},
  {name:'Religion',parent:'Personal',aliases:['Igreja','Religião'],terms:['bible','biblia','igreja','religion','adventista','teologia','sermon']},
  {name:'Shopping',parent:'Personal',aliases:['Compras'],terms:['shopping','compras','amazon','mercadolivre','aliexpress','shopee']},
  {name:'Music & Video',parent:'Entertainment',aliases:['Música','Videos'],terms:['music','musica','spotify','netflix','youtube','video streaming']},
  {name:'Communication',parent:'Productivity',aliases:['Comunicação','Social'],terms:['email','whatsapp','outlook','gmail','messaging']},
];
export const normalize = (/** @type {string} */ text) => text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases = new Map(categories.flatMap(c => [c.name,...c.aliases].map(a => [normalize(a),c.name])));
export function canonical(/** @type {string} */ name) { return aliases.get(normalize(name)) || name.trim(); }
export function categoryPath(/** @type {string} */ name) {
  const c=categories.find(c=>c.name===canonical(name));
  return c ? [c.parent,c.name] : ['Review Inbox'];
}
export function consolidate(/** @type {string[]} */ path) {
  const last=path.at(-1); if (!last) return ['Review Inbox'];
  return categoryPath(last);
}
