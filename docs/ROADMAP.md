# Marcos de implementação

## M1 — Auditoria e preservação (entregue)

Importação dos HTML de `input/`, inventário por ID estável, hashes, estatísticas, duplicatas de URL e nomes de pasta semelhantes. Roundtrip da biblioteca real testado. Critério: exportação sem aprovações mantém links, caminhos e metadados.

## M2 — Organização híbrida (MVP entregue; calibração pendente)

Regras conservadoras por finalidade, contexto profissional separado, alternativas semânticas por Ollama/OpenAI-compatible, evidências HTTP opcionais e consentimento por seleção. Critério técnico: respostas validadas, fallback offline, nenhuma aprovação automática. Próxima validação: amostra manual estratificada de 30–50 favoritos (trabalho, jogos, religião, segurança, livros, serviços pessoais) com precisão de destino, preservação de finalidade e taxa de abstenção. Medir esses resultados antes de ampliar aplicação em lote. Não confundir teste de protocolo com qualidade semântica.

## M3 — Revisão local (MVP entregue)

Árvores original/proposta, busca, filtros, multisseleção, arrastar/soltar e edição por teclado, razões, aprovação/rejeição, exportação HTML, backup e reversão. Critério automatizado: pendentes não alteram exportação, revisões concorrentes falham, reversão restaura propostas. Pendente: teste visual em navegador e operação estrutural de pastas vazias, mantendo IDs e ordem explicitamente.

## M4 — Extensão Chrome, Edge e Brave (implementada; aceitação pendente)

A V2 em `extension/` implementa análise local, taxonomia, revisão, snapshots, criptografia, planos e journal de recuperação. O companion usa allowlist explícita de ID, token de sessão e consentimento, sem Native Messaging. Há testes sintéticos e ferramentas de empacotamento/CI. Os itens abaixo registram os critérios originais; consulte `RELEASE.md` para evidências e limites atuais.

1. Extensão Manifest V3 com permissão `bookmarks`. Importar via `chrome.bookmarks.getTree()`, sem ler arquivos internos do perfil. Confirmar compatibilidade em cada navegador Chromium; manter testes específicos para cada um.
2. Conectar extensão e aplicativo por Native Messaging com allowlist de ID da extensão. Não abrir o servidor local para origens arbitrárias. Uma primeira versão pode trocar snapshots/planos por arquivo para evitar instalação de host nativo.
3. Armazenar snapshot completo com IDs, parentId, índice, URL, título, datas e revisão antes de planejar. Manter raízes especiais protegidas, sem renomeá-las/movê-las/removê-las.
4. Mostrar diff concreto e solicitar aprovação do lote na extensão. Usar `create`, `update` e `move`; remoção somente explícita, depois de backup. Comparar snapshot com estado atual antes de cada aplicação; alterações concorrentes abortam o lote.
5. Journal write-ahead por operação com inversa e IDs retornados pelo navegador. A API não oferece transação atômica: recuperação precisa detectar execução parcial, conciliar estado e permitir retomar/reverter com conflitos visíveis. Não executar `removeTree` em pastas que possam ter recebido novos links.
6. Restaurar remoções recriando nós e registrando o mapa de IDs antigos/novos; IDs não são restauráveis arbitrariamente. Preservar posição e relações quando suportado. Não prometer restauração de todos os timestamps que a API não permite escrever.
7. Testar em perfis descartáveis, incluindo sincronização ativa, pastas gerenciadas, interrupção do processo e modificação pelo usuário entre preview/aplicação. Só então habilitar uso em perfil real.

Referências: [Bookmarks API](https://developer.chrome.com/docs/extensions/reference/api/bookmarks), [Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging). A compatibilidade Edge/Brave será verificada na implementação; não foi executada nesta etapa.

Fora deste projeto nesta etapa: GitHub Stars, AI Workbench, integração com outros agentes, publicação de dados pessoais e aplicação direta em perfis reais.
