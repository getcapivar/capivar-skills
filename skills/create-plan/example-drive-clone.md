# Plano — Clone do Google Drive (upload direto ao storage, `.zip` e compartilhamento revogável)

**Contexto:** enviar, organizar, ver e compartilhar arquivos e `.zip` num produto próprio, em
`apps/web` e `workers/file-processing`. Motivo: guardar arquivos de clientes sem depender do Drive.
Resultado: upload de até 5 GB retomável e link revogado que para na hora. O erro caro é silencioso:
objeto sem registro, ou um arquivo hostil servido do domínio da sessão.

**Base:** projeto novo — não há repositório a ler; escrito em 2026-08-28.

## 1. Decisões fechadas (não se rediscute; registre como ADR)

| Decisão | Escolha | Razão curta |
|---|---|---|
| Upload | cliente envia direto ao R2 por URL assinada | servidor que transporta bytes paga egress e trava em arquivos de 5 GB |
| Preview | app próprio em domínio separado, só por URL assinada | um `.svg` hostil servido do domínio da sessão rouba a conta |
| Autenticação | Better Auth no mesmo Postgres | revogar acesso vale na requisição seguinte, não na expiração do token |
| Exclusão | lógica; expurgo agendado após 30 dias | restaurar devolve a subárvore, impossível depois de apagar o objeto |
| Hierarquia | `parent_id` + caminho materializado | ancestralidade sai de uma leitura; o custo é reescrever o caminho da subárvore no move |
| Quota | reservada no presign, confirmada na transação do `complete` | somar a cada leitura mente sob concorrência |
| Hash do conteúdo | calculado pelo worker, nunca aceito do cliente | o cliente pode declarar o hash de algo que não enviou e furar a varredura |
| Banco | só `apps/web` acessa o Postgres; o worker responde por webhook | um único dono das escritas mantém quota e estado transacionais |
| Token de link | guardado como hash | um dump do banco não vira acesso ao conteúdo |
| Paginação | por cursor | upload durante a navegação faria o offset repetir e pular itens |

## 2. Stack obrigatória

| Camada | Tecnologia |
|---|---|
| Web e API | Next.js App Router + Hono num Route Handler catch-all, TypeScript strict |
| Dados | Postgres (Neon) + Drizzle; Zod em toda fronteira, um schema por contrato |
| Storage e fila | Cloudflare R2 via AWS SDK v3; BullMQ + Redis, worker Node em container |
| UI | Tailwind + shadcn/ui; TanStack Query; Zustand só para estado de UI |
| Qualidade | Vitest, Playwright, Oxlint + Oxfmt, Sentry na web e no worker |

**Política de versões:** latest estável na instalação; Oxlint/Oxfmt fixados (formatador em beta
vira ruído em todo diff) e AWS SDK v3 fixado por minor enquanto o alvo for R2.

## 3. Reuso obrigatório e trabalho novo

**Peças a construir:** upload retomável (§9), árvore com move transacional (§6), worker com `.zip`
protegido (§11) e reconciliação (§17); multipart e tipo vêm do SDK e de magic bytes. **Fallback:**
R2, Redis e antivírus não existem no CI — stubs de `StorageClient`, `Queue` e `Scanner` cobrem o
contrato, mais um S3 compatível em container. Bucket real nunca entra em teste.

## 4. Arquitetura do sistema

```
             ┌─ navegador ────────────────────────────────────┐
             │ UI + fila de upload                            │
             └──┬──────────────────────┬──────────────────┬───┘
                │HTTPS                 │ partes           │ preview
┌───────────────┼──────────────────────┼──────── Cloudflare ───────────┐
│ ┌─────────────▼─────┐presign  ┌──────▼─────┐      ┌─────▼─────────┐  │
│ │ apps/web  :443    │────────▶│ R2 (bytes) │◀─────│ apps/content  │  │
│ │ Next.js + Hono    │         └───────▲────┘      └───────────────┘  │
│ └───┬────┬────────▲─┘                 │                              │
│     │    │SQL     │webhook            │lê/grava                      │
└─────┼────┼────────┼───────────────────┼──────────────────────────────┘
      └────┼────────┼───────────────────┼──────────────────┐ enqueue
┌─ Neon ───┼───┐ ┌──┼───────────────────┼────── container ─┼───────────┐
│ ┌────────▼─┐ │ │ ┌┴───────────────────▼────┐    ┌────────▼─────────┐ │
│ │ Postgres │ │ │ │ workers/file-processing │◀───│ Redis :6379      │ │
│ └──────────┘ │ │ │ + Scanner               │    └──────────────────┘ │
└──────────────┘ │ └─────────────────────────┘                         │
                 └─────────────────────────────────────────────────────┘
```

