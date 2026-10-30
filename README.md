# AI Bookmark Organizer V2

Manifest V3 extension for local bookmark review, canonical categories, explicit approval, encrypted backups and recoverable organization. **0.2.0 is a pre-release; full Chrome/Edge/Brave validation is pending.**

## Extension quick start

1. Use a disposable browser profile with sync disabled. Do not use a personal profile for acceptance testing.
2. Open the browser extensions page, enable Developer mode and load the `extension/` directory (or unzip the release archive and load its contents).
3. Open the dashboard. Analyze, review destinations, approve a selection, then preview and apply the plan. Review Mode is the default.
4. Use Backups and recovery to export a snapshot, resume an interrupted batch or roll back. Restores preserve external additions, including empty folders; browser-assigned IDs and timestamps cannot always be recreated.

The extension works offline. Its optional local companion requires Node.js 22+ and no dependencies. In PowerShell:

```powershell
$env:BOOKMARK_EXTENSION_ID = 'the-32-character-ID-from-your-extensions-page'
npm.cmd start
```

Open `http://127.0.0.1:3210/pair`, copy the session token into the extension and grant the optional loopback permission. The companion accepts only that extension origin, the token and explicit per-operation consent. Pairing and extension requests do not initialize or migrate the V1 data store. Tokens expire when the companion restarts. AI sends only selected bookmarks and their selected metadata; model quality remains uncalibrated.

## Validation and packaging

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run package
```

Packaging requires Windows PowerShell and produces `dist/ai-bookmark-organizer-0.2.0.zip` plus a SHA-256 sidecar. The archive includes only `extension/` contents, with `manifest.json` at its root. CI runs checks, synthetic tests and packaging on Node 22 and 24. The optional personal-library roundtrip test is read-only and explicitly skipped when no input exists.

See [release validation](docs/RELEASE.md), [audit](docs/AUDIT.md) and [roadmap](docs/ROADMAP.md). `input/`, `data/`, `reports/`, generated artifacts and temporary browser profiles are excluded from Git.

## V1 HTML compatibility companion

Aplicação local para auditar e reorganizar favoritos Netscape HTML. Node.js 22 ou superior; nenhuma dependência, conta, telemetria ou serviço pago obrigatório. Licença MIT.

## Executar

```sh
npm run audit
npm test
npm start
```

Abra **http://127.0.0.1:3210**. Coloque os arquivos `.html`/`.htm` em `input/` antes da primeira execução. Não é necessário `npm install`. Execute os comandos na raiz do projeto.

1. Leia `reports/audit.md` e o inventário completo em `reports/audit.json`.
2. Compare as árvores e filtre duplicatas, incertezas ou mudanças propostas.
3. Edite títulos/destinos individualmente ou mova a seleção por arrastar e soltar. O formulário oferece a mesma operação por teclado.
4. Aprove ou rejeite cada proposta ou a seleção. Remoções exigem primeiro uma proposta e depois aprovação; duplicatas nunca são excluídas automaticamente.
5. Exporte HTML. Somente propostas aprovadas entram na exportação; propostas pendentes e rejeitadas mantêm o favorito original.
6. O histórico permite reverter a última operação. Reverter uma reversão reaplica a operação. Backups anteriores ficam disponíveis em `data/backups/`.

## Dados e privacidade

`input/` é somente leitura para a aplicação. Os hashes SHA-256 constam no relatório e no estado. URLs, atributos (inclusive datas e ícones), pastas vazias e títulos originais são preservados no inventário. O HTML exportado é reformatado; os bytes originais continuam intactos em `input/`.

`data/state.json` guarda original, propostas, evidências HTTP e histórico. Cada mutação validada cria um backup integral antes da gravação por substituição de arquivo temporário. Revisões impedem que uma aba sobrescreva alterações de outra. **Execute apenas um servidor por diretório de dados**; não há coordenação entre processos.

Para importar uma biblioteca modificada, pare o servidor e utilize outro diretório (`$env:DATA_DIR='data-nova'; npm start` no PowerShell), mantendo o anterior como backup. A aplicação recusa continuar silenciosamente quando os arquivos de entrada mudam. Para restaurar um backup específico, pare o servidor, copie `state.json` para outro arquivo e copie o backup escolhido sobre `state.json`.

Nenhum favorito é enviado a serviços externos automaticamente. A consulta de sites exige consentimento por operação e aceita até 10 links; envia a URL ao site, sem cookies de navegador. URLs privadas/locais e redirecionamentos para redes privadas são bloqueados. 404/410 indicam possível remoção; 401/403/429/5xx e falhas de rede são inconclusivos. Páginas que exigem JavaScript/login podem não fornecer conteúdo útil. A consulta limita tempo e tamanho de resposta e não executa scripts.

O servidor escuta somente em loopback, valida Host/Origin e token de sessão nas escritas, usa CSP e renderiza títulos como texto. Não exponha a porta em rede: não é um serviço multiusuário. Os dados locais não são criptografados; proteja a conta e o disco. `input/`, `data/` e `reports/` estão no `.gitignore` e não devem ser publicados.

## Classificação híbrida

Regras de título/domínio produzem sugestões explicáveis. Indícios conflitantes mantêm a pasta original com baixa confiança. GitHub não é categoria automática: um repositório de jogos pode ir para Jogos, e uma biblioteca de livros mantém sua finalidade. Contexto profissional é uma hipótese explícita para revisão, não uma verdade inferida apenas pela URL. A confiança das regras é heurística, não uma probabilidade calibrada.

Para análise semântica, abra **Privacidade e classificação semântica**, selecione até 20 links e configure:

- **Ollama:** endpoint `http://127.0.0.1:11434`, nome exato de um modelo já instalado; usa `/api/chat` com JSON e sem streaming.
- **OpenAI-compatible:** endpoint base terminado em `/v1`, modelo e chave quando exigida; usa `/chat/completions`. A compatibilidade depende de suporte ao formato JSON. APIs remotas exigem HTTPS.

