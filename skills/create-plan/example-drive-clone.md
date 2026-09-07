# Prompt — Clone do Google Drive (upload direto ao storage, `.zip` e compartilhamento revogável)

**Papel:** atue como um desenvolvedor Full-stack Sênior com forte experiência em **sistemas de
armazenamento de arquivos em escala**, **segurança de upload e de conteúdo servido de volta a
terceiros**, **modelagem relacional desacoplada de object storage**, **sistemas de permissão e
compartilhamento** e **processamento assíncrono de mídia**.

**Missão:** construir o **`apps/web`** e o **`workers/file-processing`** de um clone do Google
Drive — upload, organização, visualização e compartilhamento de arquivos, pastas e `.zip` — cujo
invariante central é que **o servidor da aplicação nunca transporta o binário**: o cliente fala
direto com o object storage, e o banco é a única fonte de verdade sobre estrutura e permissão.

**Mentalidade de produção:** três assimetrias tornam os erros aqui diferentes dos de um CRUD. **O
servidor nunca vê os bytes**, então nada que o cliente afirma sobre um arquivo — nome, tipo,
tamanho — pode ser acreditado. **Toda confirmação de upload é uma transação distribuída entre dois
sistemas que podem divergir**, e a divergência é silenciosa: o objeto existe e o registro não, ou o
contrário. **Todo arquivo é entrada hostil e volta a ser servido a terceiros**, o que transforma
cada preview num vetor de execução no seu domínio. Cada decisão precisa de razão explícita, cada
fronteira de contrato tipado, e cada caminho de falha de um estado previsto.

> **Nota de terminologia.** O pedido original lista **tRPC**, **HonoJS** e os **Route Handlers do
> Next.js** como stack obrigatória simultânea, e logo depois especifica rotas REST versionadas sob
> `/api/v1` com envelope `{ data }` / `{ error }`. São quatro formas de expor a mesma API, e duas
> delas (tRPC e REST versionado) são modelos de contrato diferentes. Não é um erro de escolha — é
> uma ambiguidade que precisa ser fechada antes de existir código, e a §13 a fecha dando papel
> distinto a cada peça. Se a intenção era usar apenas uma delas, a §13 é a seção a rediscutir, e
> nenhuma outra muda.

**Base:** projeto novo — não há repositório a ler, e nenhuma linha deste documento descreve algo
como já existente (§3). Escrito em 2026-08-28.

---

## Sumário

**Parte I — Fundamentos** · 1. Decisões fechadas · 2. Stack obrigatória · 3. Peças a construir ·
4. Estrutura e arquivos · 5. Modelo de dados

**Parte II — Produto** · 6. Objetivo funcional · 7. Superfícies e fluxos · 8. Fidelidade visual ·
9. Componentização

**Parte III — Núcleo técnico** · 10. Motor de upload · **11. Object storage (ranking)** ·
**12. Fila e processamento (ranking)** · **13. Camada de API (ranking)** · 14. Autenticação ·
15. Autorização e compartilhamento · 16. Segurança · 17. Contratos de fronteira

**Parte IV — Implementação** · 18. Estado e validação · 19. Padrões de código · 20. Engenharia e CI

**Parte V — Qualidade** · 21. Testes · 22. Performance · 23. Acessibilidade · 24. Responsividade ·
25. Observabilidade · 26. Custo operacional

**Parte VI — Entrega** · 27. Escopo v1 vs Fase 2 · 28. Inventário de variáveis · 29. Resultado
esperado · 30. Ordem de execução

---

## 1. Decisões fechadas (não se rediscute; registre como ADR)

| Decisão | Escolha | Razão curta |
| --- | --- | --- |
| Onde os bytes vivem | **Cloudflare R2** (§11) | Download é a operação dominante do produto e o egress do R2 é zero; a Cloudflare já é obrigatória na borda |
| Quem processa arquivo | **Worker Node em container, BullMQ + Redis** (§12) | Extração de `.zip`, thumbnail e antivírus exigem sistema de arquivos real e binários nativos |
| Como a API é exposta | **Hono num Route Handler catch-all**, servindo REST `/api/v1` e o handler tRPC (§13) | Webhook e link público precisam de contrato versionado e estável; o front precisa de tipo ponta a ponta — um só runtime serve os dois sem duplicar middleware |
| Autenticação | **Better Auth** no mesmo Postgres, via adapter Drizzle | Sessão revogável na própria base (§14); revogar acesso precisa valer na requisição seguinte, não na expiração do token |
| Banco e ORM | **Postgres (Neon) + Drizzle** | O mesmo tipo flui para web e worker sem codegen; branching por ambiente cobre preview e teste de integração |
| Exclusão | **Sempre lógica**; o expurgo é um **job agendado** após a retenção (§12) | Restaurar precisa devolver a subárvore inteira, e isso é impossível depois de apagar o objeto |
| Pastas | **Agrupador lógico, sem chave de objeto** | Object storage não tem diretório; emular um cria dois lugares para a mesma verdade |
| Hash do conteúdo | **Calculado pelo worker**, nunca aceito do cliente | Hash vindo do cliente permite reivindicar por deduplicação a chave de outro usuário |
| Token de link | **Guardado como hash**, nunca em claro | Vazamento de dump do banco não vira acesso ao conteúdo |
| Paginação | **Sempre por cursor**, nunca por offset | Uma pasta que recebe upload durante a navegação faz o offset repetir e pular itens |
| Preview de conteúdo do usuário | **Domínio separado do principal** (§16) | Um SVG hostil servido do domínio da sessão rouba a sessão |
| Notificação de job | **Polling com teto de tentativas** (§10) | Ninguém observa o progresso de outra pessoa; uma conexão persistente por usuário custa mais do que resolve |
| Quota | **Incremental, na mesma transação que muda o `Node`** | Somar arquivos a cada leitura é O(n) e mente sob concorrência |
| Hierarquia de pastas | **`parent_id` + caminho materializado**, atualizado na mesma transação do move | Listar uma pasta é O(1) e mover uma subárvore continua sendo uma escrita só |

---

## 2. Stack obrigatória