| Componente | Papel | Onde roda |
|---|---|---|
| navegador | UI e fila de upload; envia as partes direto ao R2 | máquina do usuário |
| `apps/web` | UI, API, presign, autorização, webhook; agenda expurgo e reconciliação | Next.js na Cloudflare |
| R2 | bytes, e nada mais | Cloudflare |
| `apps/content` | preview: lê do R2 e serve com CSP, só por URL assinada | Cloudflare Worker em `CONTENT_ORIGIN` |
| Postgres | estrutura, permissão, estado, quota | Neon |
| `workers/file-processing` | hash, tipo, thumbnail, `.zip` e antivírus (`Scanner`) | container Node |
| Redis | fila BullMQ | mesmo host do container, operado pelo time |

Fora do desenho: Sentry (erros) e o Cron Trigger diário que dispara as rotinas do `apps/web`.
**Fronteiras invariáveis:** binário nunca passa por `apps/web`; preview nunca é servido do domínio
da sessão; o worker nunca acessa o Postgres — só pelo webhook assinado.

## 5. Estrutura e arquivos

```
apps/web/                 UI, rotas Hono, tRPC, presign, autorização, webhook, rotinas agendadas
apps/content/             preview: Cloudflare Worker que lê do R2 e serve com CSP
workers/file-processing/  jobs: hash, thumbnail, unzip, scan
packages/schemas/         Zod — a única definição de cada contrato
packages/lib/storage/     StorageClient (R2 + stub) — único pacote Node que conhece o provedor
packages/db/              schema Drizzle e migrações
packages/ui/              design system sobre shadcn/ui
```

**Regra invariável:** só `packages/lib/storage` importa o SDK; só `packages/schemas` define
contratos — o schema do banco fica em `packages/db`.

## 6. Modelo de dados

O storage guarda bytes; **estrutura, permissão e estado vivem no Postgres**: `node` (arquivo ou
pasta, `parent_id` + caminho materializado), `share` (usuário ou link com `token_hash`,
`expires_at`, `revoked_at`), `upload_session` e `job`. O `node` nasce no `complete`:
`processing → ready → trashed`, com `error` saindo de `processing`. Mover reescreve o caminho da
subárvore na mesma transação; mover para dentro de si mesmo é recusado.

## 7. Objetivo funcional

1. Enviar arquivos, pastas e `.zip` com progresso, pausa, retomada e cancelamento.
2. Organizar, buscar e recuperar da lixeira com a subárvore inteira.
3. Ver sem baixar, e compartilhar por convite ou link com **revogação imediata**.
4. Saber quanto espaço resta antes do limite.

## 8. Superfícies e fluxos

**8.1 Login** · **8.2 Explorer** — virtualizado, por cursor · **8.3 Upload** — fila com pausa ·
**8.4 Visualizador** · **8.5 Compartilhar** · **8.6 Link público** · **8.7 Lixeira** · **8.8
Busca**. **Estados de exceção:** sem rede → o upload pausa e retoma; sessão expirada → login
mantendo a fila; quota cheia (`QUOTA_EXCEEDED`) → bloqueio antes do presign; link revogado
(`SHARE_REVOKED`) → tela própria; nome repetido ao mover (`CONFLICT`) → sugere renomear; item sumido
ou sem acesso (`NOT_FOUND`, `FORBIDDEN`) → volta à pasta pai, com aviso; campo inválido
(`VALIDATION`) → erro no campo; restaurar em pasta apagada → vai para a raiz, com aviso; job em
`error` → o limite que falhou e reenviar. **Vazios:** pasta vazia convida a arrastar; busca vazia
sugere limpar filtros.

