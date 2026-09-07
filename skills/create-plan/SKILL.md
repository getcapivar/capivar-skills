---
name: create-plan
description: "Use to turn an idea into the project's implementation plan — a dense, opinionated document saved as docs/plans/AAAA-MM-DD-<slug>.md in the TARGET repo, carrying closed decisions, the runtime architecture diagram, ranked technical choices (each with its honest cost and its migration trigger), v1 vs phase 2, and bite-sized tasks with exact paths and complete code, ready for /subagent-driven-development. Reads the target repo first, proposes an already-filled draft with assumptions marked, then runs a full grill — and writes NOTHING until the user approves. Use when the user mentions 'create-plan', 'plano', 'plano de implementação', 'implementation plan', 'briefing', 'briefing do projeto', 'spec de marco', 'documentar o que vamos construir', or 'o que vamos construir'."
---

# Create Plan (Ideia → Plano)

Turn an idea into the document that describes what will be built, why, and in what order — at the
level of stack, architecture, closed decisions and executable tasks. This is the **fast lane**:
every step before it is optional, and its output feeds `/subagent-driven-development` directly.

**Optional, in any combination — none is a prerequisite:**

- `/create-prompt` — sharpens the sentence you were about to send. Chat only, writes nothing.
- `/discovery` — researches when the stack is still open.
- `/specify` — brainstorms and grills into `docs/specs/`.

**Then:** `/create-plan` → grill → aprovação → `/subagent-driven-development` →
`/requesting-code-review` → `/finishing-a-development-branch`.

This skill answers **"what are we building, what did we already decide, and in what order do we
build it?"** — and it *decides*. What hardens it is the grill in step 7, inside this skill: you
propose, the grill interrogates, the user corrects, and only then does anything get written.

**Announce at start:** "I'm using create-plan to turn this into an implementation plan. Nothing gets
written until you approve it."

<HARD-GATE>
**No file is created or edited until the interview is complete and the user has approved the plan
out loud.** That includes `ARCHITECTURE.md`, README, config files, dependencies, scaffolding and
any source file. An `ARCHITECTURE.md` written mid-interview describes a system the user has not yet
decided to have.

**One named exception:** when the chosen grill is `grill-with-docs`, it may create or update
`CONTEXT.md` and `docs/adr/` during the session — that is its declared job, and it creates them
lazily, only when a term or a decision actually crystallises. Nothing beyond those two.

After approval this skill writes **exactly one** markdown file (plus one index row). The root
`ARCHITECTURE.md` is **not written here** — it is a *task inside the plan*, executed by
`/subagent-driven-development` during implementation.

Never write the document into a skills repository. Resolve the target project first (step 1) and
state its absolute path out loud before doing anything else.
</HARD-GATE>

## Output

`<target>/docs/plans/AAAA-MM-DD-<slug>.md`, written in **PT-BR** (or the target repo's
documentation language), following the section catalog in [template.md](template.md).

The date is the **creation** date and does not change when the document is revised — the revision
history is git's. The slug identifies the target (`sonara-desktop`, `drive-clone`) and never
repeats the word "plano"; the folder already says that.

**Artifact boundary.** A plan **cites** ADRs, runbooks and guides; it does not replace them. A
single decision with discarded alternatives and long-term consequences is an ADR, not a section.
The `Decisões fechadas` rows are ADR *candidates* — mark them, do not write them. Who authors them
depends on what ran: `/specify` when it ran, `domain-modeling` (reached through `grill-with-docs`)
otherwise. This skill never writes an ADR itself — two owners for one file is how files diverge.

## Process

Create a task per step and complete them in order. **Steps 1 through 9 write nothing.**

**1. Resolve the target project.** The document goes in the *target* repo, never in the skills
repo. Resolve `git rev-parse --show-toplevel` from the cwd. **Refusal rule:** if that root contains
`skills/*/SKILL.md` and no product manifest, it is a skills repository — stop and ask for the
target's absolute path. State the resolved path in one line (`Alvo: C:\dev\sonora`) before
continuing.

**2. Take the ask.** Use what the user gave. If they gave nothing, ask exactly **one** question
("o que vamos construir, em uma ou duas frases?") and nothing more. The interview is step 6 and the
grill is step 7 — asking now buys answers you could have read.