| Camada | Tecnologia |
| --- | --- |
| Monorepo | **Turborepo** + **pnpm workspaces**, com versões alinhadas por `catalog:` |
| Framework web | **Next.js** (App Router; Server Actions só para formulário, nunca para upload — §13) |
| Linguagem | **TypeScript** strict, com `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` |
| Runtime HTTP da API | **Hono**, montado num Route Handler catch-all (§13) |
| Contrato tipado interno | **tRPC**, montado sobre o mesmo Hono |
| Banco e ORM | **Postgres (Neon)** + **Drizzle**, driver `@neondatabase/serverless` |
| Autenticação | **Better Auth** com adapter Drizzle |
| Object storage | **Cloudflare R2** via **AWS SDK v3** (a API é compatível com S3 — §11) |
| Fila e worker | **BullMQ** + **Redis**, worker Node em container (§12) |
| Estilo e design system | **Tailwind CSS** + **shadcn/ui** em `packages/ui` |
| Validação | **Zod** — em **toda** fronteira, e uma só definição por contrato |
| Estado de cliente | **Zustand** (UI e sessão; nunca dados de servidor) |
| Dados assíncronos | **TanStack Query** |
| Formulários | **React Hook Form** + Zod |
| Lint e formatação | **Oxlint + Oxfmt**, com as versões **fixadas** (§20) |
| Testes | **Vitest** · **React Testing Library** · **Playwright** |
| Erros | **Sentry**, inicializado na web **e** no worker |
| Borda | **Cloudflare** — DNS, CDN, WAF, rate limiting, Turnstile no cadastro e na recuperação de senha |

**Política de versões:** latest estável **resolvido no registro no momento da instalação**, alinhado
por catálogo do pnpm, com duas exceções deliberadas — **Oxlint e Oxfmt ficam fixados** (o Oxfmt está
em beta, e uma mudança de formatação vira ruído em todo diff), e o **AWS SDK v3 é fixado por minor**
enquanto o alvo for R2, porque a compatibilidade é de API e não de contrato versionado.

Nenhum número de versão aparece neste documento: uma versão escrita aqui envelhece antes da primeira
sprint e acaba fixada num manifesto sem que ninguém a tenha verificado.

---

## 3. Peças a construir

Este é um projeto novo — não há código a reusar, e nada aqui deve ser descrito como existente.

**A construir:** o motor de upload com multipart, pausa e retomada (§10); a árvore de nós com move
transacional (§5); o worker de processamento com extração de `.zip` protegida (§12); a camada de
autorização por proprietário e por compartilhamento (§15); o design system sobre shadcn/ui (§8); e a
reconciliação entre bucket e banco (§25).

**Não reimplemente:** upload multipart à mão sobre `fetch` — o AWS SDK v3 já resolve assinatura,
particionamento e retry de parte; sniffing de tipo por tabela própria — use uma biblioteca de
detecção por magic bytes; geração de thumbnail e leitura de dimensão — use a biblioteca de imagem
nativa do ecossistema; e varredura de malware — use um scanner mantido, exposto como serviço.

### 3.1 Regra de fallback

R2 e Redis não existem no CI, e o antivírus não deve rodar lá. A arquitetura é desenhada como se
existissem, com a fronteira explícita e um **stub tipado** exercitando o mesmo contrato:
`StorageClient` (presign, complete, abort, delete), `Queue` (enqueue, status) e `Scanner` (scan).

O CI roda a suíte inteira sobre os stubs, mais um teste de integração contra um servidor compatível
com S3 em container. **Bucket real nunca entra em teste automatizado.**

---

## 4. Estrutura e arquivos

```
apps/web/
 ├── app/
 │    ├── (auth)/                 (login, cadastro, recuperação, verificação)
 │    ├── (drive)/                (meu drive, compartilhados, recentes, favoritos, lixeira, busca)
 │    ├── (public)/               (link público — renderiza sem sessão)
 │    └── api/[[...route]]/       (o único Route Handler: entrega tudo ao Hono — §13)
 ├── server/
 │    ├── hono.ts                 (app Hono: middlewares, envelope de erro, montagem)
 │    ├── rest/v1/                (rotas REST versionadas, uma por recurso)
 │    └── trpc/                   (routers tipados, consumidos só pelo front)
 ├── features/                    (upload, explorer, preview, share, trash, search, quota)
 └── proxy.ts                     (redirecionamento e rate limiting — NÃO é fronteira de autorização)

workers/file-processing/          (Node em container: zip, thumbnail, scan, hash, zip de download)

docs/
 ├── architecture/                (ADRs — cada decisão estrutural, incluindo as da §1)
 └── design/                      (uma tela por arquivo, com estados e componentes — §8)

packages/
 ├── ui/                          (design system — shadcn/ui + Tailwind)
 ├── schemas/                     (Zod — a definição única de cada contrato)
 ├── db/                          (schema Drizzle, migrations, client tipado, seeds)
 └── lib/
      ├── storage/                (StorageClient: presign, multipart, lifecycle)
      ├── parser/                 (magic bytes, metadados, thumbnails)
      ├── exporter/               (serialização de subárvore e geração de zip)
      ├── auth/                   (sessão e políticas de acesso — §15)
      └── observability/          (logger estruturado, métricas)
```

**Regra invariável:** nada de lógica de storage na UI, nada de UI no worker, nenhum schema definido
fora de `packages/schemas`, e **um só lugar decide se um usuário pode ver um nó** — a política de
`packages/lib/auth`, chamada por toda rota e todo server action. Uma segunda checagem de permissão
escrita à mão em qualquer handler é um bug esperando o dia em que as duas divergirem.

---

## 5. Modelo de dados

O object storage guarda bytes e nada mais. **Toda estrutura, permissão e estado vive no Postgres** —
é ele que é consultável, transacional e restaurável.

| Entidade | Papel |
| --- | --- |
| `user` | Identidade (Better Auth) mais `quota_total_bytes` e `quota_used_bytes` |
| `node` | Arquivo ou pasta: `type`, `name`, `parent_id`, `owner_id`, `mime_type`, `size_bytes`, `object_key`, `content_hash`, `status`, `path`, `trashed_at` |
| `file_version` | Histórico: `node_id`, `object_key` da versão, tamanho, hash, autor, data |
| `share` | `node_id`, `type` (`user` ou `link`), `user_id` **ou** `token_hash`, `role`, `expires_at`, `revoked_at` |
| `job` | `node_id`, `type`, `status`, `attempts`, `last_error`, `idempotency_key` |
| `upload_session` | Ciclo de vida do upload antes de o `node` existir: `multipart_id`, tamanho esperado, mime declarado, `idempotency_key`, `expires_at` |
| `audit_log` | `user_id`, `action`, `node_id`, `metadata`, gravado na mesma transação da mutação |

O `status` de um nó é uma máquina de estados, e a UI precisa saber representar cada um:

```
uploading ──► processing ──► ready ──► trashed ──► (expurgado pelo job de retenção)
    │              │            ▲          │
    └──► error ◄───┘            └──────────┘  (restaurar)
```

**Regras de integridade**

- **Pasta nunca tem `object_key`.** É agrupador lógico; um `object_key` numa pasta significa que
  alguém emulou diretório no bucket e agora há duas verdades sobre a hierarquia.
- **A quota muda na mesma transação que muda o `node`.** Recalcular somando arquivos custa O(n) e
  mente sob concorrência: dois uploads simultâneos leem o mesmo total e ambos passam pelo limite.
