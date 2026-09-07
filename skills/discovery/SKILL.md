---
name: discovery
description: "Use BEFORE /create-plan when you don't yet know WHAT to build or HOW. Research-led: it reads the codebase + docs (Context7, DeepWiki, web) and teaches you how the feature works, the best practices, and the options — it does NOT interrogate you (the grill inside /create-plan does that). Ends by routing you to /create-plan, which closes the decisions the research left open. Produces a discovery brief; saving it to docs/discovery/ is opt-in (asks first, never auto-saves). Use when the user mentions 'discovery', 'research', 'pesquisa', 'explorar', 'entender o domínio', 'melhores práticas', 'como implementar', 'validar ideia', or 'mapear oportunidades'."
---

# Discovery (Research → Brief)

Discovery is the **research phase**. `create-plan` decides and its grill hardens; **discovery is where you figure out *how* it should be built, *what* the best practices are, and *which* opportunities are worth pursuing — before anything is decided or specified.**

The full pipeline is:

```
opcionais, em qualquer combinação: /create-prompt · /discovery · /specify
                                        │
                                        ▼
/create-plan ──► grill ──► aprovação ──► docs/plans/<data>-<slug>.md
                                        │
                                        ▼
/subagent-driven-development → /requesting-code-review → /finishing-a-development-branch

rota issue tracker: /specify → /to-prd → /to-issues → /create-plan
```

Discovery sits before the decision: `create-plan` sends work **here** when the technology is uncertain, and discovery sends it **back there** once the candidates are on the table. It is an **optional step** in both directions — skip it whenever you already know the territory.

**Announce at start:** "I'm using discovery to research <topic> before we decide or specify."

<HARD-GATE>
Discovery MAPS the space; it does not commit to a solution. Do NOT write code, scaffold a project, lock a tech stack as decided, or invoke `create-plan` / `specify` / any implementation skill until the brief has been presented AND the user has reviewed it. Discovery ends at a human gate — it recommends a next step (step 7) and **never auto-advances to it**.

**Never persist the brief silently.** The markdown brief is NOT written to `docs/discovery/` automatically. At the save gate you MUST ask the user whether to save it; create the file only on an explicit yes. If the user declines, keep the brief in the conversation only — do not create or commit anything under `docs/discovery/`.
</HARD-GATE>

## Stance

**Research-led, not an interview.** You go read and learn — codebase, official docs (Context7), the wider web — and then **teach the user**: how the thing works, the options, the best practices, the trade-offs. You do NOT interrogate the user to extract a spec. The user came to discovery to *understand the territory*, not to be quizzed about something they've said they don't yet know. Pinning down purpose, constraints, and acceptance criteria — the interrogation — belongs to `specify`, which clarifies through dialogue and then grills the approved design.

Be divergent and curious, but **evidence-driven**: every claim about "how others do this" or "the best practice is X" must be backed by something you actually read (the codebase, Context7, or a cited source). Discovery is **mapped evidence + open questions**, not opinion.

## Output

The deliverable is a **discovery brief**: the synthesis of domain map, users & pains, existing alternatives, best-practices findings (cited), mapped opportunities, candidate approaches with trade-offs, a recommendation, and the open questions the next step must resolve. Present it inline first.

**Persisting it is opt-in.** Saving the brief as a dated `docs/discovery/YYYY-MM-DD-<topic>.md` happens ONLY if the user says yes at the save gate (step 6). Never write or commit it automatically. It is a research note, not a contract — `create-plan` is what turns findings into something the team commits to.

## Process

Create a task per step and complete them in order:

1. **Frame the discovery question.** State in one sentence what we're trying to learn or decide ("How should Capivar implement X?" / "Is Y worth building, and for whom?"). If the request bundles several independent questions, split them — one brief per question.

2. **Explore project context.** Read the relevant docs and code FIRST (token economy: see `CLAUDE.md` → "O que LER em primeiro lugar"). Detect the context structure: a root `CONTEXT-MAP.md` → multi-context (read it to find where each context lives); else a root `CONTEXT.md` → single context. Read the relevant glossary + `docs/adr/` for the area you're touching. Note how this area works **today** in the repo.