**3. Read the ground and classify.** Probe in this order, stopping once classified:

- `git log --oneline -15`, `git ls-files` (first ~200)
- Manifests: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `Cargo.toml`, `pyproject.toml`,
  `go.mod`, `*.csproj`, `Gemfile`
- Authority docs, in precedence order: `CLAUDE.md` / `AGENTS.md` → **root `ARCHITECTURE.md`** →
  `CONTEXT-MAP.md` / `CONTEXT.md` → `docs/adr/` → `docs/guides/` → `docs/design/` → `docs/specs/`
- **`docs/plans/*.md` — read the most recent one in full.** An existing plan in the same repo fixes
  voice, depth, numbering and language for free, and is a better style guide than anything this
  skill can say. **Also read `docs/prompts/*.md` when it exists** — it is the legacy folder this
  skill used to write to. **Read it, do not migrate it:** the old document is evidence; it is never
  rewritten and never moved.

A root `ARCHITECTURE.md` is the strongest evidence of the real topology there is — §4 must
reconcile with it, marking what is new against what already runs. Note the presence or absence of
`CONTEXT.md` / `CONTEXT-MAP.md` here: it decides the grill in step 7.

| Ground | Test |
|---|---|
| **Greenfield** | no manifest with real dependencies **and** no source file outside scaffolding |
| **Brownfield** | a manifest with dependencies **or** at least one real source file |
| **New surface in an existing repo** | a workspace root exists **and** the ask is for a new app/package |

The third is the common case, and the one a binary greenfield/brownfield split gets wrong: it takes
**brownfield reading rules** and **greenfield structure rules**.

For brownfield, build an internal inventory — which packages exist and what each one owns. It is
the only honest source for the reuse section: a reuse list is worthless unless it names real paths
and says what each one covers.

**4. Verify versions and deprecations.** Scope this hard: only libraries that will appear in the
`Stack obrigatória` table **and** whose version is not already pinned in the target's manifest.
**The manifest always wins** — never recommend a version the repo does not use.

For each, Context7 (`resolve-library-id` → `query-docs`), asking three specific things: the current
stable major; what breaks relative to the version in the repo; and the one gotcha that bites in
*this* context (bundler, runtime, packaging). If `resolve-library-id` returns an id that does not
clearly match the package name, distrust it — take the version fact from the registry and use
Context7 only for the "what breaks" narrative.

Fallback, in order:

1. Context7 unavailable → the registry, read-only: `npm view <pkg> version`,
   `npm view <pkg> deprecated` (or `pip index versions`, `cargo search`, `go list -m -versions`).
2. No network → write the stack table **without version numbers** and let `Política de versões`
   record *latest estável resolvido no registro no momento da instalação*, listing which libraries
   went unverified.
3. **Never state a version you did not read.** A hallucinated version is worse than no version — it
   gets pinned into a manifest and breaks the build on install.

**5. Choose the sections.** Read [template.md](template.md) **now**, not from memory. Walk the
conditional trigger table answering yes/no to each. **§4 `Arquitetura do sistema` is core — it is
always in, and never passes through the conditional table.** Then name the **1–3 decisions in this
project that are hard to reverse** — those become ranking sections in step 8; everything else
becomes a row in `Decisões fechadas`.

**6. GATE 1 — section map, assumptions, interview.** Present *in chat* (~40 lines, not the
document):

- **The section map** — each section you will include with a one-line justification, **and the
  conditional sections you deliberately excluded, with why.** Naming the exclusions out loud is
  what stops template padding: it turns the deletion test from a private self-check into a public
  commitment.
- **The topology in one line, in prose, before you draw it** — the processes, services and stores
  that run, and the boundary each one lives in. A diagram is expensive to redraw and cheap to
  correct while it is still a sentence.
- **The assumption list**, ordered by blast radius, largest first. Each one carries the line that
  makes it worth reading:

```md
> **[SUPOSIÇÃO A1]** Assumi que a autenticação é a mesma da web (sessão por cookie), porque
> `packages/auth` já existe e o pedido fala em "mesma biblioteca".
> **Se estiver errado:** a §15 inteira muda e a §12 ganha um problema de identidade entre
> dispositivos que hoje não tem.
```