A chave permanece no formulário durante a sessão; não é persistida nem incluída nos logs. Consentimento vale para a operação. Conteúdo consultado anteriormente entra como evidência junto aos títulos, URLs e propostas da seleção. Respostas inválidas, IDs desconhecidos, duplicados ou ausentes são rejeitados integralmente. A IA somente propõe; não aprova nem remove. Não foi executado modelo real nesta entrega; testes de adaptadores usam servidor simulado.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `lib/bookmarks.js` | Parser Netscape, inventário, regras, aplicação e exportação |
| `lib/store.js` | Estado, validação, revisões, backups e reversão |
| `lib/network.js` | Consulta controlada e adaptadores de IA |
| `audit.js` | Auditoria offline e hashes |
| `server.js` | API HTTP local e proteção de origem |
| `public/` | Interface sem bibliotecas externas |
| `tests/` | Parser, classificação, persistência, rede e API |

## Limites do MVP

O parser é direcionado ao HTML Netscape exportado por navegadores, não a páginas HTML arbitrárias; descrições `DD` não são reexportadas. A cópia original sempre é preservada. A exportação conserva pastas antigas, inclusive as esvaziadas pelas movimentações. Renomear/fundir categorias é feito propondo novos caminhos para seus links; edição estrutural de pastas vazias fica para o próximo marco. Pastas homônimas aparecem agrupadas visualmente por caminho, mas seus IDs originais continuam preservados.

A consulta pública bloqueia IPv6 por precaução e não busca conteúdo autenticado. Não há medição de qualidade com modelo real ainda. Arrastar e soltar e layout precisam de validação visual manual. A extensão V2 descrita acima é independente deste fluxo HTML; sua aceitação completa nos navegadores continua pendente.

Veja [marcos e integração futura](docs/ROADMAP.md). A API de bookmarks planejada segue a [documentação oficial do Chrome](https://developer.chrome.com/docs/extensions/reference/api/bookmarks); o adaptador local segue a [API do Ollama](https://docs.ollama.com/api/chat).
