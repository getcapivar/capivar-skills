# Implementation plan template

The section catalog for the document `create-plan` produces. Read this file at step 5 of
`SKILL.md` — at compose time, not from memory. Paraphrasing this catalog from context is how a
document ends up with twenty generic sections.

The document is written in **PT-BR** (or the target repo's documentation language). Section titles
below are literal — copy them, accents included. The instructions around them are not part of the
output.

Each entry says what the section **must contain**, its **line budget**, and how it **fails**. Read
the failure before writing the section, not after.

---

## Size and style

**Target: ~200 lines.** Feature in an existing repo 80–150 lines; new application 180–280;
**ceiling 300**, counting the diagram and the tasks. A plan heading past 300 is two plans: GATE 2
offers the split. The reader is an engineer — or an agent — who must hold the whole plan in mind
at once; every line beyond that costs comprehension.

**Scale each section to its complexity** (the `brainstorming` rule): one line when the answer is
simple, up to the budget when it is nuanced, and YAGNI on everything else. A section that does not
apply to this project stays, in **one line saying why** — "Não se aplica: a biblioteca não loga;
logging é do consumidor." That line is informative; three paragraphs of nothing are not.

| Rule | Why |
|---|---|
| Hard-wrap prose and bullets at 100 columns; table rows never wrap | the file is reviewed as a diff |
| Each section is `## N. Título`; no `---` between sections | separators cost lines and add nothing |
| Cross-reference as `§N`, never "ver acima" | a pointer survives edits; "above" does not |
| Tables over prose whenever there are rows | one row per fact is the densest readable form |
| Fences only for the §4 diagram and, in an application, the §5 tree | anything else is prose or a table |
| **Zero implementation code** — function signatures are fine | the implementer writes the code with TDD |
| `- [ ]` only in §20 Resultado esperado | one checklist, one meaning |
| Backticks on every identifier, path, flag and env var | names must be greppable |

**Voice.** Imperative for instructions to the implementer ("Detecte antes de prometer", "Não
faça"). Impersonal present for facts. Avoid "deverá / será feito".

---

## Header block

Always present, in this order. No YAML front-matter: the date and slug live in the filename, and
the volatile status lives in the index table of `docs/plans/README.md`.

```md
# Plano — <Nome> (<2–3 dimensões difíceis, não a stack>)

**Contexto:** <o problema, em uma frase>. <O que motivou o plano agora>. <O resultado esperado,
observável>. <A assimetria de falha deste projeto: o que torna um erro aqui caro>.

**Base:** leitura do repo em <data>, commit <sha curto>.
```

`Contexto` fits in **2–4 lines**, and all four slots are filled. In greenfield there is no commit:
`**Base:** projeto novo — não há repositório a ler; escrito em <data>.`

The title's parenthetical names the **hard dimensions**, not the stack: "(geração local e
sincronização com a web)" — not "(Electron + React)". Every hard dimension in the title and every
risk in `Contexto` is answered by a section in the body.

**Nota de terminologia** *(conditional — 2–4 lines, right after the header)*: only when the request
used a wrong or ambiguous term, or one that collides with the target's `CONTEXT.md`. Say what the
term means here, what the request said, and the cost if the other reading was intended. Never
fabricated; never a silent correction in the body.

---

## Core sections

A section is core when the **question** it answers exists in anything buildable. The Parts group
the catalog; the document does not print them as headings.

### Parte I — Fundamentos

**1. Decisões fechadas (não se rediscute; registre como ADR)** — *3–10 rows*
Table `Decisão | Escolha | Razão curta`, holding every decision already made. The 1–3 that are hard
to reverse go to §10 instead. **Fails if** a reason is circular or a virtue rather than a trade-off
("é a melhor opção", "é o padrão do mercado", "é mais moderno"), or if a decision stated in the body
is missing here. In brownfield, decisions already in ADRs or guides are cited, not reopened.

**2. Stack obrigatória** — *table of 3–8 rows + 1 line*
Table `Camada | Tecnologia`, the cell carrying what matters (mode, flag, pin), then one line of
**Política de versões**. **Fails if** it states a version not read from the manifest, Context7 or
the registry — state the policy instead. In brownfield, say only what is **added**, or "nada além
do que o repo já usa".

**3. Reuso obrigatório e trabalho novo** — *2–8 lines*
Brownfield: `Reuso` (real paths, what each covers), `Novo` (with `§N` pointers) and `Fallback` (an
environment where a piece cannot run, and the stub that exercises the same contract). Greenfield:
"Peças a construir" plus the fallback rule. **Fails if** greenfield lists anything as reused, or a
reused path was not verified on disk — that sends the implementer looking for something that is not
there.

**4. Arquitetura do sistema** — *feature up to ~15 lines; application up to ~35*
An ASCII box-drawing diagram of the **runtime topology** — each process, service and store drawn
inside the boundary that hosts it (host, container, network, device), with its port or address, and
arrows for the direction of traffic. Below it, `Componente | Papel | Onde roda` as the legend, and
one line of **Fronteiras invariáveis**: the 2–4 arrows that may never exist. **Fails if** it draws
layers instead of processes ("Frontend → Backend → Banco" is not a topology), or a box has no legend
row. A single-process system draws one box, its external dependencies and the boundary it never
crosses. This section shows *where things run*; §9 explains *how the hard part works*. The last task
turns it into `ARCHITECTURE.md` (Mermaid), so name the nodes and give the arrows a direction.

```
┌─ <fronteira: VPS, cluster, dispositivo> ───────────────────┐
│  ┌──────────┐      ┌──────────┐     ┌────────────────────┐ │
│  │ <proc A> │─────▶│ <proc B> │     │ <fronteira interna>│ │
│  │  :<port> │      │  :<port> │     │  ┌──────┐ ┌──────┐ │ │
│  └──────────┘      └──────────┘     │  │<svc> │ │<store│ │ │
│       │                             │  └──────┘ └──────┘ │ │
└───────┼─────────────────────────────┴────────────────────┴─┘
        │ <protocolo>
        ▼
  ┌───────────┐
  │ <cliente> │
  └───────────┘
```

Notation, not a system: replace every placeholder or the section fails.

**5. Estrutura e arquivos** — *feature: up to 8 lines; application: tree of up to 15 lines*
A feature lists the paths it creates or touches, each with what it owns. An application gets an
ASCII tree in a fence. In brownfield, mark each node `(NOVO)` or `(EXISTENTE)`. Always close with
one line of **Regra invariável** naming the boundaries that may never be crossed. **Fails if** a
brownfield entry is unmarked — the marks are the scope boundary.

**6. Modelo de dados** — *1–6 lines*
One sentence on the nature of the model (cache? source of truth? queue?), the entities and their
role, and the integrity rules with the consequence of breaking each. **Fails if** it pads when
there is no new persistent state — then say which existing entities are touched and that none
changes shape.

### Parte II — Produto

**7. Objetivo funcional** — *3–6 numbered lines*
What the user can do, in their voice, verb first, ordered by priority. **Fails if** it names
features ("módulo de biblioteca") instead of capabilities ("ver na web o que criou no desktop").

**8. Superfícies e fluxos** — *2–8 lines*
One `**8.N Nome** — …` entry per screen, command, route or exported API (short entries may share a
line, joined by `·`), then **Estados de exceção** (no network, expired session, missing resource,
failed operation, conflict — each with its action, and every error code of §12 covered) and, where
there are lists, one of **estados vazios**. **Fails if** the exceptions are missing, or a screen
absent from the mocks is invented instead of marked "**Não existe nos mocks**".

### Parte III — Núcleo técnico

**9. Motor de \<o núcleo\>** — *2–6 lines*
One sentence declaring the core architecture, then the invariants, each with the cost of breaking
it, including crash and cancellation. **Fails if** you cannot name the crux. If the project has no
hard part, say so in one line — that is the most valuable finding in the document.

**10. Decisões difíceis de reverter** — *table of 1–3 rows*
Table `Decisão | Escolha | Descartada | Custo | Migrar quando`. A decision belongs here only when
all five hold: changing it means rewriting a subsystem; there are 3+ real alternatives; the winner
charges a price; the reader will question it; and a future condition would reverse it. **Fails
if** the cost is empty, the discarded option is a strawman, or the trigger is not observable
("quando ficar grande"). At least one trigger in the document is numeric ("passar de ~500 linhas",
"a segunda classe de bug de ordering"). With no disputed decision, one line saying why.

**11. Segurança** — *2–5 lines*
Opens with **A regra que rege o desenho**: this project's dominant threat and what an attacker gains
if it is ignored. Every line below follows from it; at least one is a negative, verified by a test.
**Fails if** it is a generic OWASP list.

**12. Contratos de fronteira** — *2–10 lines*
One line per contract (route, channel or command — who calls, what enters, what leaves, what is
idempotent), where the types come from, and the error envelope with a **closed set** of codes.
**Fails if** the code set is open-ended or a body appears — signature and behaviour in prose only.

### Parte IV — Implementação

**13. Fronteiras de estado e validação** — *1–4 lines*
Who is the source of truth and who merely reflects it, per layer. **Fails if** it restates what the
tools do instead of this project's ownership.

**14. Padrões de código** — *1–4 lines*
Only this project's counterintuitive decisions that need a comment: "por que \<A\>, por que \<B\>
e onde está o gatilho para deixar de ser". **Fails if** it lists generic rules.

**15. Engenharia, CI e workflow** — *1–4 lines*
The repo's guides that actually exist, with the precedence between them, plus what is specific to
this target (runners, artefacts, signing, platform matrix). With no guides: the minimum — CI gate,
branch policy, commit format. **Fails if** it cites a guide that does not exist.

### Parte V — Qualidade

**16. Testes** — *2–6 lines*
The boundaries where being wrong is expensive, the critical end-to-end flows, the central invariant,
and at least one **negative** ("GPU nunca é requisito de CI"). **Fails if** it says "escreva testes
unitários e de integração".

**17. Observabilidade** — *1–4 lines*
Structured logs and the identifier that correlates both ends; 3–5 **named** metrics, including the
one that reveals the real cost or failure driver; and one **negative** — what is never logged (file
contents, tokens). **Fails if** metrics are categories. A library answers in one line: "não loga —
logging é do consumidor".

### Parte VI — Entrega

**18. Escopo v1 vs Fase 2** — *2–4 lines*
`**v1** — <lista corrida>` and `**Fase 2** — <o que fica de fora>`, including the conditional
sections evaluated and discarded that a reader might think were forgotten, and — when the grill
left any — one line of **Perguntas em aberto**. **Fails if** Fase 2 is empty — if nothing was cut,
there was no scope.

**19. Inventário de variáveis e segredos** — *table of up to 6 rows + 1 line*
`Variável | Uso | Quem cria`, then one bold line naming what is **never** embedded and the test
that proves it. **Fails if** any secret appears with a value. "Nenhuma variável" is a valid answer,
stated.

**20. Resultado esperado** — *3–8 checkboxes*
A `- [ ]` checklist, each item observable by a human and pointing at a section. **Fails if** an item
is not demonstrable ("app bem arquitetado" fails; "geração local não debita créditos, coberto por
teste ponta a ponta" passes).

### Parte VII — Tarefas

Printed in the document as `## Tarefas`, unnumbered, after §20. `/subagent-driven-development`
reads **this** part: it hands each task's full text to an implementer subagent that sees nothing
else and writes the code test-first. So a task carries **what** and **how to know it is done** —
never the code.

**Opens with the order of execution** — *3–6 numbered lines*, ordered by risk. **Item 1 is not
code**: an external dependency to close, a measurement to take, or a spike that tests the central
hypothesis — never a decision still open, which belongs in §18 `Perguntas em aberto`. At least one
item carries the honest cut ("se \<a hipótese central\> se mostrar inviável, o
corte honesto é \<a alternativa\>"). **Fails if** item 1 is "crie o projeto" or "instale as
dependências".

**Then the tasks** — *4–6 lines each, heading not counted*. A task is the smallest unit with its own
test cycle that a reviewer could reject on its own; fold setup and config into the task that needs
them.

```md
### T<N> — <verbo + resultado>
Arquivos: <criar/modificar, caminhos exatos>
Interface: <assinaturas que outras tarefas consomem ou produzem>
Teste: <o que o teste prova, incluindo um caso negativo — escrito antes do código>
Pronto quando: <critério observável>
```

**Fails if** a path is not exact (no globs, no "testes ao lado"); a task has no negative test case,
implements something from Fase 2 or rests on a question still under `Perguntas em aberto`; uses a
name not defined by that task or an earlier one; says "igual à T\<N\>" (the implementer reads tasks
out of order); or contains TBD.

**The last task is always `ARCHITECTURE.md`.** It creates `<target>/ARCHITECTURE.md` from §4: the
same nodes and directions in a Mermaid block, the component table, the main flows, the invariant
boundaries, what the diagram leaves out, and the line "Atualize quando entrar ou sair um processo,
serviço, store ou dependência externa — não a cada feature". It is a task, not an output of the
plan: the file describes a system that only exists once the tasks before it have run.

---

## Conditional section library

Walk this table answering yes/no to every trigger **before writing**. A conditional section is
numbered after §20 (§21, §22…) and gets **1–6 lines**. A triggered conditional whose content fits
in 1–2 lines of a core section may be **folded** there instead — name the target section in the
GATE 1 map. Every one you discarded that a reader might miss (i18n, payments, real-time) becomes a
word in Fase 2 — silent omission reads as forgetting.

| Section | Inclua quando | Falha se |
|---|---|---|
| Fidelidade visual e design system | há mock/Figma/produto de referência, ou um DS a respeitar | não diz o que **não** copiar |
| Componentização | a superfície tem 3+ vistas que compartilham elementos | não nomeia as vistas que usam o mesmo componente |
| Superfície de linha de comando | o produto é invocado por terminal | omite códigos de saída, stdout vs stderr e comportamento sob pipe |
| Upload e armazenamento | recebe bytes do usuário ou persiste binários | não diz o esquema da chave, a validade da URL assinada e o que nunca passa pelo banco |
| Autenticação e sessão | existe identidade ou dado por usuário | não diz **onde a autorização é revalidada** |
| Autorização e multi-tenancy | dois usuários/orgs veem dados diferentes na mesma instância | falta o teste de vazamento cross-tenant no CI |
| Fila e workers | operação acima de ~1s, fora do request, ou com retry | omite idempotência por chave, DLQ e reconciliação de trabalho preso |
| Tempo real | dois clientes veem a mudança sem recarregar | ignora fallback, reconexão e autorização do canal — costuma ir para a §10 |
| Sincronização e offline | existe cópia local que pode divergir da remota | lista ferramentas antes de caracterizar o conflito — quase sempre vai para a §10 |
| Integração com IA/LLM | o produto chama ou hospeda um modelo | omite teto de custo e quais dados do usuário nunca vão ao provedor |
| Pagamentos e cobrança | dinheiro muda de mãos ou há plano pago | não nomeia a fonte de verdade nem a idempotência do webhook |
| Processo externo gerenciado | o app sobe/baixa/gerencia binário de terceiro | promete antes de detectar; sem hash; sem cancelamento real |
| Migração de dados legados | dados existentes precisam do formato novo | sem volume com número, sem reversão, sem destino do que não migra |
| Notificações e e-mail | o sistema fala com o usuário fora da sessão | sem opt-out e sem rate limit por destinatário |
| Moderação | usuários publicam conteúdo visível a terceiros | sem takedown auditado |
| Performance | há caminho quente, limite de recurso ou volume que cresce | usa adjetivo em vez de orçamento numérico |
| Acessibilidade | existe interface humana (GUI, TUI ou CLI) | não nomeia a operação longa que anuncia status; CLI esquece `NO_COLOR` |
| Responsividade e janela | viewport variável ou janela redimensionável | desktop não valida a posição restaurada contra os monitores atuais |
| i18n e localização | mais de um idioma ou formatação por locale | não diz o que **não** se traduz |
| Custo operacional | o custo varia com o uso (GPU, tokens, egress) | não nomeia o driver de custo nem o teto |
| Empacotamento e distribuição | instalado na máquina de terceiro | omite assinatura — sem ela o instalador é barrado |
| Compatibilidade pública | alguém que você não deploya consome a interface | sem política de quebra nem janela de depreciação |
| Rollout e feature flags | a mudança não pode atingir toda a base de uma vez | sem critério de avanço e de rollback |

---

## Anti-generic rules

Checked by [review-checklist.md](review-checklist.md) before the file is presented.

1. **Name-swap test.** Every section holds at least one claim that would be false in another
   project. If it still reads fine with the product name swapped, rewrite it or cut it to one line.
2. **Evidence provenance.** Every claim traces to a file you read (cite the path), an answer the
   user gave, a lookup you performed, or a trade-off argued in the document itself.
3. **Numbers, not adjectives.** "rápido", "escalável", "robusto", "seguro", "moderno" are banned
   without a number or an invariant behind them.
4. **The consequence, not the rule.** "…com **cada** elemento interativo marcado `no-drag` —
   esquecer isso torna botões inclicáveis" beats "marque elementos com `no-drag`".
5. **Mark what does not exist.** Write "não existe nos mocks" or "não verificado"; never invent.
6. **Banned phrases:** the sweep in [review-checklist.md](review-checklist.md) is the single list —
   "boas práticas", "código limpo", "conforme necessário", "TBD", "etc." and the rest.

---

## Calibration example

[example-drive-clone.md](example-drive-clone.md) is a full greenfield plan in this format — a
Google Drive clone at ~290 lines — a full product, close to the 300 ceiling on purpose: all 20
sections, §10 as a table and ten tasks without code. Calibrate **form** against it, never length: a
feature plan comes out at 80–150. **Do not
read it by default:** the catalog above is the authority. Open it to calibrate one thing the rule
alone does not settle — how short a section can honestly be, or what a task without code looks
like.