- **`content_hash` é calculado pelo worker, nunca aceito do cliente.** Um hash informado pelo
  cliente permite reivindicar a chave de outro usuário por deduplicação.
- **Mover valida ancestralidade antes de escrever.** Mover uma pasta para dentro de si mesma cria um
  ciclo que desconecta a subárvore inteira da raiz, e nenhuma listagem volta a encontrá-la.
- **`token_hash`, não token.** O banco guarda o hash do token de link; vazamento de dump não vira
  acesso ao conteúdo.
- **Nada some enquanto for restaurável.** O objeto só é apagado quando a retenção vence ou quando o
  dono exclui permanentemente de forma explícita — e as duas passam pelo job de expurgo (§12), que
  é o único lugar do sistema autorizado a apagar bytes.
- **Migrations são idempotentes e testadas** — o CI as roda contra um banco limpo e contra um banco
  já migrado.

---

## 6. Objetivo funcional

1. **Enviar arquivos, imagens, `.zip` e pastas inteiras**, com progresso real, pausa, retomada e
   cancelamento — inclusive arrastando uma pasta do sistema operacional.
2. **Organizar**: criar, renomear, mover e excluir pastas e subpastas preservando a hierarquia.
3. **Ver sem baixar** — imagem, PDF, texto, planilha e vídeo — com recado claro quando o tipo não
   tem preview.
4. **Compartilhar** por link público, por convite individual ou com permissão de edição, com
   expiração opcional e **revogação com efeito imediato**.
5. **Recuperar o que apagou**, com a hierarquia, dentro do prazo de retenção.
6. **Encontrar** por nome, tipo, data e localização, com resultado incremental.
7. **Saber quanto espaço resta**, com aviso antes do limite e bloqueio ao atingi-lo.
8. **Baixar** um arquivo ou uma pasta inteira compactada, sem travar a aba quando o volume é grande.
9. **Extrair um `.zip` no destino**, reconstruindo as pastas — ou guardá-lo como arquivo único.
10. **Ver o histórico de um arquivo** e restaurar uma versão anterior.
11. **Marcar favoritos** para acesso rápido.
12. **Revogar uma sessão** de outro dispositivo.

---

## 7. Superfícies e fluxos

Não há mocks. **O design de referência não existe**: desenhe no vocabulário do shadcn/ui, seguindo
as regras da §8, e registre cada tela em `docs/design/` conforme for decidida.

- **7.1 Autenticação** — login, cadastro e recuperação, com social e e-mail/senha, erro por campo e
  proteção contra reenvio duplicado.
- **7.2 Meu Drive** — barra lateral com indicador de armazenamento; topo com busca, alternância
  grade/lista e "Novo"; área principal com breadcrumb, seleção múltipla e ações contextuais.
- **7.3 Painel de upload** — flutuante, com progresso por item, ações de pausar, retomar, cancelar e
  tentar de novo, contador geral, e aviso ao fechar a aba com envio em curso.
- **7.4 Preview** — conteúdo, ações rápidas, navegação entre irmãos com pré-carregamento do próximo.
- **7.5 Compartilhamento** — convidados por e-mail com permissão, seção de link geral com expiração
  e cópia, lista de quem já tem acesso, proprietário no topo e não removível.
- **7.6 Lixeira** — só restaurar e excluir permanentemente, com o prazo visível e confirmação
  obrigatória antes do definitivo.
- **7.7 Pesquisa** — filtros por tipo, data e local, reaproveitando a listagem do explorer.
- **7.8 Detalhes** — painel lateral com metadados, atividade e versões.
- **7.9 Configurações** — perfil, sessões conectadas com revogação individual, e uso por tipo.
- **7.10 Link público** — renderiza sem sessão; ação de edição, se permitida, exige login.
- **7.11 Estados de exceção** — sem rede no meio do upload (retomar de onde parou); sessão expirada
  (preservar a fila e reautenticar); quota estourada durante o envio (bloquear antes de gastar
  banda); arquivo em `processing` (preview indisponível com motivo, não erro); `.zip` recusado por
  limite (dizer qual limite); link expirado ou revogado (mensagem própria, nunca 404 genérico);
  antivírus reprovando (arquivo isolado, dono avisado); e nó em `error` (motivo e ação de repetir).
  Cada um com ação clara — nunca um beco sem saída.
- **7.12 Estados vazios** — pasta sem itens (com a ação de enviar ali mesmo), busca sem resultado
  (com sugestão de afrouxar o filtro que mais restringe), lixeira vazia, e "Compartilhados comigo"
  antes do primeiro convite. São quatro telas que o usuário novo vê **primeiro**, e tratá-las como
  ausência de conteúdo em vez de tela é o que faz um produto parecer quebrado no primeiro minuto.

---

## 8. Fidelidade visual e design system

Tudo sai do shadcn/ui em `packages/ui`. **Não crie primitivos novos** — o que é específico do
produto é composição.

Cores por ação: azul para primária e upload, vermelho para exclusão, verde para concluído, âmbar
para aviso (link público ativo, quota perto do limite), com contraste AA em **todos** os estados,
inclusive desabilitado e erro. Ícone consistente por tipo de arquivo e por ação. Estados de hover,
foco, seleção, arraste e desabilitado definidos em todo item interativo.

Skeleton em listagem e preview, com **as mesmas dimensões do conteúdo final** — um skeleton de
altura diferente troca a espera por um salto de layout, que é pior.

**O que não copiar do Google Drive:** o comportamento de arrastar-para-mover dentro da grade, sem
alvo visível, é ambíguo até para quem usa o produto original há anos. Exija destaque explícito da
pasta-alvo e ofereça "Mover para" como caminho equivalente por teclado (§23).

**Toda tela decidida é registrada em `docs/design/`**, com seus estados e o componente do design
system que a compõe. Sem mocks, esse registro é a única memória de por que uma tela ficou como
ficou — e é o que impede a segunda pessoa a mexer nela de redesenhá-la sem saber.

---

## 9. Componentização

**Regra anti-duplicação:** Meu Drive, Compartilhados, Recentes, Favoritos, Lixeira e Pesquisa usam
**o mesmo** componente de listagem, configurado por props (`actions`, `emptyState`, `selectionMode`)
— nunca cópias divergentes. Seis listagens copiadas significam seis lugares para corrigir o mesmo
bug de seleção.

Específicos do produto: item de arquivo em variante grade e lista; barra de progresso de item;
painel flutuante de uploads; modal de compartilhamento; breadcrumb; zona de drop com três estados
(ocioso, sobre-arraste, inválido); preview com fallback por tipo; e painel de versões.

---

## 10. Motor de upload e armazenamento

