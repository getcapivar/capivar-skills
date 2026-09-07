# Implementation plan template

The section catalog for the document `create-plan` produces. Read this file at step 5 of
`SKILL.md` — at compose time, not from memory. Paraphrasing this catalog from context is how a
document ends up with twenty generic sections.

The document is written in **PT-BR** (or the target repo's documentation language). Section titles
below are literal — copy them, accents included. The instructions around them are not part of the
output.

Every section entry has three lines, and the third does the most work:

- **Inclua quando** — the observable trigger. Never "if it makes sense".
- **Precisa conter** — the minimum that makes the section worth its space.
- **Falha se** — the specific failure mode of *this* section. Read it before writing the section,
  not after.

---

## Style rules

Every rule below was derived by measuring the reference document, not by taste.

| Rule | Evidence in the reference |
|---|---|
| Hard-wrap prose, bullets and blockquotes at 100 columns | 216 lines at 90–99 col; only 7 above 100 |
| Table rows **never** wrap — one logical row, one physical line | table rows run to 187 columns |
| `---` between every `##` section | 29 horizontal rules for 28 sections |
| Emoji: **only** 🥇🥈🥉, **only** in ranking headings | 6 emoji in 716 lines |
| `- [ ]` checklists only in Resultado esperado **and** in the Parte VII tasks | 12 checkboxes, 100% in one section, before Parte VII existed |
| Parts I–VI: fenced blocks only for two-dimensional structure (architecture diagram, file tree, state machine) | 2 blocks in 716 lines, before §4 existed |
| **Zero implementation code in Parts I–VI** — and code **required** in Parte VII | the decision sections must stay free to design; the tasks must be runnable |
| Bold ~1 span per 20 words; backticks on every identifier, path, flag, package | 299 bold / 154 code spans |
| Number every `##`; cross-reference always as `§N`, never "ver acima" | 24 uses |
| Second person reserved for the honest-cost line — max 2 per document | 1 occurrence in 6,107 words |
| At most one memorable maxim per hard section | two become rhetoric |

**Voice.** Imperative for instructions to the implementer ("Detecte antes de prometer", "Não faça").
Impersonal present for facts ("O corpo do app é idêntico nas duas plataformas"). Avoid
"deverá / será feito" — prefer imperative or present tense.

**Size targets.** Full application 400–750 lines (ceiling 850). Feature in an existing repo 150–320
lines (ceiling 400). Ordinary section 60–300 words, **ceiling 400** — no non-ranking section in the
reference exceeds 305. Ranking section 350–750 words.

**What the ceilings do not count.** The §4 diagram fence is excluded from both the word ceiling and
the line ceiling — the prose around it gets its own budget of 150 words. **Parte VII is excluded
from the line ceiling entirely:** it scales with the work to be done, not with how much there is to
say. A plan whose tasks are long is not padded; a plan whose *sections* are long usually is.

**The per-section ceiling is the one that bites.** The document-level number scales with how many
sections the product genuinely earns — a 30-section application with three five-option rankings
lands near 850 without a word of padding, and [example-drive-clone.md](example-drive-clone.md) is
exactly that. Treat a document over the ceiling as a prompt to re-run the deletion test on every
section, not as a licence to cut something that passed it.

**Compression, not omission.** The spine is the same in both cases: §1–§20 across Parts I–VI,
then the tasks of Parte VII. In a feature plan several sections collapse to one or two sentences —
the degenerate form is legitimate and informative
("a biblioteca não loga; logging é do consumidor"). What changes between a feature and an
application is the size ceiling, not the section list.

---

## Header block

Always present, in this order. No YAML front-matter: the date and slug live in the filename, and
the volatile status lives in the index table of `docs/plans/README.md`. A `status:` field inside
the file is a field nobody updates.

```md
# Plano — <Nome> (<3–4 dimensões difíceis, não a stack>)

**Papel:** atue como <senioridade e especialidade>, com forte experiência em
<especialização 1>, <especialização 2> e <especialização 3>.

**Missão:** <verbo> o **`<caminho/do/entregável>`** — <o que é, para quem, em que plataforma> —
cujo <invariante diferenciador em uma oração>.

**Mentalidade de produção:** <a assimetria de falha DESTE projeto, em 2-4 frases: o que torna um
erro aqui diferente de um erro em outro lugar>. Cada decisão de arquitetura precisa de razão
explícita, cada fronteira precisa de contrato tipado, e cada caminho de falha precisa de um
estado previsto.

**Base:** leitura do repo em <data>, commit <sha curto>.
```

Two rules that keep the header from dehydrating into decoration, both verifiable:

- **Every specialization named in `Papel:` has a corresponding section in the body.** In the
  reference, 5 of 5 map. The Papel is the index of the hard parts, not flavor text.
- **Every sentence of `Mentalidade de produção:` is implemented by a section.** 3 of 3 in the
  reference. If a sentence has no section, either write the section or delete the sentence.

The parenthetical qualifiers in the title are the **hard dimensions**, not the stack:
"(Electron, geração local e sincronização com a web)" — not "(Electron + React)".

### Nota de terminologia *(conditional)*

**Inclua quando:** the original request used a wrong or ambiguous term, or one that collides with
the target's `CONTEXT.md`.

**Precisa conter:** what the term means here, what appeared in the request, and the consequence if
the other reading was intended ("isso é escopo novo: outro modelo, outro custo — e exige documento
próprio").

**Falha se:** fabricated. Inventing a terminology note where there was no real slip is worse than
omitting it. Also fails if the correction is made silently in the body — a silent correction hides
a real misunderstanding from the person who made it.

```md
> **Nota de terminologia.** Este documento trata de **<termo correto>**. O termo "<termo do
> pedido>" apareceu no pedido original e <foi confirmado como lapso / significa outra coisa aqui>.
> Se a intenção for <a outra leitura>, isso é escopo novo: <o custo concreto> — e exige documento
> próprio.
```

### Sumário *(conditional)*

**Inclua quando:** the document has 15+ sections **or** 400+ lines.

**Precisa conter:** the Parts, with sections separated by `·`, rankings in bold.

**Falha se:** written before the body. **Generate it last, from the real headings.** Below the
threshold it is pure maintenance cost — omit it.

---

## Core sections

Grouped in six Parts. A section is core when the **question** it answers exists in anything
buildable; when the whole *subject* may not exist (upload, auth, i18n), it is conditional.

### Parte I — Fundamentos

#### 1. Decisões fechadas (não se rediscute; registre como ADR)

**Precisa conter:** a table `Decisão | Escolha | Razão curta` holding every decision already made,
here and nowhere else. Decisions that satisfy the five ranking criteria do NOT belong here — they
become their own section.

**Falha se:** a "Razão curta" is circular ("usamos X porque X é bom"), or is a virtue rather than a
trade-off. Banned reasons: "é a melhor opção", "é o padrão do mercado", "é mais moderno", "é o que
todo mundo usa". Also fails if a decision stated in the body is missing from this table.

In brownfield, decisions already recorded in ADRs or guides are **cited, not reopened**.

#### 2. Stack obrigatória

**Precisa conter:** a table `Camada | Tecnologia`, where the technology cell carries the
qualification that matters (mode, flag, exact pin). Then a **Política de versões** paragraph naming
each deliberate exception *with its reason*.

**Falha se:** it lists version numbers that were not read from the manifest, Context7 or the
registry. A hallucinated version is worse than no version — it gets pinned into a manifest and
breaks the build on install. State policy, not numbers, when unverified.

In brownfield, say what is **added**; if nothing is added, write that — "nada além do que o repo já
usa" is a negative constraint, and it only exists if written.

#### 3. Reuso obrigatório e trabalho novo

**Precisa conter:** `3.1 Reuso obrigatório (não reescrever)` with real paths and what each piece
covers; `3.2 Novo` with cross-references; `3.3 Regra de fallback` naming a concrete environment
where a piece cannot run (CI without GPU, sandbox without network) and the stub that exercises the
same contract.

**Falha se:** greenfield and §3.1 exists at all — a reuse list in a greenfield document is fiction.
In brownfield, fails if any path under §3.1 was not verified to exist by reading the filesystem. A
reuse list naming a package that is not there is the worst failure this document can produce: it
sends the implementer looking for something that does not exist.

#### 4. Arquitetura do sistema

**Precisa conter:** an ASCII box-drawing diagram in a fence showing the **runtime topology** — every
process, service and store that runs, drawn *inside the boundary that hosts it* (host, container,
network, device), each with the port or address it answers on, and arrows carrying the direction of
traffic. Below it a `Componente | Papel | Onde roda` table that is the drawing's legend, and a
bolded **Fronteiras invariáveis** naming the 2–4 arrows that may **never** exist.

**Falha se:** the diagram draws layers instead of processes — "Frontend → Backend → Banco" is a
truism, not this system's topology, and it fails the name-swap test. Also fails when a box in the
drawing has no row in the legend, or when a component named elsewhere in the document is missing
from the drawing.

**Degenerate form, legitimate:** a single-process system draws its own box, the external
dependencies it talks to, and the boundary it never crosses. Saying that is worth more than
inflating it into three fictional tiers.

**Boundary against §9.** This section shows *where things run*; §9 (`Motor de <o núcleo>`) explains
*how the hard part works*. Restating the engine here is padding.

**Destination.** The last task in Part VII converts this diagram into `<target>/ARCHITECTURE.md`
(Mermaid) during implementation. Draw it to survive that translation: named nodes, explicit
directions, no decoration.

```
┌─ <fronteira que hospeda: VPS, cluster, dispositivo> ───────────────┐
│                                                                    │
│  ┌──────────┐      ┌──────────┐      ┌─────────────────────────┐   │
│  │ <proc A> │─────▶│ <proc B> │      │ <fronteira aninhada>    │   │
│  │  :<port> │      │  :<port> │      │  ┌───────┐  ┌────────┐  │   │
│  └──────────┘      └──────────┘      │  │ <svc> │  │<store> │  │   │
│        │                             │  │ :<p>  │  │ :<p>   │  │   │
│        │                             │  └───────┘  └────────┘  │   │
│        │                             └─────────────────────────┘   │
└────────┼───────────────────────────────────────────────────────────┘
         │ <protocolo>
         ▼
   ┌─────────────┐
   │ <cliente>   │
   └─────────────┘
```

The skeleton above is **notation, not a system**: nested boundaries, one box per process, the port
on the box, the protocol on the arrow. Replace every placeholder or delete the section.

#### 5. Estrutura e arquivos

**Precisa conter:** an ASCII tree in a fence, each node annotated with what it owns, and in
brownfield each node marked `(NOVO — <por que existe>)` or `(EXISTENTE — <o que ganha>)`. Closes
with a bolded **Regra invariável** naming the 3–4 boundaries that may never be crossed.

**Falha se:** the brownfield tree is unmarked. The marks are not annotation — they are the scope
boundary, and an unmarked tree is unreviewable.

#### 6. Modelo de dados

**Precisa conter:** one sentence on the nature of the model and the deliberate difference from what
the reader would assume (is it a cache? a source of truth? a queue?). Then `Entidade | Papel`, then
**Regras de integridade** as bullets, each with the concrete consequence of violating it.

**Falha se:** there is no new persistent state and the section is padded anyway. Say so, and say
which existing entities are touched and what does **not** change shape.

### Parte II — Produto

#### 7. Objetivo funcional

**Precisa conter:** a numbered list in the user's voice, verb first, ordered by priority, with the
consequence the user perceives. This is the only place the product appears without technology.

**Falha se:** it names features instead of capabilities ("Módulo de biblioteca" instead of "Ver na
web o que criou no desktop"). Without this section the document is a shopping list of stack.

#### 8. Superfícies e fluxos

**Precisa conter:** the reference to the visual/design source if one exists; one bullet per surface
(`**8.N Nome** — …`) shaped to the product type (screens, commands, routes, exported API); and a
final **mandatory** sub-section `8.N Estados de exceção` listing no-network, expired session,
missing resource, full disk, failed operation, conflict — each with a clear action, never a dead
end. Where the product has list surfaces, a second sub-section for **estados vazios** — they are
the screens a new user sees *first*, and treating them as absence of content rather than as screens
is what makes a product look broken in its first minute.

**Falha se:** the exception sub-section is absent. A surface without its exception states is a wish
list. Also fails when a screen missing from the mocks is silently invented instead of marked:
"**Não existe nos mocks**: desenhe no vocabulário do DS e registre em `docs/design/…`".

### Parte III — Núcleo técnico

#### 9. Motor de \<o núcleo\>

**Precisa conter:** one sentence declaring the core architecture ("Uma interface, três
implementações, escolhidas em runtime. Quem chama não sabe qual está ativa."), a table of modes when
there is more than one path, and bullets of invariants — each with the cost of violating it,
including what happens on crash and on cancellation.

**Falha se:** you could not name the crux. If the project has no genuinely hard part, say that
explicitly — it is the most valuable finding in the document. Do not pad the section to hide it.

#### 10. \<Decisão\> — ranking e escolha *(slot, 1..N)*

See "The ranking pattern" below. **Floor: at least one ranking**, or an explicit sentence in §1
stating why no decision in this project is disputed. **Ceiling: four.**

#### 11. Segurança

**Precisa conter:** open with a bolded **A regra que rege o desenho** naming *this project's*
dominant threat, concretely, with what an attacker gains if it is ignored. Every bullet below it
follows from that threat. At least one bullet is a negative, verified by a test.

**Falha se:** it is a generic OWASP list with no named threat. Bullets that would appear unchanged
in any other project are filler.

#### 12. Contratos de fronteira

**Precisa conter:** how the boundaries are organized (namespaces, route versioning); one line per
contract (route, channel or command — who calls, what enters, what leaves, what is idempotent);
where the types come from, single-sourced; the error envelope with a **closed set** of codes; and
what never crosses this boundary directly.

**Falha se:** the error code set is open-ended, or a second vocabulary of codes is allowed to exist.
Also fails if it contains a function body — signature and behavior in prose, never implementation.

### Parte IV — Implementação

#### 13. Fronteiras de estado e validação

**Precisa conter:** a table `Camada/Ferramenta | Responsabilidade` and a paragraph of **strict
separation** naming who is the source of truth and who merely reflects it.

**Falha se:** it restates the tools' own documentation. The content is *this project's* ownership
boundaries, not what Zustand or Redis are for.

#### 14. Padrões de código

**Precisa conter:** 2–4 sentences of writing rules, closing **mandatorily** with the list of this
project's counterintuitive decisions that need a comment: "**Comentário explica o porquê**,
sobretudo: por que \<A\>, por que \<B\> e onde está o gatilho para deixar de ser".

**Falha se:** it stops at the generic rules. This is a section generic by nature — the closing list
is the only thing that saves it.

#### 15. Engenharia, CI e workflow

**Precisa conter:** the repository's guides **that actually exist**, each with its scope; the
**Regra de precedência** for conflicts between them; and what is specific to this target (runners,
cache, artifacts, signing, platform matrix).

**Falha se:** it cites guides that do not exist in the target repo, or reproduces their content
instead of pointing at them. When there are no guides, declare the minimum — CI gate, branch policy,
commit format. That is a decision, not an omission.

### Parte V — Qualidade

#### 16. Testes

**Precisa conter:** the boundaries where being wrong is expensive, named specifically, one invariant
each; the critical end-to-end flows; the central invariant that, if false, means the product is
wrong; and at least one **negative** ("GPU nunca é requisito de CI").

**Falha se:** it says "escreva testes unitários e de integração". Without the negative, CI ends up
carrying a requirement nobody can actually run.

#### 17. Observabilidade

**Precisa conter:** structured logs and the identifier that correlates the two ends; where they go
and how they rotate; 3–5 **named** metrics, including the one that reveals the real cost or failure
driver; and the exportable diagnostic.

**Falha se:** the metrics are categories ("métricas de performance") instead of names. For a library
the degenerate form is real and correct: "a biblioteca não loga — logging é do consumidor".

### Parte VI — Entrega

#### 18. Escopo v1 vs Fase 2

**Precisa conter:** `**v1** — <lista corrida>` and `**Fase 2** — <o que fica de fora>`, including
every conditional section you evaluated and discarded that the reader might otherwise think you
forgot, plus the migrations whose triggers live in the ranking sections. Close with one sentence on
how Fase 2 fits without structural rework.

**Falha se:** Fase 2 is empty. **If nothing was cut, there was no scope** — go back and cut.

#### 19. Inventário de variáveis e segredos

**Precisa conter:** what the system knows by configuration (`Variável | Uso | Quem cria`) and a
bolded paragraph naming what is **never** embedded, with the test that verifies it.

**Falha se:** any secret appears with a value. Also fails if the "nunca embarcado" list is empty for
anything distributed to a third party's machine. "Nenhuma variável — configuração por parâmetro" is
itself a valid decision, stated.

#### 20. Resultado esperado

**Precisa conter:** a `- [ ]` checklist — the only one in Parts I–VI — where every item is
observable by a human and maps to a section. The Parte VII tasks carry checkboxes too; nothing else
does.

**Falha se:** an item is not demonstrable. "App bem arquitetado" fails; "Geração local não debita
créditos, coberto por teste ponta a ponta" passes.

---

### Parte VII — Tarefas de implementação

The executable body of the plan. `/subagent-driven-development` reads **this** part: it extracts
every task with its full text and dispatches one subagent per task, so a task that is not complete
on the page is a task nobody can run.

**Two rules invert here.** Fenced implementation code is **required** inside the step blocks, and
`- [ ]` checkboxes are expected on every step. Both are banned in Parts I–VI; both are mandatory
here.

#### Preâmbulo — ordem de execução

Opens Part VII. A numbered sequence, ordered by risk, whose **item 1 is not code** — an external
dependency to close, a measurement to take, or the decision that must exist first. At least one
item carries the honest cut ("Se \<a hipótese central\> se mostrar inviável, o corte honesto é
\<a alternativa\>").

**Falha se:** item 1 is "crie o projeto" or "instale as dependências". If the first step is
scaffolding, the order was not thought about — the whole point is to front-load the risk. Also
fails if any task implements something from Fase 2 (§18), or rests on a question still listed under
`Perguntas em aberto` — a task built on an unanswered question is rework with verification steps
attached.

#### Cabeçalho do plano

Sits above the first task:

```md
> **Para agentes:** SUB-SKILL OBRIGATÓRIA — use `subagent-driven-development` para executar este
> plano tarefa a tarefa. Os passos usam `- [ ]` para rastreamento.

**Global Constraints** — <as exigências que valem para o projeto inteiro: pisos de versão, limites
de dependência, regras de nomenclatura e de copy, requisitos de plataforma. Uma linha cada, com os
valores exatos copiados das §2 e §15. Os requisitos de toda tarefa incluem esta seção.>
```

#### Right-sizing

A task is the smallest unit that carries its own test cycle and is worth a fresh reviewer's gate.
Fold setup, configuration, scaffolding and documentation into the task whose deliverable needs
them; split only where a reviewer could meaningfully reject one task while approving its neighbour.
Each task ends with an independently testable deliverable.

Each **step** inside a task is one action of 2–5 minutes: write the failing test · run it and watch
it fail · write the minimal implementation · run it and watch it pass · commit.

#### Forma da tarefa

```md
### Tarefa N: <Componente>

**Files:**
- Create: `caminho/exato/do/arquivo.ts`
- Modify: `caminho/exato/existente.ts:123-145`
- Test: `tests/caminho/exato/arquivo.test.ts`

**Interfaces:**
- Consumes: <o que esta tarefa usa das anteriores — assinaturas exatas>
- Produces: <o que as posteriores dependem — nomes de função, tipos de parâmetro e de retorno. Quem
  implementa vê apenas a própria tarefa; este bloco é como ela aprende os nomes das vizinhas.>

- [ ] **Passo 1: escreva o teste que falha** — <bloco de código com o teste real>
- [ ] **Passo 2: rode e confirme a falha** — Run: `<comando exato>`; Expected: FAIL com "<mensagem>"
- [ ] **Passo 3: implementação mínima** — <bloco de código com a implementação>
- [ ] **Passo 4: rode e confirme que passa** — Run: `<comando exato>`; Expected: PASS
- [ ] **Passo 5: commit** — <bloco com `git add` dos caminhos exatos e a mensagem de commit>
```

The `<bloco de código>` placeholders are literal blocks in the produced document, not prose about
them. A step that describes what to do without showing how is not a step.

#### Sem placeholders

Every step carries the actual content the implementer needs. These are **plan failures** — never
write them:

- "TBD", "TODO", "implementar depois", "preencher os detalhes"
- "adicione tratamento de erro adequado" / "adicione validação" / "trate os casos de borda"
- "escreva os testes do acima", without the test code
- "igual à Tarefa N" — repeat the code; the implementer may read tasks out of order
- references to types, functions or methods defined in no task

#### Última tarefa, obrigatória — `ARCHITECTURE.md`

The final task creates `<target>/ARCHITECTURE.md` at the repository root, translating the §4 ASCII
diagram into Mermaid. It is a *task*, not an output of this document: the file describes a system
that does not exist until the tasks before it have run.

```md
# Arquitetura — <Nome do sistema>

<Uma frase: o que o sistema é e qual invariante o desenho protege.>

<bloco mermaid com a mesma topologia da §4 — mesmos nós, mesmas direções>

## Componentes

| Componente | Papel | Onde roda | Porta/Endereço |

## Fluxos principais

1. <caminho ponta a ponta, seguindo as setas do diagrama>

## Fronteiras invariáveis

- **<fronteira>** — <a seta que nunca existe, e o que quebra se ela existir>

## O que este diagrama não mostra

<o que ficou deliberadamente de fora, para o leitor não sair procurando>

---
**Origem:** `docs/plans/<arquivo>.md` §4 · **Revisão:** <data>
**Atualize quando** entrar ou sair um processo, serviço, store ou dependência externa — não a cada
feature.
```

**Falha se:** the Mermaid graph does not carry the same nodes and the same directions as §4. Two
drawings of one topology that disagree are worse than one drawing.

---

## The ranking pattern

A decision **rises to a ranking section** only when **all five** are true:

1. **Low reversibility** — changing your mind means rewriting a subsystem, not a function.
2. **Three or more real alternatives** a competent engineer would genuinely propose. Not strawmen.
3. **The winner charges a price.** If it is free, it is a fact — it goes in the §1 table.
4. **The reader will question it** — the popular option was rejected, or the choice is unusual here.
5. **A future condition would reverse it.** If nothing would change your mind, it is a table row.

With six candidates, promote the three most expensive to reverse and demote the rest to §1 rows
with a "Razão curta".

### Gabarito

```md
## N. <Decisão em uma frase> — ranking e escolha

<Uma frase listando os critérios de julgamento, cada um em negrito.>

**Como é <o problema> aqui**

- **<Característica real, com número>:** <…>
- **<O que torna este caso diferente do caso de manual>:** <…>
- **<O que já existe e pesa a favor de alguma opção>:** <…>

### 🥇 1º — <Opção> — **ESCOLHA**

- **<Vantagem>:** <mecanismo, não adjetivo>.
- **Requisito que falta hoje:** <trabalho prévio que a escolha exige>.
- **Custo honesto:** <o que se paga por escolher isto>. <Por que é aceitável aqui.>
- **Configuração obrigatória:** <parâmetros sem os quais a escolha não vale>.

### 🥈 2º — <Opção>

<Por que é forte e a razão exata de ficar em 2º.> **Contra:** <…>

### 🥉 3º — <Opção>

<Idem. Se tiver uso legítimo em outro papel, diga qual — e onde nunca usar.>

### 4º — <Opção>

<…> **Contra:** <…> **Reconsiderar** se <condição observável>.

### 5º — <Antipadrão>

Antipadrão. <O que quebra concretamente, com o cenário.> Não faça.

### Decisão e gatilho de migração

**v1: <escolha>.** Mas **isole a fronteira**: <onde o código vive, atrás de qual interface, em
qual pacote>. Nenhuma outra parte do sistema sabe **como** isso acontece.

**Migre para <2º colocado> quando qualquer um destes for verdade** — e registre como ADR:

1. <gatilho de requisito, observável>
2. <gatilho de produto, observável>
3. <gatilho quantitativo — "passar de ~N linhas", "a segunda classe de bug de X">
4. <gatilho de escopo — "entrar uma terceira superfície">

<Uma frase: por que a fronteira existe — a troca deve custar reescrever `<dir>/`, e nada além.>
```

### Invariants — violating these dissolves the pattern

- Medals only on 1º, 2º, 3º. From 4º on, plain ordinals. **No other emoji anywhere in the
  document.**
- `**ESCOLHA**` bolded in the winner's heading (`**ESCOLHA PARA O v1**` when it is temporary).
- **`Custo honesto:` appears exactly once, on the winner.** Losers carry `Contra:`. The document
  charges the price of the choice it makes — rejecting is easy. A winner with no cost did not
  deserve a ranking.
- The runner-up is a genuine near-miss ("praticamente empatado, e melhor se a equipe preferir SQL
  explícito"), never a strawman. **If you cannot name a condition under which the runner-up wins,
  you have not understood the trade-off.** Go back and read.
- The last position is reserved for the antipattern, when one exists, closing on "Não faça."
- At least one migration trigger is **quantitative**. "Quando ficar grande" is banned; "quando o
  código próprio passar de ~500 linhas ou acumular a segunda classe de bug de ordering" is accepted.
- **Lean variant:** when no migration is foreseeable, replace the closing sub-section with a single
  line — `**Decisão:** X para <caso A>; Y para <caso B>.`

### Sibling pattern — the named dismissal

Use when the reader *expects* a family of tools you are not going to adopt.

```md
### N.M Sobre <família de ferramentas>

Essas ferramentas resolvem **<o problema real delas>**. <Este projeto> tem **<a diferença
factual>**. **Adotá-las aqui seria <o custo concreto>.** O que se aproveita é a *ideia* —
<qual> — e é ela que a §N.1 aplica.

**Reavaliar** se <condição observável que torna o problema deles o nosso>.
```

---

## Conditional section library

Walk this table answering yes/no to every trigger **before writing**. Every conditional you
evaluated and discarded that a reader might miss (i18n, payments, real-time) becomes a line in
Fase 2 — silent omission reads as forgetting.

| Parte | Section | Inclua quando | Falha se |
|---|---|---|---|
| II | Fidelidade visual e design system | há mock/Figma/produto de referência, ou um DS a respeitar | não diz o que **não** copiar, nem o que no mock é ilustração e não componente |
| II | Componentização | a superfície tem 3+ vistas que compartilham elementos | não nomeia as vistas que usam *o mesmo* componente (regra anti-duplicação) |
| II | Superfície de linha de comando | o produto é invocado por terminal | omite códigos de saída, stdout vs stderr, e comportamento sob pipe |
| III | Motor de upload e armazenamento | recebe bytes do usuário ou persiste artefatos binários | não diz o esquema da chave, a validade da URL assinada, e o que nunca passa pelo banco |
| III | Autenticação e sessão | existe identidade (login, token, chave de API) ou dado por usuário | não diz **onde a autorização é revalidada** — a borda nunca é fronteira de autorização |
| III | Autorização e multi-tenancy | dois usuários/orgs veem dados diferentes na mesma instância | falta o teste de vazamento cross-tenant no CI |
| III | Trabalho assíncrono: fila e workers | operação acima de ~1s, fora do request, ou que precisa de retry | omite idempotência por chave, DLQ, e a reconciliação de trabalho preso |
| III | Tempo real | dois clientes veem a mudança sem recarregar, ou progresso sem polling | ignora fallback, reconexão e autorização do canal. **Costuma merecer ranking** |
| III | Sincronização e offline | existe cópia local que pode divergir da remota | lista ferramentas antes de caracterizar o conflito real. **Quase sempre ranking** |
| III | Integração com IA/LLM | o produto chama ou hospeda um modelo | omite licença de pesos, teto de custo, e quais dados do usuário nunca vão ao provedor |
| III | Pagamentos e cobrança | dinheiro muda de mãos ou existe plano/limite pago | não nomeia a fonte de verdade (provedor via webhook) nem a idempotência do webhook |
| III | Processo ou serviço externo gerenciado | o app sobe/baixa/gerencia binário ou runtime de terceiro | promete antes de detectar; sem verificação de hash; sem cancelamento real |
| III | Migração de dados legados | dados existentes precisam existir no formato novo | sem volume real com número, sem reversibilidade, sem o destino do que não migra. **Normalmente ranking** |
| III | Notificações e e-mail | o sistema fala com o usuário fora da sessão | sem opt-out, sem rate limit por destinatário, sem o que nunca é notificado |
| III | Moderação e conteúdo público | usuários publicam conteúdo visível a terceiros | sem takedown auditado |
| V | Performance | há caminho quente, limite de recurso, ou volume que cresce | usa adjetivo em vez de orçamento numérico ou invariante de não-bloqueio |
| V | Acessibilidade | existe interface humana (GUI, TUI ou CLI) | não nomeia a operação longa que precisa de anúncio de status. CLI: esquece `NO_COLOR` e cor como único sinal |
| V | Responsividade / adaptação de janela | viewport variável **ou** janela redimensionável | desktop: não valida a posição restaurada contra os monitores atuais |
| V | i18n e localização | mais de um idioma, formatação por locale, ou conteúdo multilíngue | não diz o que **não** se traduz |
| V | Custo operacional | o custo de rodar varia com o uso (GPU, tokens, egress, execuções) | não nomeia o driver real de custo nem o teto |
| VI | Empacotamento e distribuição | instalado na máquina de terceiro (desktop, mobile, extensão, CLI publicada) | omite assinatura — sem ela o instalador é barrado, e isso é requisito de entrega, não polimento |
| VI | Compatibilidade e versionamento público | alguém que você não deploya consome sua interface | sem política de quebra nem janela de depreciação |
| VI | Rollout e feature flags | a mudança não pode atingir toda a base de uma vez | sem critério de avanço e sem critério de rollback |

---

## Anti-generic rules

These apply to every section, core and conditional. They are checked mechanically by
[review-checklist.md](review-checklist.md) before the file is saved.

1. **Name-swap test.** Every section contains at least one claim that would be **false or
   meaningless** in another project. If you swap the product name and the section still reads fine,
   it is boilerplate — rewrite it or delete it.
2. **Evidence provenance.** Every claim traces to exactly one of four sources: a file you read in
   the target repo (cite the path), an answer the user gave, a Context7 or registry lookup you
   actually performed, or an engineering trade-off you argue for **in the document itself**. A
   sentence tracing to none of these is filler.
3. **No choice without a cost.** Every ranking winner carries `Custo honesto:`; every §1 row names a
   trade-off.
4. **Adjectives need a number or an invariant behind them.** "rápido", "escalável", "robusto",
   "seguro", "moderno", "performático" are banned on their own.
5. **Every quality section names a negative** — what is *not* tested, measured, optimized, or used
   for what. A negative constraint is the cheapest evidence that real thinking happened.
6. **No happy path alone.** Every surface described has its exception state with a clear action.
7. **The consequence rule.** Prefer the sentence naming the failure the rule prevents to the one
   stating the rule. Weak: "marque elementos interativos com `no-drag`". Strong: "…com **cada**
   elemento interativo marcado `no-drag` — esquecer isso torna botões inclicáveis". Do not
   manufacture maxims for rules with no sharp edge; a forced one spends the credibility of the real
   ones.
8. **Generic sections end in specific content** — Padrões de código closes on this project's
   counterintuitive decisions; Testes closes on this project's critical flows.
9. **Mark what does not exist; do not invent it.** "**Não existe nos mocks**: desenhe no vocabulário
   do DS e registre em `docs/design/…`". If the repo was not read, write "não verificado".
10. **Banned outright:** "siga as boas práticas", "código limpo", "tratamento adequado de erros",
    "conforme necessário", "quando aplicável", "TBD", "TODO", "etc.".
11. **Conditional present means trigger satisfied.** If you cannot state the trigger that made a
    section appear, delete the section.

---

## Calibration example

[example-drive-clone.md](example-drive-clone.md) is a full greenfield document produced by an
**earlier version** of this template — a Google Drive clone, 30 sections, three ranking sections.
It predates §4 and Parte VII: it has no architecture diagram and no tasks, and its own numbering no
longer mirrors the catalog above. Calibrate voice, rankings and honest cost against it; never
calibrate structure. **Do not read it by default:**
it is long, and the catalog above is the authority. Open it only when you need to calibrate one
specific thing and the rule alone is not enough — what an honest cost actually sounds like, how a
named antipattern closes a ranking, or how the exception-states sub-section reads when it is doing
real work.
