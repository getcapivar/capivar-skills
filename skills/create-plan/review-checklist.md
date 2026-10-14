# Implementation plan review checklist

Run this against the file **on disk** — read it back, do not grade what you meant to write. The
gap between intention and text is the entire point of this pass.

This file is written so it can be handed **verbatim** to a `general-purpose` subagent along with
nothing but the document's path. A reviewer with no memory of the conversation cannot mentally
supply the specificity that is missing from the page, which is exactly the defect being hunted.

**Dispatch a subagent when** the document is greenfield (no repo to read means maximum fabrication
risk) or longer than 250 lines. Otherwise run the checklist yourself.

**Subagent prompt:**

> Read `<absolute path>`. It is a Portuguese-language implementation plan. Run every check below and
> report each one as PASS or FAIL with the offending line quoted. You have no context beyond the
> file itself — that is deliberate. If something only makes sense to someone who was in the
> conversation that produced it, that is a FAIL, not a thing to overlook. Do not fix anything;
> report.

Fix every failure inline. Never present a document that fails a check with a caveat attached — the
caveat gets skipped and the defect ships.

---

## Size and structure

- [ ] **At most 300 lines**, diagram and tasks included; a feature in an existing repo lands near
      80–150, a new application near 180–280 (a full product may approach 300). Over 300 means
      two plans, not one long one
- [ ] Every section stays within its line budget in the template; a section that does not apply is
      **one line saying why**, never padded and never silently removed
- [ ] Sections are `## 1.` to `## 20.` in order, then any conditional sections (`## 21.`…), then
      `## Tarefas`. Every `§N` in the text resolves to a section that contains what it promises
- [ ] Prose and bullets hard-wrapped at 100 columns; **no table row wrapped**; backticks on every
      identifier, path, flag and env var; no "ver acima" — references are `§N`
- [ ] §5 closes with a **Regra invariável** line
- [ ] `- [ ]` checkboxes only in §20; fenced blocks only for the §4 diagram and an application's §5
      tree; **no implementation code anywhere** — function signatures are fine

## Header

- [ ] `Contexto` states the problem, what prompted the plan and the observable result, plus the
      failure asymmetry of this project — in 2–4 lines
- [ ] The title's parenthetical names the hard dimensions, not the stack, and each one is answered
      by a section
- [ ] `Base:` present, with a real date — and the commit in brownfield; greenfield says "projeto
      novo"

## Arquitetura (§4)

- [ ] An ASCII diagram in a fence, and **every box has a legend row** — and every legend row a box
- [ ] It draws processes, services and the boundaries that host them — not tiers. "Frontend →
      Backend → Banco" is not a topology
- [ ] Every component named elsewhere in the document is in the diagram, or declared out of scope
- [ ] **Fronteiras invariáveis** names 2–4 arrows that may never exist
- [ ] No placeholder from the template skeleton survives (`<proc A>`, `<port>`, `<protocolo>`)

## Decisions

- [ ] Every decision stated anywhere in the body appears in §1 or §10
- [ ] No "Razão curta" is circular ("usamos X porque X é bom") or a virtue without a trade-off ("é o
      padrão do mercado")
- [ ] §10 is a table `Decisão | Escolha | Descartada | Custo | Migrar quando`, with 1–3 rows — or
      one line saying why no decision in this project is disputed
- [ ] In every §10 row the **cost is not empty**, the discarded option is one a competent engineer
      would really propose, and the trigger is observable. At least one trigger in the document is
      numeric

## Content

- [ ] **Name-swap test passes in every section that is longer than one line.** Swap the product
      name: if it still reads fine, it is boilerplate — rewrite it or cut it to one line
- [ ] §8 names every surface, and **Estados de exceção** covers them — each state with its action,
      and every error code of §12 handled. No dead ends
- [ ] §11 Segurança, §16 Testes and §17 Observabilidade each name at least one negative; the one in
      §11 is verified by a test
- [ ] Metrics are named, not categorised ("taxa de falha por provider", not "métricas de erro")
- [ ] Banned-phrase sweep returns nothing (case-sensitive — `TODO`, not the Portuguese "todo"):

```
TBD | TODO | XXX | <\.\.\.> | a definir | boas práticas | código limpo |
tratamento adequado | conforme necessário | quando aplicável | etc\. | entre outros |
adequado | apropriado | robusto | escalável | moderno | performático | rápido | seguro |
considere | avalie
```

  An adjective from that list survives only with a number or a verifiable invariant behind it.

## Truth

- [ ] **Every assumption A1…An was answered in the questionnaire, and none survives as a marker.**
      Each became a §1 row, a plain statement, or a line under "Perguntas em aberto" in §18
- [ ] **Brownfield:** every path under `Reuso` in §3 was verified to exist on disk
- [ ] **Greenfield:** nothing is described as already existing — no reused path, no guide, no ADR.
      The verb is "crie", never "reuse"
- [ ] Every version number came from the manifest, Context7 or the registry
- [ ] Nothing is described as existing in the mocks that is not there — gaps are marked
- [ ] No later section quietly contradicts a §1 or §10 decision

## Delivery

- [ ] **Fase 2 is not empty.** If nothing was cut, there was no scope
- [ ] Every triggered conditional is its own §21+ section or folded into a core section; discarded
      ones a reader might miss are named in Fase 2
- [ ] Inventário: **no secret appears with a value**, and the "nunca embarcado" line names the test
      that proves it
- [ ] Every §20 item is demonstrable by a human and points at a section

## Tarefas

- [ ] The order of execution opens the part, ordered by risk, with 3–6 items, one carrying the
      honest cut. Item 1 is not code — an external dependency, a measurement or a spike — and not
      a decision still open
- [ ] Every task has `Arquivos` (exact paths — no globs, no "testes ao lado"), `Interface`, `Teste`
      with **a negative case** and
      `Pronto quando` with an observable criterion — in 4–6 lines (heading not counted) and **with
      no code**.
      `/subagent-driven-development` hands each task's text to a subagent that sees nothing else
- [ ] Every name a task uses is defined by that task or an earlier one; no "igual à T\<N\>"
- [ ] Tasks implement the **v1** of §18 only, and none rests on a question in "Perguntas em aberto"
- [ ] **The last task creates `<target>/ARCHITECTURE.md`** from §4: a Mermaid block with the same
      nodes and directions, the component table, main flows, invariant boundaries, what the
      diagram leaves out, and the "Atualize quando…" line
- [ ] Every item of the v1 in §18 is built by some task — nothing promised is left without one

## File

- [ ] Path is `<target>/docs/plans/AAAA-MM-DD-<slug>.md` — **in the target repo, never in the
      skills repository**
- [ ] Date is the creation date; slug identifies the target and does not contain the word "plano"
- [ ] `docs/plans/README.md` exists and its index table includes this document
- [ ] Nothing was created outside `docs/plans/` — no scaffolding, no config, no source file, and
      **no `ARCHITECTURE.md` at the repository root**: that file is the last task of the plan
- [ ] **No file was written before the user approved the plan at GATE 2.** The only admissible
      exception is `CONTEXT.md` / `docs/adr/`, written by `domain-modeling` in the `grill-with-docs`
      variant of the grill

---

## Short, not thin

Cutting is the default: a plan that holds 300 lines of load-bearing decision is rare, and a
feature that produces 250 was padded. But short is not the same as thin. The symptom to hunt is a
section that lists nouns with no consequence attached — rewrite it with the failure each rule
prevents, or cut it to the one line that is true.