**Uma interface, três caminhos**, escolhidos pelo tamanho e pela origem: arquivo simples, arquivo
grande em multipart, e pasta (que é apenas muitos arquivos com caminho relativo). Quem chama não
sabe qual está ativo — é isso que permite testar a fila inteira sobre o stub.

| Caminho | Comportamento |
| --- | --- |
| `simple` | Abaixo do limiar: uma URL assinada, um PUT, um complete |
| `multipart` | Acima do limiar: partes paralelas com limite de concorrência, cada uma com sua URL; conclui só depois de validar todas as ETags |
| `folder` | Reconstrói a hierarquia a partir do caminho relativo antes de enviar qualquer byte |

**Invariantes**

- **Valide antes de assinar.** Tipo permitido por allowlist, tamanho máximo e quota restante são
  verificados no servidor antes de emitir a URL. Assinar primeiro e checar depois entrega banda de
  graça a quem quiser abusar.
- **A URL assinada tem escopo de uma chave e minutos de validade.** URL coringa é acesso ao bucket.
- **Chave de idempotência na criação e na conclusão.** Sem ela, um retry de rede cria o segundo nó
  para o mesmo arquivo, e o usuário vê duplicata que não pediu.
- **A conclusão é uma transação distribuída.** O objeto já existe no bucket quando o banco é
  escrito; se a escrita falha, existe um órfão. É por isso que a §25 tem reconciliação, e não por
  excesso de zelo.
- **Retomar é retomar, não recomeçar.** Partes já aceitas são preservadas entre sessões; recomeçar
  um envio de dois gigabytes por causa de um túnel é a diferença entre o produto ser usável ou não.
- **Cancelar aborta o multipart no bucket.** Um cancelamento que só limpa a UI deixa partes pagas
  ocupando espaço até o ciclo de vida passar.
- **Falha é estado previsto:** marque `error` com motivo, preserve o log, ofereça repetir. Nunca
  deixe a UI presa em "enviando".

**Notificação de conclusão:** polling com TanStack Query enquanto `status === 'processing'`, com
backoff e **teto de tentativas** — passado o teto, mostre o estado real e um botão de atualizar, em
vez de sondar para sempre. SSE fica para a Fase 2 (§27), quando houver operação longa o suficiente
para justificar a conexão.

---

## 11. Object storage — ranking e escolha

Critérios: **custo de egress**, **compatibilidade com o ferramental de multipart**, **integração com
o resto da borda**, **riqueza do ciclo de vida** e **maturidade dos eventos de bucket**.

**Como é o problema aqui**

- **Download domina.** Num Drive, cada arquivo é enviado uma vez e lido muitas — preview, thumbnail,
  download, link público. O egress é o driver de custo real (§26), não o armazenamento.
- **A Cloudflare já é obrigatória** no pedido, para DNS, CDN, WAF e Turnstile. Uma das opções já
  está dentro da conta que o projeto terá de qualquer jeito.
- **O ferramental é o mesmo.** Multipart, URL assinada e ETag são a API do S3; o AWS SDK v3 fala com
  as duas opções sem mudança de código.

### 🥇 1º — Cloudflare R2 — **ESCOLHA**

- **Egress zero.** A operação dominante do produto deixa de ter custo variável, e a §26 deixa de ter
  o risco de um link público viral virar fatura.
- **API compatível com S3:** o `StorageClient` de `packages/lib/storage` é escrito uma vez e serve
  às duas opções, o que é justamente o que torna a migração barata.
- **Já está na borda:** cache e WAF ficam no mesmo painel, sem uma segunda CDN na frente do bucket.
- **Custo honesto:** o ciclo de vida do R2 é mais pobre que o do S3 — não há classes de
  armazenamento nem transição por idade, então o expurgo da lixeira e o aborto de multipart
  incompleto precisam de um job próprio (§12) em vez de uma regra declarativa. E os eventos de
  bucket são mais novos, razão pela qual a §12 não depende deles.
- **Configuração obrigatória:** bucket privado, acesso só por URL assinada, CORS restrito à origem
  do app, e prefixo de chave `u/{owner_id}/n/{uuid}` — nunca o nome do arquivo enviado.

### 🥈 2º — AWS S3

Praticamente empatado em capacidade, e **melhor assim que o expurgo virar volume**: as regras de
ciclo de vida resolvem declarativamente o que aqui é um job, e as notificações de bucket são
maduras. **Contra:** o egress é o custo dominante justamente na operação dominante, e servir por
CloudFront acrescenta uma peça e uma fatura a um projeto que já terá a Cloudflare na frente.

### 🥉 3º — Backblaze B2

Barato, com egress gratuito para parceiros de banda. **Contra:** compatibilidade com S3 menos
completa nas bordas do multipart, e mais um fornecedor sem nada na borda que o projeto já usa.

### 4º — Supabase Storage

Bom quando o produto já vive no Supabase e o volume é modesto. **Contra:** é uma camada sobre S3, e
o multipart retomável não tem a mesma maturidade — que é exatamente o requisito central da §10.
**Reconsiderar** se o restante da stack migrar para o Supabase.

### 5º — Guardar os arquivos no Postgres

Antipadrão. Bytes no banco inflam backup e restauração até o ponto em que restaurar deixa de caber
na janela de manutenção, e cada download passa a atravessar o servidor da aplicação — que é
precisamente o que o invariante deste produto proíbe. Não faça.

### Decisão e gatilho de migração

**v1: R2.** Mas **isole a fronteira**: todo acesso a objeto passa por `packages/lib/storage`, atrás
da interface `StorageClient`. Nenhuma outra parte do sistema sabe qual provedor está ativo — nem o
worker, nem as rotas, nem a UI.

**Migre para S3 quando qualquer um destes for verdade** — e registre como ADR:

1. O expurgo passar a exigir tiering por idade (arquivar em vez de apagar após a retenção).
2. O produto precisar de replicação entre regiões por requisito de residência de dados.
3. O job de ciclo de vida próprio (§12) passar de ~300 linhas ou acumular a segunda classe de bug
   de objeto órfão.
4. Entrar uma integração que dependa de notificação de bucket madura.

A fronteira existe para que essa troca custe reescrever `packages/lib/storage/` e nada além disso.

---

## 12. Fila e processamento assíncrono — ranking e escolha

Critérios: **capacidade de rodar binário nativo**, **limite de tempo e de disco por tarefa**,
**acoplamento com a escolha da §11** e **custo de operação**.

**Como é o problema aqui**

- **O trabalho é pesado e sujo:** descompactar `.zip`, gerar thumbnail, varrer malware e calcular
  hash. Tudo isso quer sistema de arquivos real, processo filho e bibliotecas nativas.
- **A duração é imprevisível:** um `.zip` de dez mil entradas não termina no mesmo orçamento de um
  PNG de 200 KB.