- **The interview** — at most **2 rounds, 5 questions per round**, numbered, with your recommended
  answer already filled in so the reply can be "1, 3, 5 ok; 2 → X". Round 2 covers only what round
  1's answers opened. Anything still open after round 2 does **not** become round 3 — it goes to
  the grill in step 7.

What to ask, what to assume, what never to ask:

- **Ask** — shape-changing and unknowable from the repo: who uses this and what hurts today; the
  v1 / Fase 2 cut line; hard non-negotiables (platform, deadline, budget, compliance); anything
  touching money or credits; and anything where two reasonable answers produce two different
  documents.
- **Assume and mark** — derivable and cheap to correct: stack details visible in the manifest,
  naming and folder conventions, test strategy, lint tooling, error envelope, observability
  defaults, accessibility baseline.
- **Never ask** — anything a file in the repo answers. Read it instead. (Same rule `discovery` and
  `specify` follow: if the codebase can answer it, explore instead of asking.)

**7. GRILL.** The choice is **automatic, by evidence in the target repo** — step 3 already resolved
it:

| Evidence in the target | Grill | Why |
|---|---|---|
| `CONTEXT-MAP.md` or `CONTEXT.md` exists | **`grill-with-docs`** | there is a glossary and ADRs to interrogate the plan against, and it keeps both sharp as terms resolve |
| Neither exists | **`grill-me`** | with no glossary, `grill-with-docs` spends the session inventing vocabulary instead of closing decisions |

State the choice out loud with the evidence — "`CONTEXT.md` existe → `grill-with-docs`". A silent
choice is a choice the user cannot correct.

Both are thin routers meant for the user to invoke: `grill-me` calls `grilling`; `grill-with-docs`
calls `grilling` and `domain-modeling`. **Invoke those two directly** — the routers carry
`disable-model-invocation`, and `grilling` is where the real interview lives.

- **They are generic and need a briefing.** Neither knows this template. Hand the grill its
  subject: the section map from GATE 1, the assumption list ordered by blast radius, and the 1–3
  decisions that are hard to reverse. Without that, it interviews into the void.
- **Exit criterion:** `grilling`'s own — the frontier is empty, every branch of the design tree
  visited, nothing left silently assumed. Plus: **zero `[SUPOSIÇÃO` markers still standing.**
- **Open questions.** What the grill cannot close becomes a line under `Perguntas em aberto`. And a
  decision that is still open **never becomes a task** in Part VII — a task built on an unanswered
  question is rework with verification steps attached.
- **When `/specify` already ran**, its grill covered the glossary and the ADRs. The grill here is
  **not skipped, it is narrowed**: it attacks this plan's decisions and tasks and does not
  re-litigate terminology that is already closed.

**8. Write the rankings** *in memory* for the decisions named in step 5, following the gabarito in
[template.md](template.md). Respect its invariants — `Custo honesto:` exactly once and on the
winner, a runner-up that is a real near-miss, at least one quantitative migration trigger.

**9. GATE 2 — approval before the first write.** Present the closed decisions, the topology, the
rankings and the v1 / Fase 2 cut, and ask: *"Posso escrever o plano?"*. **Wait.** Without an
explicit yes, nothing is written. This is the gate whose absence let an `ARCHITECTURE.md` appear
before the plan existed.

**10. Write the document — Parts I–VI.** Hard-wrap prose at 100 columns; leave tables, fences and
links alone — this file is reviewed as a diff. Open with the header block and the `Base:`
provenance line (`leitura do repo em <data>, commit <sha curto>`).

- **Collision check:** if `docs/plans/*-<slug>.md` already exists, ask — revise in place (the
  convention says the date does not change on revision) or write a new dated document that
  supersedes it. Never overwrite silently.
- If `docs/plans/README.md` exists, add the row to its index table in the same pass. If the folder
  is new, offer (one question) to create the README with the naming convention and the "pertence
  aqui?" table that separates a plan from an ADR, a runbook, a guide and a design doc.
- Do not commit; offer.