## 9. Motor de upload e confirmação

Upload é uma transação entre dois sistemas que divergem em silêncio: o presign cria
`upload_session` (URL de 15 min, partes de 8 MB, até 5 GB), o cliente envia as partes direto ao R2
com chave `u/{owner_id}/n/{uuid}`, e só o `complete` cria o `node`. Cancelar aborta o multipart no
bucket; crash entre `complete` e o registro deixa objeto órfão, resolvido pela reconciliação (§17),
nunca por retry cego no cliente.

## 10. Decisões difíceis de reverter

| Decisão | Escolha | Descartada | Custo | Migrar quando |
|---|---|---|---|---|
| Onde os bytes vivem | Cloudflare R2 | AWS S3 | ecossistema de eventos de bucket menor que o do S3 | precisar de replicação entre regiões ou o job de ciclo de vida passar de ~300 linhas |
| Processamento | BullMQ + Redis em container | Cloudflare Queues | operar Redis e o container | passar de ~10 mil jobs/dia |
| API | Hono com REST `/api/v1` e tRPC | só REST | duas superfícies sobre um schema | surgir o segundo consumidor externo |

## 11. Segurança

**A regra que rege o desenho:** o produto serve conteúdo hostil de volta pelo navegador; um `.svg`
servido do domínio da sessão rouba a conta de quem só abriu o preview. Preview só por `apps/content`
(URL assinada de 5 min, CSP, `nosniff`); tipo por magic bytes; liberado a terceiros só após a
varredura; `.zip` com limites checados durante a extração (100:1, 10 mil entradas, 20 GB, 32
níveis) e sem caminho `..`. **Negativo, com teste:** um usuário nunca lê `node` de outro por id.

## 12. Contratos de fronteira

Schemas só de `packages/schemas`; REST para quem é externo, tRPC (`node.*`, `upload.*`, `share.*`,
`quota.get`) para o front. Erros `{ error: { code } }`, conjunto fechado: `QUOTA_EXCEEDED`,
`NOT_FOUND`, `SHARE_REVOKED`, `FORBIDDEN`, `CONFLICT`, `VALIDATION`.
- `POST /api/v1/uploads[/:id/complete]` — presign idempotente por chave; o `complete` cria o `node`
- `DELETE /api/v1/uploads/:id` — cancela e aborta o multipart no bucket
- `POST /api/v1/shares`, `DELETE /api/v1/shares/:id` — convite, link e revogação
- `GET /api/v1/s/:token` — link público, sem sessão; devolve a URL assinada do preview
- `POST /api/v1/jobs/:id` — webhook do worker, assinado com HMAC
- `GET CONTENT_ORIGIN/n/:id?sig=…` — preview; aceita só a assinatura, nunca cookie

## 13. Fronteiras de estado e validação

Postgres é a verdade; TanStack Query reflete; Zustand guarda só estado de UI e a fila de upload.

## 14. Padrões de código

Comentar o porquê do hash no worker, do preview em domínio separado e da quota na transação — e,
no adaptador de storage, o gatilho de migração da §10.

## 15. Engenharia, CI e workflow

Repo novo, sem guias: CI exige lint, typecheck e testes; PR obrigatório; Conventional Commits.

## 16. Testes

Permissão, ancestralidade e quota no banco real (branch Neon); upload com pausa e retomada no
Playwright; `.zip` bomb; job idempotente por `idempotency_key` (3 tentativas e DLQ); explorer com
10 mil itens e no máximo 60 linhas no DOM. **Negativo:** bucket real e antivírus nunca rodam no CI.

## 17. Observabilidade