3. **Scope the research — infer, don't interrogate.** Derive the research angle from the request + what you read in step 2, and **state your assumptions explicitly** so the user can redirect. Ask **at most one** brief scoping question, and only when the angle is genuinely ambiguous (e.g. technical feasibility vs UX patterns vs market/validation). Discovery does not extract a spec from the user — that is `specify`'s job.

4. **Research the domain and the solution space.** Map how this kind of feature works, who it is for and what hurts today, existing alternatives, best practices, patterns/libraries, trade-offs, and pitfalls. Primary sources, by fit: the **codebase** (how this repo does it today); **Context7** for official library / framework / SDK / API / CLI / cloud-service docs (version-specific — prefer it over web search for library docs, even well-known ones); **DeepWiki** ([deepwiki.com](https://deepwiki.com)) to learn how a *specific public GitHub repo* is structured or implements something — browse `deepwiki.com/<owner>/<repo>` or call its MCP `https://mcp.deepwiki.com/mcp` (`read_wiki_structure`, `read_wiki_contents`, `ask_question`); and **web search** for the rest. Cite every source with a link or a Context7/DeepWiki repo id. Where the user holds context the code can't (their specific process or pain), invite them to share and react to your findings — collaboratively, not as a question checklist.

5. **Synthesize and present the brief** — teach the user what you found: the domain map (what it is, how it works here today), users & pains, existing alternatives, best-practices findings (cited), mapped opportunities, **2-3 candidate approaches with trade-offs**, a recommendation, and the open questions the next step must resolve — **flagging which of those are stack decisions**, since that is what routes the hand-off in step 7. Discovery **proposes**; it does not decide the final stack.

6. **Save gate — ask first, never auto-save.** Ask the user whether to save the brief to `docs/discovery/YYYY-MM-DD-<topic>.md`:
   - **Yes** → write the file and offer to commit it.
   - **No** → do NOT create anything under `docs/discovery/`. The brief stays in this conversation only.

7. **Hand off — recommend the destination, then stop.** Research ends at `/create-plan`: it is what closes the decisions this brief left open, turning the findings into a plan with closed decisions, a runtime architecture diagram, ranked choices carrying their honest cost, a v1 vs Fase 2 cut, and the tasks that implement it.

   **The practical rule: if the brief ends with more than one candidate technology still in play, the destination is `/create-plan`.** Closing that kind of decision is exactly what it exists for, and its grill interrogates the plan afterwards.

   **`/specify` is an optional detour before it** — worth recommending only when the *definition* is what stayed fuzzy (what the thing does, for whom, with what boundaries), not the technology. It produces a design doc that `/create-plan` then reads; and having run it narrows the grill later rather than duplicating it.

   Say which one you'd pick and why, point it at this brief (the saved file, or this conversation), and **wait**. Do NOT invoke either one yourself.

## What discovery is NOT

- **Not an interview.** Discovery researches and teaches; it does not interrogate the user to extract a spec. Purpose, constraints, and acceptance criteria belong to `specify`, which clarifies and then grills.
- **Not a spec, and not a decision.** It opens questions; `create-plan` closes them, and `specify` closes the definition ones when it runs. Candidate approaches stay candidates.
- **Not implementation.** No code, no scaffolding, no stack locked in.
- **Not auto-saved.** The markdown brief is persisted to `docs/discovery/` only on an explicit user yes (step 6). Default is to keep it in the conversation.
- **Not glossary/ADR authoring.** Discovery may *surface* candidate domain terms or ADR-worthy decisions and list them as open questions; canonicalizing `CONTEXT.md` and writing ADRs belongs to whichever grill runs — `specify`'s, or `grill-with-docs` inside `/create-plan`.
- **Not unsourced.** "Best practice" with no citation is an opinion — go read first.

## Key principles

- Research-led, not interview-led — read and teach; ask only to aim the research (≤1 scoping question), never to extract a spec.
- Evidence over assertion — read the codebase and the docs before claiming.
- YAGNI on scope: map only what serves the decision at hand.
- Saving the brief is opt-in — ask before writing to `docs/discovery/`, never auto-save; if the user declines, persist nothing there.
- End at the human gate; recommend `/create-plan`, or `/specify` first when the definition rather than the technology is what stayed fuzzy — and let the user choose. Never automatic.
