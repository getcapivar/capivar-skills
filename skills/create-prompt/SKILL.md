---
name: create-prompt
description: "Use BEFORE /discovery and /specify to turn a rough idea into the project's prompt-base — a dense, opinionated briefing saved as docs/prompts/YYYY-MM-DD-<slug>.md in the TARGET repo, carrying closed decisions, ranked technical choices (each with its honest cost and its migration trigger), v1 vs phase 2, and a demonstrable expected-result checklist. Reads the target repo first, proposes an already-filled draft with assumptions marked, and interviews only what it could not derive. NOT prompt engineering for an LLM call. Use when the user mentions 'create-prompt', 'prompt-base', 'prompt do projeto', 'documento de prompt', 'briefing', 'briefing do projeto', 'spec de marco', 'documentar o que vamos construir', or 'o que vamos construir'."
---

# Create Prompt (Idea → Prompt-base)

Turn a rough idea into the document that describes what will be built and why, at the level of
stack, architecture and closed decisions. The output is the entry point of the pipeline:

**`/create-prompt` → `/discovery` (optional) → `/specify` → `/writing-plans` →
`/subagent-driven-development` → `/code-review`**

Each skill in that chain answers one question. This one answers **"what are we building, and what
did we already decide?"** — and it *decides*. `discovery` researches and commits to nothing;
`specify` hardens what you bring it. **This skill decides; `specify` hardens.**

That division is why this skill does **not** grill. `specify`'s Phase B already owns the relentless
adversarial interrogation. If both interrogate, the user answers the same question twice and stops
using one of them. Here you propose, and the user corrects.

**Announce at start:** "I'm using create-prompt to turn this into a prompt-base document before we
discover or specify."

<HARD-GATE>
This skill writes exactly ONE markdown file (plus one index row). Do NOT scaffold a project,
create config files, install dependencies, run a package manager, or write a single line of
source code — no matter how obvious the first step looks. The document describes the build;
it is not the build.

Never write the document into a skills repository. Resolve the target project first (step 1) and
state its absolute path out loud before doing anything else.

Never write the file before the user has reacted to the section map and the assumption list
(step 6). A document written from unreviewed assumptions is a document that gets rewritten.
</HARD-GATE>

## Output

`<target>/docs/prompts/AAAA-MM-DD-<slug>.md`, written in **PT-BR** (or the target repo's
documentation language), following the section catalog in [template.md](template.md).

The date is the **creation** date and does not change when the document is revised — the revision
history is git's. The slug identifies the target (`sonara-desktop`, `drive-clone`) and never
repeats the word "prompt"; the folder already says that.

**Artifact boundary.** A prompt-base **cites** ADRs, runbooks and guides; it does not replace them.
A single decision with discarded alternatives and long-term consequences is an ADR, not a section.
The `Decisões fechadas` rows are ADR *candidates* — mark them, do not write them. `specify`'s grill
owns ADR authoring and `CONTEXT.md`; writing them here would give two skills the same files.

## Process

Create a task per step and complete them in order.

**1. Resolve the target project.** The document goes in the *target* repo, never in the skills
repo. Resolve `git rev-parse --show-toplevel` from the cwd. **Refusal rule:** if that root contains
`skills/*/SKILL.md` and no product manifest, it is a skills repository — stop and ask for the
target's absolute path. State the resolved path in one line (`Alvo: C:\dev\sonora`) before
continuing.

**2. Take the ask.** Use what the user gave. If they gave nothing, ask exactly **one** question
("o que vamos construir, em uma ou duas frases?") and nothing more. The interview is step 6, and it
happens *after* you have evidence — asking now buys answers you could have read.

**3. Read the ground and classify.** Probe in this order, stopping once classified:

- `git log --oneline -15`, `git ls-files` (first ~200)
- Manifests: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `Cargo.toml`, `pyproject.toml`,
  `go.mod`, `*.csproj`, `Gemfile`
- Authority docs, in precedence order: `CLAUDE.md` / `AGENTS.md` → `CONTEXT-MAP.md` / `CONTEXT.md`
  → `docs/adr/` → `docs/guides/` → `docs/design/` → `docs/specs/`
- **`docs/prompts/*.md` — read the most recent one in full.** An existing prompt in the same repo
  fixes voice, depth, numbering and language for free, and is a better style guide than anything
  this skill can say.

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
conditional trigger table answering yes/no to each. Then name the **1–3 decisions in this project
that are hard to reverse** — those become ranking sections in step 7; everything else becomes a row
in `Decisões fechadas`.

**6. GATE 1 — section map, assumptions, interview.** Present *in chat* (~40 lines, not the
document):

- **The section map** — each section you will include with a one-line justification, **and the
  conditional sections you deliberately excluded, with why.** Naming the exclusions out loud is
  what stops template padding: it turns the deletion test from a private self-check into a public
  commitment.
- **The assumption list**, ordered by blast radius, largest first. Each one carries the line that
  makes it worth reading:

