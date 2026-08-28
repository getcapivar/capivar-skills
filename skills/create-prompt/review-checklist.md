# Prompt-base review checklist

Run this against the file **on disk** — read it back, do not grade what you meant to write. The
gap between intention and text is the entire point of this pass.

This file is written so it can be handed **verbatim** to a `general-purpose` subagent along with
nothing but the document's path. That is the strongest form of the check: a reviewer with no memory
of the conversation cannot mentally supply the specificity that is missing from the page, which is
exactly the defect being hunted.

**Dispatch a subagent when** the document is greenfield (no repo to read means maximum fabrication
risk) or carries more than two ranking sections. Otherwise offer it and let the user choose.

**Subagent prompt:**

> Read `<absolute path>`. It is a Portuguese-language project briefing. Run every check below and
> report each one as PASS or FAIL with the offending line quoted. You have no context beyond the
> file itself — that is deliberate. If something only makes sense to someone who was in the
> conversation that produced it, that is a FAIL, not a thing to overlook. Do not fix anything;
> report.

Fix every failure inline. Never present a document that fails a check with a caveat attached — the
caveat gets skipped and the defect ships.

---

## Structure

- [ ] Every `##` section is numbered, except `Sumário`; every `§N` in the text resolves to a section
      that exists **and that actually contains what the pointer promises**
- [ ] Sumário, if present, matches the real headings exactly (it is generated last, or it is wrong)
- [ ] `---` between every section; prose hard-wrapped at 100 columns; **no table row wrapped**
- [ ] Emoji only 🥇🥈🥉, only in ranking headings — nothing decorative anywhere
- [ ] `- [ ]` checkboxes appear **only** in Resultado esperado
- [ ] No non-ranking section exceeds 400 words
- [ ] No implementation code. Fenced blocks only for the file tree and state machines

## Header

- [ ] Every specialization named in `Papel:` has a corresponding section in the body
- [ ] Every sentence of `Mentalidade de produção:` is implemented by a section
- [ ] The title's parenthetical names the hard dimensions, not the stack
- [ ] `Base:` provenance line present, with a real date and commit

## Decisions

- [ ] At least one ranking section, OR an explicit sentence in §1 saying why no decision in this
      project is disputed
- [ ] Each ranking: 3+ real options; `**ESCOLHA**` on the winner; `Custo honesto:` **exactly once**,
      on the winner; `Contra:` on the losers; a closing Decisão. The antipattern in last place is
      the one exception — it closes on "Não faça." and needs no `Contra:`
- [ ] The runner-up is a genuine near-miss with a stated condition under which it wins
- [ ] At least one migration trigger in the document is quantitative
- [ ] Every decision stated anywhere in the body appears in the §1 table
- [ ] No "Razão curta" is circular — a reason that merely restates the choice ("usamos X porque X é
      bom") fails, as does a virtue with no trade-off ("é o padrão do mercado")

## Content

- [ ] **Name-swap test passes in EVERY section.** Swap the product name: if a section still reads
      fine, it is boilerplate. Each section holds at least one claim that would become false or
      meaningless in another project
- [ ] Every surface described has its exception state, with an action — no dead ends
- [ ] Every quality section (Testes, Performance, Segurança, Observabilidade) names at least one
      negative — what is *not* tested, measured, optimized, or used for what
- [ ] Padrões de código closes on this project's counterintuitive decisions, not on generic rules
- [ ] Metrics are named, not categorized ("taxa de falha por provider", not "métricas de erro")
- [ ] Banned-phrase sweep returns nothing:

```
TBD | TODO | XXX | <\.\.\.> | a definir | boas práticas | código limpo |
tratamento adequado | conforme necessário | quando aplicável | etc\. | entre outros |
adequado | apropriado | robusto | escalável | moderno | performático | considere | avalie
```

  An adjective from that list survives only with a number or a verifiable invariant behind it.

## Truth

- [ ] **Zero `[SUPOSIÇÃO` markers survive.** Each became a §1 row, a plain statement, or an entry
      under "Perguntas em aberto". A saved document full of assumption blocks is worse than one with
      an honest open-questions list
- [ ] **Brownfield: every path under the "Reuso obrigatório" sub-section was verified to exist by
      reading the filesystem**, not recalled from a directory listing. A reuse list naming a package
      that is not there is the worst defect this document can carry — it sends the implementer
      hunting for something that does not exist
- [ ] **Greenfield: there is no "Reuso obrigatório" sub-section at all** (a "Regra de fallback"
      sub-section is fine and expected), and no sentence describes anything as already existing. The
      verb is "crie", never "reuse". In particular, no guide, ADR or convention document may be
      cited as existing — a new repository has none
- [ ] Every version number came from the target's manifest, from Context7, or from the registry.
      Unverifiable ones were removed and absorbed into Política de versões
- [ ] Nothing is described as existing in the mocks/design that is not there — gaps are marked, not
      invented
- [ ] No later section quietly contradicts a §1 decision

## Delivery

- [ ] **Fase 2 is not empty.** If nothing was cut, there was no scope — go back and cut
- [ ] Conditional sections that were evaluated and discarded and that a reader might miss are named
      in Fase 2, not silently absent
- [ ] Inventário: the "nunca embarcado" list is non-empty for anything shipped to a third party's
      machine, and **no secret appears with a value**
- [ ] Every Resultado esperado item is demonstrable by a human and maps to a section
- [ ] Ordem de execução item 1 is **not** "crie o repositório" / "instale as dependências" — it is
      non-code work, a measurement, or the largest risk

## File

- [ ] Path is `<target>/docs/prompts/AAAA-MM-DD-<slug>.md` — **in the target repo, never in the
      skills repository**
- [ ] Date is the creation date; slug identifies the target and does not contain the word "prompt"
- [ ] `docs/prompts/README.md` exists and its index table includes this document
- [ ] Nothing was created outside `docs/prompts/` — no scaffolding, no config, no source file

---

## Thinness, not length

Length is not the target. The reference document runs 716 lines because a desktop app with a local
inference runtime and bidirectional sync has that much load-bearing decision in it. A CRUD feature
producing 700 lines was padded.

The symptom to hunt is **thinness**: a section that is a bullet list of nouns with no consequences
attached. Rewrite it with the failure each rule prevents, or cut it.