- **A §11 já saiu da AWS.** Escolher uma fila AWS agora traria a conta inteira de volta por causa de
  uma peça — o acoplamento entre as duas decisões é real e precisa ser dito.

### 🥇 1º — BullMQ + Redis, worker Node em container — **ESCOLHA**

- **Sistema de arquivos e binários sem restrição:** extração, imagem e antivírus rodam como
  rodariam numa máquina, sem contorcionismo de runtime.
- **Sem teto de execução:** um `.zip` grande não morre em quinze minutos no meio do trabalho.
- **Retry, backoff, prioridade, agendamento e DLQ vêm prontos**, e o agendamento é o que cobre o
  expurgo e o aborto de multipart que o R2 não faz declarativamente (§11).
- **Custo honesto:** você opera um Redis e um processo que não escala a zero — há uma conta fixa
  mesmo num mês sem upload, e há um estado a fazer backup. É o preço de poder rodar binário nativo,
  e ele se paga na primeira extração de `.zip` que um runtime restrito não conseguiria fazer.
- **Configuração obrigatória:** Redis com persistência ligada e política de memória que **não**
  descarta chaves — uma fila num Redis configurado como cache perde trabalho em silêncio.

### 🥈 2º — Cloudflare Queues + Workers

Coerente com a §11 e sem servidor para operar. **Contra:** limite de CPU e ausência de sistema de
arquivos real inviabilizam extração e antivírus — exatamente as duas tarefas que motivam a fila.
Seria a primeira escolha se o processamento fosse só metadado.

### 🥉 3º — AWS SQS + Lambda

Maduro e com escala a zero. **Contra:** traz a AWS de volta só pela fila, e o limite de tempo e o
disco efêmero da função tornam a extração de arquivos grandes um caso a contornar, não a resolver.

### 4º — Um serviço gerenciado de fila com workers próprios

Reduz a operação do Redis. **Contra:** mais um fornecedor no caminho crítico e a perda do
agendamento nativo do BullMQ. **Reconsiderar** se operar o Redis se mostrar o gargalo do time.

### 5º — Processar no request, sem fila

Antipadrão. Um upload de `.zip` seguraria a conexão por minutos, o timeout do proxy mataria o
trabalho pela metade e o arquivo ficaria em `processing` para sempre. Não faça.

### Decisão e gatilho de migração

**v1: BullMQ + Redis.** **Isole a fronteira**: os handlers publicam pela interface `Queue`; o worker
consome dela. Trocar de fila é reescrever o adaptador, não os jobs.

**Migre para uma fila gerenciada quando qualquer um destes for verdade:**

1. O Redis exigir failover e a equipe não quiser operar réplica.
2. O worker passar a precisar de mais de uma classe de máquina (GPU para vídeo, por exemplo).
3. A fila acumular a segunda incidência de trabalho perdido por reinício de container.
4. O volume passar de ~10 mil jobs por dia, onde o custo fixo deixa de ser o mais barato.

---

## 13. Camada de API — ranking e escolha

Esta seção fecha a ambiguidade apontada na nota de terminologia. Critérios: **um só lugar por
contrato**, **tipagem ponta a ponta no front**, **contrato estável para consumidor externo** e
**quantidade de runtimes a manter**.

**Como é o problema aqui**

- **Há dois públicos diferentes.** O front do próprio produto quer tipo e inferência; o webhook do
  worker e o link público querem um contrato REST estável e versionado.
- **O pedido especifica as duas coisas** — tRPC na stack, e `/api/v1` com envelope no capítulo de
  contratos. Escolher uma e ignorar a outra seria decidir por omissão.
- **Zod já é obrigatório**, o que permite as duas superfícies derivarem da mesma definição em vez de
  duplicá-la.

### 🥇 1º — Hono num Route Handler catch-all, servindo REST `/api/v1` e o handler tRPC — **ESCOLHA**

- **Um runtime HTTP, dois contratos com públicos distintos:** `/api/v1/*` é REST versionado com
  envelope, consumido por webhook, link público e qualquer cliente futuro; o tRPC serve o front do
  produto com tipo ponta a ponta.
- **Middleware escrito uma vez** — sessão, rate limiting, log correlacionado e envelope de erro
  valem para as duas superfícies, porque as duas são o mesmo app Hono.
- **Server Actions ficam com o que são boas:** mutação de formulário (renomear, criar pasta,
  preferência). **Nunca upload** — um action que recebe binário reintroduz o servidor no caminho dos
  bytes, que é o invariante que este produto existe para evitar.
- **Custo honesto:** existem duas formas de chamar o servidor, e duas formas é uma a mais para um
  contrato divergir. Isso só é aceitável porque **ambas derivam do mesmo schema Zod de
  `packages/schemas`** — a duplicação é de transporte, nunca de definição. Se algum dia um schema
  for escrito direto num handler, este arranjo passa a ser um passivo.
- **Configuração obrigatória:** um único `app/api/[[...route]]/route.ts`; nenhuma rota solta fora do
  Hono, porque uma rota fora dele é uma rota sem os middlewares.

### 🥈 2º — Só REST `/api/v1`, sem tRPC

Mais simples de explicar e de versionar, e **melhor se o time preferir contrato explícito a
inferência**. Perde por custo diário: o front passa a escrever e manter tipos de request e response
à mão, e é aí que a divergência silenciosa nasce. **Contra:** mais código repetido no cliente.

### 🥉 3º — Só tRPC

Ótima ergonomia interna. **Contra:** o webhook do worker e o link público precisam de um contrato
estável e versionado que o tRPC não se propõe a dar, e improvisá-lo por procedimento seria pior que
tê-lo em REST desde o início.

### 4º — Route Handlers do Next.js, um arquivo por rota, sem Hono

Zero dependência a mais. **Contra:** middleware, envelope e validação passam a ser repetidos em cada
arquivo, e é assim que uma rota acaba sem verificação de sessão. **Reconsiderar** se o número de
rotas ficar pequeno o bastante para caber numa revisão manual.

### 5º — NestJS como serviço de API separado

Antipadrão **para este projeto**. Acrescenta um segundo deploy, um segundo modelo de injeção e uma
segunda fronteira de autenticação para servir as mesmas rotas que já cabem no app. Não faça — a
menos que a API passe a ter consumidores independentes do produto, e aí é decisão nova.

### Decisão e gatilho de migração

**v1: Hono com as duas superfícies.** **Isole a fronteira**: nenhum handler define schema; todos
importam de `packages/schemas`.

**Reveja quando:** um schema for definido fora de `packages/schemas`; o tRPC passar a ser consumido
por algo que não seja o front do produto; ou surgir um segundo consumidor externo, momento em que o
REST vira o contrato principal e ganha `/api/v2` em vez de mudar `/api/v1`.