```md
> **[SUPOSIÇÃO A1]** Assumi que a autenticação é a mesma da web (sessão por cookie), porque
> `packages/auth` já existe e o pedido fala em "mesma biblioteca".
> **Se estiver errado:** a §14 inteira muda e a §11 ganha um problema de identidade entre
> dispositivos que hoje não tem.
```

- **The interview** — at most **2 rounds, 5 questions per round**, numbered, with your recommended
  answer already filled in so the reply can be "1, 3, 5 ok; 2 → X". Round 2 covers only what round
  1's answers opened. Anything still open after round 2 does **not** become round 3 — it becomes a
  line under `Perguntas em aberto para o /specify`.

What to ask, what to assume, what never to ask:

- **Ask** — shape-changing and unknowable from the repo: who uses this and what hurts today; the
  v1 / Fase 2 cut line; hard non-negotiables (platform, deadline, budget, compliance); anything
  touching money or credits; and anything where two reasonable answers produce two different
  documents.
- **Assume and mark** — derivable and cheap to correct: stack details visible in the manifest,
  naming and folder conventions, test strategy, lint tooling, error envelope, observability
  defaults, accessibility baseline.
- **Never ask** — anything a file in the repo answers. Read it instead. (Same rule as `discovery`
  step 3 and `specify` Phase A step 3.)

**7. Write the rankings** for the decisions named in step 5, following the gabarito in
[template.md](template.md). Respect its invariants — `Custo honesto:` exactly once and on the
winner, a runner-up that is a real near-miss, at least one quantitative migration trigger.

**8. Write the document.** Hard-wrap prose at 100 columns; leave tables, fences and links alone —
this file is reviewed as a diff. Open with the header block and the `Base:` provenance line
(`leitura do repo em <data>, commit <sha curto>`).

- **Collision check:** if `docs/prompts/*-<slug>.md` already exists, ask — revise in place (the
  convention says the date does not change on revision) or write a new dated document that
  supersedes it. Never overwrite silently.
- If `docs/prompts/README.md` exists, add the row to its index table in the same pass. If the
  folder is new, offer (one question) to create the README with the naming convention and the
  "pertence aqui?" table that separates a prompt from an ADR, a runbook, a guide and a design doc.
- Do not commit; offer.

**9. Validate.** Re-read the file **from disk** — not from what you meant to write — and run
[review-checklist.md](review-checklist.md). Dispatch the reviewer subagent when the document is
greenfield or carries more than two rankings; offer it otherwise. Fix inline. Never present
something that fails a check with a caveat attached.

**10. GATE 2 — user review.** "Escrito em `<path>`. Leia e diga o que está errado antes de
seguirmos." Wait. Rewrite sections rather than defending them, and re-run step 9 after changes.

## Ground rules by branch

Branch on the **inputs, not the output structure**. Both branches produce the same section spine;
what differs is which evidence step runs, what §3 contains, and the modality of the verbs.

| | Greenfield | Brownfield / new surface |
|---|---|---|
| Step 3 | skip the inventory; there is nothing to read | full inventory, including `docs/prompts/*` |
| Stack | you propose it; every entry version-checked in step 4 | **the repo's stack IS the stack** — the manifest beats your preference; only new deps go through step 4 |
| §3 Infra | "Peças a construir" + the fallback rule | **Reuso obrigatório** / **Novo** / **Regra de fallback** — all three, mandatory |
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

- **Not prompt engineering for an LLM call.** This produces a project briefing, not a system prompt,
  not a template for an API request.
- **Not a grill.** `specify` Phase B owns the adversarial pass. Here you propose and the user
  corrects, inside a hard interview budget.
- **Not research.** When the technology itself is uncertain, that is `/discovery`. This skill
  decides from what it can read and verify; what it cannot close becomes an open question.
- **Not a spec, and not a plan.** No acceptance criteria, no tasks, no estimates. `specify` writes
  the contract; `writing-plans` writes the order.
- **Not implementation.** One markdown file. No scaffolding, no dependencies, no code.
- **Not a place for secrets.** The inventory names variables and says what is never embedded. A
  value never appears.

## Hand-off

Route by what is still open, then stop:

- **Open questions about HOW to build it** (the technology is uncertain, the approach is not
  obvious) → `/discovery`, pointed at this document. It researches and brings evidence; you come
  back and revise the prompt.
- **Open questions about WHAT to build** (clear on paper, not closed) → `/specify`. Its Phase A
  starts from this document; its Phase B grills against it.
- **Nothing open** → `/specify` directly: "requirements-first, base em `docs/prompts/<arquivo>`".
  Then `/writing-plans` fills the spec trio's `tasks.md`.

Say which one you would pick and why. Then wait. Do NOT invoke any of them yourself.

## Key principles

- **The document is written for an engineer who was not in this conversation.** Anything that only
  makes sense because you remember what the user said is a defect, not a shortcut.
- Read before asking; assume and mark before interviewing; interview only what changes the shape.
- Every claim traces to a file you read, an answer you got, a lookup you performed, or a trade-off
  you argue for in the document itself. Anything else is filler.
- No choice without its honest cost. A decision with no downside was not evaluated.
- If nothing was cut, there was no scope.
- Decide what you can close; name what you cannot. An honest open question beats a confident
  invention.
