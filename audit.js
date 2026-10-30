import fs from 'node:fs';
import { parse, audit, hash, propose, pathOf } from './lib/bookmarks.js';

export function readInput() {
  const inputDir=process.env.INPUT_DIR||'input';
  const files = fs.readdirSync(inputDir).filter(f => /\.html?$/i.test(f)).sort();
  if (!files.length) throw Error('Nenhum HTML em input/');
  const sources = files.map(name => {
    const bytes = fs.readFileSync(inputDir+'/' + name);
    return { name, sha256: hash(bytes), bytes: bytes.length, nodes: parse(bytes.toString('utf8'), name) };
  });
  return {
    sources: sources.map(({ nodes, ...source }) => source),
    nodes: sources.flatMap(source => source.nodes),
  };
}

if (process.argv[1]?.endsWith('audit.js')) {
  const { sources, nodes } = readInput();
  const report = { sources, ...audit(nodes) };
  const proposals = propose(nodes);
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/audit.json', JSON.stringify({ report, nodes }, null, 2));
  fs.writeFileSync('reports/proposals.json', JSON.stringify(proposals, null, 2));
  const folders = nodes.filter(n => n.type === 'folder').map(n =>
    `- ${[...pathOf(n, nodes), n.title].join(' / ')}: ${nodes.filter(x => x.parent === n.id && x.type === 'link').length} links diretos`
  );
  fs.writeFileSync('reports/audit.md', `# Auditoria local

${report.links} links; ${report.folders} pastas; profundidade ${report.maxDepth}.

${report.emptyTitles.length} títulos vazios; ${report.duplicateGroups.length} grupos duplicados (${report.duplicateExtras} excedentes); ${report.suspicious.length} URLs sintaticamente suspeitas; ${report.emptyFolders.length} pastas vazias.

${report.similarFolderNames.length} grupos de nomes de pasta semelhantes (não implica que devam ser fundidos).

${report.networkStatus}. Links não foram declarados quebrados sem evidência HTTP.

${proposals.filter(p => p.confidence < .6).length} propostas com baixa confiança. Todas as propostas iniciais em proposals.json estão pendentes.

## Estrutura atual

${folders.join('\n')}

Inventário completo, metadados e hashes: audit.json. Não publicar estes relatórios: contêm dados pessoais.
`);
  console.log(`Auditoria salva em reports/: ${report.links} links, ${report.folders} pastas, ${report.duplicateExtras} duplicatas excedentes. Nenhum acesso externo.`);
}