---

## 14. Autenticação e sessão

Better Auth sobre o mesmo Postgres, com as tabelas convivendo no schema Drizzle do domínio — é isso
que permite juntar `user` e `node` numa consulta sem sincronizar nada.

- **A sessão é validada no servidor em toda rota e todo server action.** O `proxy.ts` faz
  redirecionamento e checagem otimista para a experiência, e **nada além disso**: proteção que vive
  só nessa camada é contornável por cabeçalho forjado.
- **Revogar tem efeito imediato**, porque a sessão é lida da base — não é um token autocontido que
  vale até expirar. A tela de dispositivos conectados (§7.9) depende disso para não ser teatro.
- **Verificação de e-mail antes de compartilhar com terceiros.** Uma conta não verificada pode
  enviar arquivo para si; convidar gente é o que exige o e-mail confirmado.
- **Turnstile no cadastro e na recuperação de senha**, e rate limiting nas duas (§16).
- **Login social e e-mail/senha** com erro por campo e proteção contra reenvio duplicado.

---

## 15. Autorização e compartilhamento

O coração do produto, e onde um erro é uma violação de privacidade, não um bug de UI.

- **Uma só política.** `packages/lib/auth` expõe `can(user, node, action)`, e toda rota e todo
  action passam por ela. Uma segunda verificação escrita à mão em qualquer handler é a que vai
  divergir.
- **A permissão é resolvida na subárvore.** Compartilhar uma pasta dá acesso ao que está dentro,
  então a checagem sobe a cadeia de ancestrais até encontrar um `share` válido ou o proprietário. É
  o caminho materializado (§1) que torna isso uma consulta e não uma recursão.
- **Link público usa token opaco e imprevisível**, guardado como hash (§5), com `expires_at`
  opcional e `revoked_at` respeitado na leitura — **revogar não espera cache expirar**.
- **Quem tem link não tem sessão.** A rota pública lê o token, resolve o nó e serve; nunca deduz
  identidade nem permite escrita sem login, mesmo quando o link é de edição.
- **Rebaixar permissão tem efeito na próxima requisição.** Nada de cache de permissão em memória com
  janela de minutos: a janela é exatamente o tempo em que alguém removido continua lendo.
- **Toda mudança de acesso grava `audit_log` na mesma transação.** Quem compartilhou, com quem,
  quando e o que revogou. Sem isso não há resposta para "quem deu acesso a esse arquivo".
- **O proprietário não é removível** e aparece no topo da lista.

---

## 16. Segurança

**A regra que rege o desenho:** o produto armazena conteúdo arbitrário de terceiros e o serve de
volta pelo navegador. Um `.svg` ou `.html` hostil servido do domínio principal executa script na
origem da sessão e rouba a conta de quem apenas abriu um preview.

- **Conteúdo do usuário é servido de um domínio separado**, com `Content-Security-Policy`
  restritiva, `X-Content-Type-Options: nosniff` e `Content-Disposition: attachment` para tudo que
  não está na allowlist de preview inline.
- **O tipo vem do conteúdo, não do cliente.** O worker detecta por magic bytes e corrige
  `mime_type`; a extensão e o `Content-Type` enviados são pistas, não fatos.
- **Extração de `.zip` com limites explícitos**, verificados durante a extração e não depois: razão
  máxima de compressão, número máximo de entradas, tamanho total descompactado e profundidade
  máxima. Estourou, o job aborta e marca `error` com o limite que falhou. Um bomb de 42 KB vira
  petabytes se ninguém contar enquanto descompacta.
- **O caminho de uma entrada do `.zip` vira hierarquia de nós, nunca chave de objeto** — a chave é
  sempre `u/{owner_id}/n/{uuid}` (§11), e é essa escolha que já fecha a classe clássica de traversal
  no storage. O que resta defender é a **árvore**: rejeite entrada com `..`, caminho absoluto, drive
  letter ou link simbólico, e confirme que cada segmento resolve para dentro da pasta de destino
  antes de criar qualquer nó. Um `../../` que passe não escreve fora do bucket, mas espalha arquivos
  por pastas que o usuário não escolheu, sem que a listagem mostre de onde vieram.
- **O arquivo fica em `processing` até a varredura terminar**, e só então pode ser baixado por
  terceiros. Liberar antes transforma o produto em hospedagem de malware com o seu domínio na URL.
- **Rate limiting** na autenticação, na emissão de URL assinada e na criação de compartilhamento —
  as três rotas onde o abuso é barato para o atacante e caro para você.
- **Credenciais de bucket com o menor escopo possível:** a aplicação assina; o worker lê e escreve
  apenas nos prefixos de que precisa. **Nenhuma credencial de storage chega ao cliente** —
  verificado por teste no CI (§21).
- **A negativa:** nada de preview inline para tipo fora da allowlist, por mais conveniente que
  pareça. `text/html` nunca entra nela.

---

## 17. Contratos de fronteira

- **Rotas REST versionadas sob `/api/v1`**, uma por recurso: sessões de upload (criar, concluir,
  abortar), arquivos (listar, renomear, mover, favoritar, excluir), pastas, compartilhamentos, busca,
  lixeira e o webhook de conclusão de job.
- **Paginação é sempre por cursor**, nunca por offset — uma pasta que recebe upload durante a
  navegação faz o offset repetir e pular itens.