**11. Write Part VII — the tasks.** Same file. The execution order opens it, the bite-sized tasks
follow, and **the last task creates `<target>/ARCHITECTURE.md`** from §4. Tasks cover the **v1**
only; nothing from Fase 2 becomes a task.

**12. Validate.** Re-read the file **from disk** — not from what you meant to write — and run
[review-checklist.md](review-checklist.md). Dispatch the reviewer subagent when the document is
greenfield or carries more than two rankings; offer it otherwise. Fix inline. Never present
something that fails a check with a caveat attached.

**13. GATE 3 — user review.** "Escrito em `<path>`. Leia e diga o que está errado antes de
seguirmos." Wait. Rewrite sections rather than defending them, and re-run step 12 after changes.

## Ground rules by branch

Branch on the **inputs, not the output structure**. Both branches produce the same section spine;
what differs is which evidence step runs, what §3 contains, and the modality of the verbs.

| | Greenfield | Brownfield / new surface |
|---|---|---|
| Step 3 | skip the inventory; there is nothing to read | full inventory, including `docs/plans/*` and legacy `docs/prompts/*` |
| Stack | you propose it; every entry version-checked in step 4 | **the repo's stack IS the stack** — the manifest beats your preference; only new deps go through step 4 |
| §3 Infra | "Peças a construir" + the fallback rule | **Reuso obrigatório** / **Novo** / **Regra de fallback** — all three, mandatory |
| §4 Arquitetura | you draw the target topology; every box is something you will create | draw **what runs today** first, then mark the new boxes. A diagram that omits what already runs is a proposal for a different system |
| Structure | you propose the whole tree | you extend it, marking each node `(NOVO)` / `(EXISTENTE)` |
| §1 Decisions | the ones you and the user are making now | ones already made (ADRs, guides) are **cited, not reopened** |
| Rankings | rank freely | an option contradicting an existing ADR may only win with an explicit "isto reabre o ADR-000N porque…" |
| Failure to guard against | **fabrication** — invented packages, invented versions | **ignoring what exists** — proposing a rewrite of something that works |

**§Reuso obrigatório exists only in brownfield, and there it is mandatory.** Its absence in a
brownfield document means you did not look at the repo. In greenfield its presence is fiction: no
sentence may describe anything as already existing, and the verb is "crie", never "reuse".

The `(NOVO)` / `(EXISTENTE)` marks on the structure tree are not annotation — they are the scope
boundary. An unmarked tree is unreviewable.

## What this is NOT

- **Not prompt engineering for an LLM call.** That is `/create-prompt`, which sharpens a sentence
  and writes nothing. This produces a project plan.
- **Not research.** When the technology itself is uncertain, that is `/discovery`. This skill
  decides from what it can read and verify; what it cannot close becomes an open question.
- **Not the implementation.** It writes the plan, never the code the plan describes. No
  scaffolding, no dependencies, no config, no source file — and no root `ARCHITECTURE.md`, which is
  a task the plan hands to `/subagent-driven-development`.
- **Not a place for secrets.** The inventory names variables and says what is never embedded. A
  value never appears.

## Hand-off

- **Nothing open** → `/subagent-driven-development`, pointed at `docs/plans/<arquivo>`. It extracts
  the tasks from Part VII and executes them with review between each.
- **Open questions about HOW to build it** (the technology is uncertain, the approach is not
  obvious) → `/discovery`, pointed at this document. It researches and brings evidence; you come
  back and revise the plan.

Say which one you would pick and why. Then wait. Do NOT invoke either yourself.

## Key principles

- **The document is written for an engineer who was not in this conversation.** Anything that only
  makes sense because you remember what the user said is a defect, not a shortcut.
- **Nothing is written until the user says so.** A document produced from unreviewed assumptions is
  a document that gets rewritten — and a file created before the decision is a decision nobody made.
- Read before asking; assume and mark before interviewing; interview only what changes the shape.
- Every claim traces to a file you read, an answer you got, a lookup you performed, or a trade-off
  you argue for in the document itself. Anything else is filler.
- No choice without its honest cost. A decision with no downside was not evaluated.
- If nothing was cut, there was no scope.
- Decide what you can close; name what you cannot. An honest open question beats a confident
  invention.