Log JSON com `request_id` propagado até o job. Métricas: `upload_complete_rate`,
`orphan_objects_found`, `job_failure_rate_by_type`, `quota_blocked_uploads`. A reconciliação diária
roda em `apps/web`, compara bucket e banco e reprocessa `node` preso em `processing` há mais de 1 h.
**Nunca logado:** nome de arquivo, conteúdo, token.

## 18. Escopo v1 vs Fase 2

**v1** — autenticação, explorer, upload, preview, compartilhamento com revogação, lixeira, busca,
quota e reconciliação. **Fase 2** — tempo real, edição colaborativa, versões de arquivo, i18n,
cobrança, moderação, app móvel, layout móvel, acessibilidade além do teclado e política pública de
versões da `/api/v1`. Condicionais absorvidas: upload (§9), sessão (§11), fila e performance (§16).

## 19. Inventário de variáveis e segredos

| Variável | Uso | Quem cria |
|---|---|---|
| `DATABASE_URL` | Postgres por ambiente | Neon |
| `BETTER_AUTH_SECRET` · `WEBHOOK_SIGNING_SECRET` · `PREVIEW_SIGNING_KEY` | sessão, webhook e URL de preview | gerar |
| `R2_ACCOUNT_ID` · `R2_BUCKET` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` | presign, worker e preview | Cloudflare |
| `CONTENT_ORIGIN` | domínio do `apps/content` | time |
| `REDIS_URL` · `SENTRY_DSN` | fila; erros na web e no worker | time (Redis); Sentry |

**Nenhuma credencial do R2, do banco ou dos segredos chega ao bundle do cliente** — provado por
`apps/web/tests/bundle-secrets.test.ts` no CI.

## 20. Resultado esperado

- [ ] Cancelar um upload aborta o multipart no bucket (§9)
- [ ] Nenhum binário atravessa `apps/web` — teste de integração (§4)
- [ ] Link revogado responde `SHARE_REVOKED` já na requisição seguinte (§12)
- [ ] Um usuário não lê `node` de outro por id (§11)
- [ ] `.zip` bomb é recusado com o limite nomeado (§11)

## Tarefas

1. **Meça antes de construir:** multipart de 2 GB numa conexão ruim, interrompido e retomado. **Se a
   retomada real falhar, o corte honesto é baixar o teto de 5 GB** para o que ela sustentar.
2. Spike do preview: um `.svg` hostil servido por `apps/content` não alcança o cookie da sessão.
3. Árvore, API e permissão (T1–T4); produto sem worker (T5–T7); worker e rotinas por último (T8–T9).

### T1 — Schema do banco
Arquivos: `packages/db/schema.ts`, `packages/schemas/node.ts`, `packages/db/schema.test.ts`
Interface: `moveNode(id, parentId)`, `reserveQuota(userId, bytes)`
Teste: mover para dentro de si mesmo falha; reservas concorrentes não estouram a quota
Pronto quando: a migração aplica numa branch Neon limpa e os testes passam

### T2 — Base da API: Hono, sessão, tRPC e login
Arquivos: `apps/web/app/api/[[...route]]/route.ts`, `apps/web/server/auth.ts`,
`apps/web/server/trpc.ts`, `apps/web/app/(auth)/login/page.tsx`, `apps/web/server/api.test.ts`
Interface: `appRouter` (tRPC), `requireSession(ctx)`
Teste: sessão revogada é recusada na requisição seguinte; rota sem sessão responde `FORBIDDEN`
Pronto quando: cadastro e login funcionam e o front chama um procedimento tRPC autenticado

### T3 — StorageClient e upload
Arquivos: `packages/lib/storage/r2.ts`, `packages/lib/storage/stub.ts`,
`packages/lib/storage/storage.test.ts`, `apps/web/server/uploads.ts`,
`apps/web/server/uploads.test.ts`
Interface: `StorageClient.presignPart/complete/abort`; `POST`/`DELETE /api/v1/uploads[/:id]`
Teste: quota cheia responde `QUOTA_EXCEEDED` sem emitir URL; cancelar apaga as partes no bucket
Pronto quando: nenhum corpo de requisição carrega bytes (teste de integração)

### T4 — Autorização e compartilhamento
Arquivos: `apps/web/server/policy.ts`, `apps/web/server/shares.ts`,
`apps/web/server/shares.test.ts`, `packages/ui/share-dialog.tsx`, `apps/web/app/s/[token]/page.tsx`
Interface: `can(user, action, node)`; `POST`/`DELETE /api/v1/shares`, `GET /api/v1/s/:token`
Teste: usuário não lê `node` alheio por id; link revogado responde `SHARE_REVOKED` na hora
Pronto quando: `can` é a única via de leitura de `node`, e o link revogado mostra a tela própria

### T5 — Explorer, organização e painel de upload
Arquivos: `apps/web/server/nodes.ts`, `apps/web/app/(drive)/[[...path]]/page.tsx`,
`packages/ui/explorer.tsx`, `packages/ui/upload-panel.tsx`, `apps/web/e2e/explorer.spec.ts`
Interface: `node.list(cursor)`, `node.move`, `node.rename`, `node.createFolder`, `node.trash`
Teste: 10 mil itens com no máximo 60 linhas no DOM; mover com nome repetido responde `CONFLICT`
Pronto quando: sem rede, sessão expirada e quota cheia mostram o estado e a ação na tela

### T6 — Busca, lixeira e quota
Arquivos: `apps/web/server/search.ts`, `apps/web/server/search.test.ts`, `apps/web/server/trash.ts`,
`apps/web/server/trash.test.ts`, `apps/web/app/(drive)/search/page.tsx`,
`apps/web/app/(drive)/trash/page.tsx`, `packages/ui/quota-bar.tsx`
Interface: `node.search(filtros, cursor)`, `node.restore(id)`, `quota.get()`
Teste: restaurar devolve a subárvore; a busca nunca retorna `node` de outro usuário
Pronto quando: busca filtra por nome, tipo e data e a quota avisa antes do limite

### T7 — Preview e visualizador
Arquivos: `apps/content/src/index.ts`, `apps/content/src/index.test.ts`,
`apps/web/server/preview-sign.ts`, `apps/web/app/(drive)/view/[id]/page.tsx`
Interface: `signPreview(nodeId, ttl)`; `GET CONTENT_ORIGIN/n/:id?sig=…`
Teste: `.svg` com script sai com CSP e `nosniff`; requisição sem assinatura, só com cookie, é negada
Pronto quando: nenhuma resposta de preview sai do domínio da sessão

### T8 — Worker e webhook
Arquivos: `workers/file-processing/jobs/process.ts` (com o `Scanner`),
`workers/file-processing/jobs/unzip.ts`, `workers/file-processing/jobs/process.test.ts`,
`apps/web/server/webhook.ts`, `apps/web/server/webhook.test.ts`, `apps/web/server/uploads.ts`
Interface: `enqueue('process', nodeId)` no `complete`; `Scanner.scan(key)`; `POST /api/v1/jobs/:id`
Teste: tipo declarado errado é corrigido; bomb aborta; webhook sem assinatura é recusado
Pronto quando: `node` só vira `ready` depois de hash, thumbnail e scan

### T9 — Expurgo e reconciliação agendados
Arquivos: `apps/web/server/cron/purge.ts`, `apps/web/server/cron/purge.test.ts`,
`apps/web/server/cron/reconcile.ts`, `apps/web/server/cron/reconcile.test.ts`
Interface: `runPurge()`, `runReconcile()`, disparados por Cron Trigger diário
Teste: objeto órfão é encontrado; item na lixeira há menos de 30 dias não é apagado
Pronto quando: a reconciliação expõe o que corrigiu em `orphan_objects_found`

### T10 — ARCHITECTURE.md
Arquivos: `ARCHITECTURE.md`
Interface: nenhuma — documento
Teste: os nós e as direções do Mermaid batem com a §4; nenhum componente fora da legenda
Pronto quando: tem componentes, fluxos, fronteiras invariáveis, o que o diagrama não mostra e a
linha "Atualize quando entrar ou sair um processo, serviço, store ou dependência externa — não a
cada feature"