- **Envelope único:** `{ data }` em sucesso, `{ error: { code, message, details } }` em falha, com
  `code` vindo de um **conjunto fechado**: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`,
  `QUOTA_EXCEEDED`, `MIME_NOT_ALLOWED`, `FILE_TOO_LARGE`, `UPLOAD_EXPIRED`, `IDEMPOTENCY_CONFLICT`,
  `ZIP_LIMIT_EXCEEDED`, `SCAN_FAILED`, `SHARE_REVOKED`, `SHARE_EXPIRED`, `RATE_LIMITED`,
  `INTERNAL`. Um segundo vocabulário de códigos é proibido: a UI traduz este e nenhum outro.
- **Toda rota valida entrada e saída** com o schema de `packages/schemas`. Validar só a entrada
  deixa o contrato de resposta livre para apodrecer sem ninguém perceber.
- **O webhook do worker é autenticado por assinatura** e é idempotente por `job_id` — reentrega é
  comportamento normal de fila, não exceção.
- **A negativa:** nenhum binário atravessa a API. Upload vai por URL assinada; download volta por
  URL assinada. Uma rota que aceita ou devolve bytes é um bug de arquitetura.

---

## 18. Fronteiras de estado e validação

| Camada | Responsabilidade |
| --- | --- |
| **Zustand** | UI e sessão do cliente: pasta atual, seleção, modo de visualização, fila de upload em memória, estado de modal |
| **TanStack Query** | Tudo que vem do servidor: listagem, metadado, permissão, quota; invalidação após mutação; polling enquanto houver nó em `processing` |
| **Zod** | Toda entrada e saída: rotas, tRPC, payload de webhook, protocolo de job |

Separação estrita: **Zustand nunca guarda dado de servidor; TanStack Query nunca guarda estado de UI
efêmero.** O banco é a fonte de verdade sobre estrutura e permissão; o cliente a reflete e jamais a
duplica. Mutação otimista com rollback para renomear, mover e favoritar — nunca para excluir, onde o
custo de errar o otimismo é o usuário achar que perdeu um arquivo.

---

## 19. Padrões de código

TypeScript strict, **sem `any`** (`unknown` com narrowing). Componentes pequenos, props tipadas,
hooks por domínio com nome descritivo. Tratamento de erro explícito em toda chamada assíncrona —
nada de `catch` vazio; erro esperado é tipado e mapeado para um `code` do conjunto fechado (§17).
Separação clara entre UI, estado, consumo de API, motor de upload e worker.

**Comentário explica o porquê**, sobretudo nas decisões contraintuitivas deste projeto: por que a
quota muda na transação em vez de ser somada; por que o hash é calculado no worker e não aceito do
cliente; por que o preview vive noutro domínio; por que existem duas superfícies de API e onde está
o gatilho para deixar de existir (§13); e por que a conclusão do upload precisa de reconciliação
(§25) em vez de simplesmente confiar na escrita.

---

## 20. Engenharia, CI e workflow

**O repositório é novo, então ainda não há guia nenhum** — e é por isso que esta seção declara o
mínimo em vez de apontar para documentos: CI valida na ordem formatação → lint → build → testes;
`main` só avança por PR com CI verde; o hook local usa `--fix` e o CI usa `--check`; commits seguem
Conventional Commits; e toda implementação roda em worktree dedicada.

Quando os guias forem escritos — CI, worktree, Oxlint/Oxfmt e E2E são os quatro que este projeto
vai querer —, esta seção passa a apontar para eles em vez de repeti-los, e vale a **regra de
precedência**: conflito sobre política de CI, o guia de CI prevalece; conflito sobre a configuração
de uma ferramenta, o guia dela prevalece; conflito sobre branch e worktree, o guia de worktree
prevalece.

Específico deste projeto: o job de teste sobe Postgres e um servidor compatível com S3 em container;
o worker tem seu próprio build e sua própria imagem; e **o antivírus não roda no CI** — o `Scanner`
é stub, e a integração real é validada em ambiente de staging.

---

## 21. Testes

- **Vitest** nas fronteiras onde errar custa caro: a política de `can()` (proprietário, convidado,
  link expirado, link revogado, herança por subárvore); a validação de ancestralidade do move; o
  cálculo transacional de quota sob concorrência; a sanitização de caminho do `.zip` (`..`, caminho
  absoluto e link simbólico, provando que nenhum nó nasce fora da pasta de destino); os limites de
  bomb; a detecção por magic bytes; e a idempotência da conclusão de upload e do webhook.
- **React Testing Library** nos componentes com estado visual não trivial: item de listagem em suas
  variantes, painel de upload em cada status, zona de drop nos três estados.
- **Playwright** nos fluxos críticos: login; upload de arquivo único; upload de pasta preservando a
  hierarquia; `.zip` com extração; navegação e criação de pastas; **link público aberto sem
  sessão**; restauração da lixeira com subárvore; e busca com filtro.
- **Testes de segurança no CI**, automatizados e não por revisão: nenhuma credencial de storage
  aparece no bundle do cliente; um usuário não consegue ler nó de outro por id direto; e um link
  revogado responde `SHARE_REVOKED` e não conteúdo.
- **A negativa:** bucket real e antivírus real **nunca** entram na suíte automatizada. Storage é
  container compatível com S3; scanner é stub.

---

## 22. Performance

Listagem **virtualizada** — uma pasta com dez mil itens não pode renderizar dez mil nós. Paginação
por cursor, sempre. `memo`, `useCallback` e `useMemo` apenas onde há custo medido, não por reflexo.

**Concorrência de upload limitada** a um número fixo de arquivos e de partes simultâneas: saturar a
banda de subida do usuário faz cada item ficar mais lento e a interface parecer travada. **Progresso
com debounce** — um evento por parte enviada inunda o React.

**Thumbnail servido pela CDN**, gerado uma vez e cacheado; regerar a cada preview desperdiça o
trabalho do worker e a paciência de quem navega. **A negativa:** não otimize a listagem antes de ter
virtualização e cursor — nenhuma memoização compensa carregar o diretório inteiro.

---

## 23. Acessibilidade

Rótulo acessível em todo controle. Papéis semânticos corretos na listagem, no progresso, no diálogo
e no menu de contexto. Navegação completa por teclado: setas para mover a seleção, Enter para abrir,
Delete para mandar à lixeira, Escape para fechar, Tab em ordem lógica — **e "Mover para" como
caminho equivalente ao arrastar** (§8), porque arrastar não tem equivalente de teclado.

**Anúncio de mudança de status por região viva:** "upload concluído", "3 itens movidos para a
lixeira", "arquivo pronto". O upload é uma operação de minutos, e quem usa leitor de tela precisa
saber que terminou sem ficar sondando. Alvo de toque de pelo menos 44 × 44 px nos controles
principais. Contraste correto em todos os estados, **inclusive erro e desabilitado** — que é onde
normalmente se esquece.

---

## 24. Responsividade

Barra lateral vira gaveta abaixo do breakpoint de tablet; a listagem alterna para cards empilhados;
o painel de upload ocupa a largura inteira no telefone. Ação de contexto por toque longo onde não há
clique direito, **com o mesmo conjunto de ações** do menu de desktop — um menu móvel reduzido faz o
usuário achar que a função não existe.

Unidades relativas e breakpoints do Tailwind; nada de medida fixa. **A negativa:** upload de pasta
não é oferecido no telefone — a seleção de diretório não existe nesses navegadores, e mostrar um
botão que não funciona é pior que não mostrá-lo.

---

## 25. Observabilidade

**Log estruturado** na web e no worker, sempre com `user_id`, `node_id` e `job_id` — é a correlação
que permite seguir um upload da assinatura até o thumbnail. **Sentry inicializado nos dois**, com
filtro de dado sensível: nome de arquivo é conteúdo do usuário e não vai para o relatório.

**Métricas:** taxa de sucesso e de erro de upload por caminho (simples e multipart); tempo de
processamento por tipo de job; profundidade da fila e idade do job mais antigo; armazenamento
agregado por usuário; e **egress por dia**, que é o driver de custo da §26.

**Reconciliação — não é zelo, é consequência da §10.** Um job periódico detecta objetos no bucket
sem `node` correspondente, `upload_session` expiradas com multipart aberto, e nós presos em
`uploading` ou `processing` além do razoável. Cada caso tem ação definida: retentar, marcar `error`
ou apagar o órfão. Sem isso, o bucket acumula lixo pago e a UI mostra arquivos que nunca vão ficar
prontos.

---

## 26. Custo operacional

O driver de custo é **egress**, não armazenamento: cada arquivo é lido muitas vezes e escrito uma. É
essa assimetria que decide a §11, e é ela que precisa ser medida antes de qualquer otimização de
banco.

Três tetos existem desde o primeiro deploy, com estes valores de partida: **5 GB por arquivo**
(acima disso o multipart deixa de ser a parte difícil e o navegador passa a ser), **15 GB de quota
por usuário** e **100 GB por mês de tráfego por link público** — **um único link viral gera mais
tráfego que toda a base somada**. Com R2 o egress não é cobrado, mas o teto de link continua
existindo por causa do custo de processamento e do risco de abuso de hospedagem.

O custo fixo é o Redis e o container do worker (§12), que não escalam a zero.

---

## 27. Escopo v1 vs Fase 2

**v1** — autenticação com verificação de e-mail; explorer com grade e lista; upload de arquivo,
pasta e `.zip` com multipart, pausa e retomada; extração de `.zip` com proteção; thumbnail e
metadado; varredura antes de liberar a terceiros; compartilhamento por convite e por link com
expiração e revogação; lixeira com retenção; busca com filtros; quota com aviso e bloqueio;
versões de arquivo; favoritos; download de pasta em `.zip` assíncrono; e revogação de sessão.

**Fase 2** — notificação por SSE ou WebSocket no lugar do polling (§10); **tempo real e edição
colaborativa**, deliberadamente fora agora porque exigem um modelo de conflito que este produto não
tem; **comentários em arquivos**; **internacionalização**, avaliada e adiada porque o v1 tem um só
idioma e retrofit de strings é barato perto de tê-las cedo; **cobrança e planos pagos**, avaliada e
adiada porque a quota existe sem dinheiro trocar de mãos; **moderação de conteúdo público**, que
passa a ser necessária no primeiro caso de phishing hospedado no domínio; **rollout por flag**;
migração para S3 se um gatilho da §11 disparar; e aplicativo móvel.

A estrutura é desenhada para a Fase 2 encaixar sem retrabalho: o `StorageClient` isola o provedor, a
interface `Queue` isola a fila, e o polling vive atrás de um hook que pode virar assinatura sem
tocar as telas.

---

## 28. Inventário de variáveis e segredos

| Variável | Uso | Quem cria |
| --- | --- | --- |
| `DATABASE_URL` | Postgres (Neon), com branch por ambiente | Neon |
| `BETTER_AUTH_SECRET` | Assinatura de sessão | gerar |
| `BETTER_AUTH_URL` | Origem canônica para callback social | — |
| `R2_ACCOUNT_ID` · `R2_BUCKET` | Alvo do storage | Cloudflare |
| `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` | Assinatura de URL e acesso do worker | Cloudflare |
| `REDIS_URL` | Fila BullMQ | provedor do Redis |
| `WEBHOOK_SIGNING_SECRET` | Autentica o webhook do worker (§17) | gerar |
| `PUBLIC_CONTENT_ORIGIN` | Domínio separado que serve conteúdo do usuário (§16) | — |
| `TURNSTILE_SECRET_KEY` | Verificação no cadastro e na recuperação | Cloudflare |
| `SENTRY_DSN` | Erros na web e no worker | Sentry |

**As credenciais do R2, do banco, do Redis, o segredo do webhook e o segredo do Better Auth nunca
chegam ao cliente** — sua presença no bundle é falha de segurança, verificada por teste no CI (§21).
O cliente conhece apenas a origem pública de conteúdo e a chave de site do Turnstile.

---

## 29. Resultado esperado

- [ ] Upload de arquivo, pasta e `.zip` com multipart, pausa, retomada e cancelamento que **aborta o
      multipart no bucket**
- [ ] **Nenhum binário atravessa a aplicação** — verificado por teste de integração nas rotas
- [ ] `.zip` extraído reconstrói a hierarquia, e um bomb é recusado com o limite nomeado
- [ ] Entrada de `.zip` com `..` ou caminho absoluto nunca cria nó fora da pasta de destino —
      coberto por teste
- [ ] Link público abre sem sessão; link revogado responde `SHARE_REVOKED` **já na requisição
      seguinte**
- [ ] Um usuário não lê nó de outro por id direto — coberto por teste
- [ ] Quota bloqueia o upload **antes** de emitir a URL assinada, e não desanda sob concorrência
- [ ] Restaurar da lixeira devolve o item **e sua subárvore**
- [ ] Mover pasta para dentro de si mesma é recusado
- [ ] Arquivo só fica disponível a terceiros depois da varredura
- [ ] **Nenhuma credencial de storage no bundle do cliente** — verificado por teste no CI
- [ ] Objeto órfão e nó preso são detectados e resolvidos pela reconciliação
- [ ] Listagem virtualizada e por cursor abre uma pasta de dez mil itens sem travar
- [ ] Fluxo completo por teclado, com anúncio de status por região viva

---

## 30. Ordem de execução

1. **Antes de qualquer código: feche a §13 com o time.** Ter tRPC e REST versionado convivendo é a
   única decisão aqui que admite duas leituras defensáveis, e todo o resto — rotas, schemas, cliente
   — se apoia nela. Construir com ela em aberto significa reescrever a camada de acesso depois.
2. **Meça antes de investir.** Suba um bucket R2, envie um arquivo de dois gigabytes em multipart
   por uma conexão ruim, interrompa e retome. Anote se a retomada funciona ponta a ponta com o SDK
   escolhido. **Se a retomada real se mostrar inviável, o corte honesto é baixar o teto de 5 GB da
   §26 para o que a retomada sustentar** — saber isso antes de desenhar o painel de upload, não
   depois.
3. **Modele a árvore e a política de acesso primeiro**, com os testes da §21 para permissão,
   ancestralidade e quota. São as regras cujo erro é invisível na tela e caro em produção.
4. **Construa o produto sem worker:** autenticação, explorer, upload, download e compartilhamento,
   com os jobs em stub. Já é utilizável e valida a stack inteira.
5. **Depois o worker** — hash e thumbnail primeiro, extração de `.zip` em seguida, antivírus por
   último, porque é o que mais depende de ambiente.
6. **Por fim a reconciliação e o ciclo de vida** (§25, §11), que só têm o que consertar depois de
   existir tráfego real.
7. Mantenha consistência visual, técnica e de segurança, e registre cada decisão estrutural como ADR
   em `docs/architecture/`.
