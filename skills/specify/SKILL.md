---
name: specify
description: "You MUST use this before any creative or implementation work — creating features, building components, adding functionality, or modifying behavior. Runs two phases: divergent brainstorming to open the design space, then an adversarial grilling pass that hardens the chosen design against the project's domain language and documented decisions. Produces CONTEXT.md, ADRs, and a committed spec trio (requirements/design/tasks). Use also when the user wants to stress-test a plan, get grilled on a design, or mentions 'spec', 'specify', 'brainstorm', or 'grill me'."
---

# Specify (Brainstorm → Grill → Spec)

Turn a raw idea into a hardened, committed specification. This skill runs in TWO distinct phases with OPPOSITE stances. Do not blend them — finish Phase A before starting Phase B.

<HARD-GATE>
Do NOT write code, scaffold a project, invoke any implementation skill, or take any implementation action until you have presented a design, the user has approved it, AND the spec has been written and the user has reviewed it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

## Output layout & context structure

The spec is a **trio** under `docs/specs/<feature>/`, committed to git — copy the skeleton from `docs/specs/_TEMPLATE/` and fill it:

```
docs/specs/<feature>/
├── requirements.md   # why + expected behaviour (stories, acceptance criteria, non-goals)
├── design.md         # how: architecture, approach, files touched, risks
└── tasks.md          # phases + Progresso table (source of truth) + verification gates
```

Declare the starting mode in the trio header — **requirements-first** (default) or **design-first** (hardening / strict NFR, where `design.md` leads). It's reversible; see `docs/specs/README.md`.

The glossary and ADRs follow the repo's context structure — infer which applies during exploration:

**Single context (most repos):** one `CONTEXT.md` and one `docs/adr/` at the root.

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

**Multiple contexts:** a `CONTEXT-MAP.md` at the root signals a multi-context repo. It lists the contexts, where each lives, and how they relate. Each context has its OWN `CONTEXT.md` and `docs/adr/`; only system-wide decisions go in the root `docs/adr/`.

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

**Detection (same as `grill-with-docs`):**
- If `CONTEXT-MAP.md` exists → multiple contexts; read it to find where each one lives and how they relate.
- Else if a root `CONTEXT.md` exists → single context.
- Else → single context for now; create a root `CONTEXT.md` lazily when the first term is resolved. Only introduce a `CONTEXT-MAP.md` if the work genuinely spans multiple bounded contexts (and confirm with the user first).

`CONTEXT-MAP.md` format — list the contexts with links and a Relationships section:

```md
# Context Map

## Contexts
- [Ordering](./src/ordering/CONTEXT.md) — receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md) — generates invoices and processes payments

## Relationships
- **Ordering → Billing**: Ordering emits `OrderPlaced`; Billing consumes it to invoice
- **Ordering ↔ Billing**: shared types for `CustomerId` and `Money`
```

Create files lazily — only when you have something real to write.

---

## PHASE A — Brainstorm (divergent)

Goal: understand intent and open the design space. Be generative and collaborative.

You MUST create a task for each item and complete them in order:

1. **Explore project context** — read files, docs, recent commits. Detect the context structure (see above): check for a `CONTEXT-MAP.md`, then a root `CONTEXT.md`, and read the relevant glossary and `docs/adr/` for the area you're touching.
2. **Scope check** — if the request describes multiple independent subsystems, flag it now and help decompose into sub-projects. Each sub-project gets its own specify → plan → implement cycle. Don't refine details of something that needs to be split first.
3. **Ask clarifying questions** — ONE at a time, waiting for each answer. Prefer multiple-choice. Focus on purpose, constraints, success criteria. If a question can be answered by reading the codebase, read it instead of asking.
4. **Propose 2-3 approaches** — with trade-offs. Lead with your recommendation and why.
5. **Present the design** — in sections scaled to complexity (a few sentences if simple, up to ~300 words if nuanced). Cover architecture, components, data flow, error handling, testing. Ask after each section whether it looks right.
6. **Get explicit approval** of the design before moving to Phase B.

Design principles: YAGNI ruthlessly. Favor small, well-bounded units with clear interfaces that can be understood and tested independently. In existing codebases, follow established patterns; only refactor what serves the current goal.

---

## PHASE B — Grill (convergent)

Goal: stress-test the approved design against the EXISTING domain model and the code. Be adversarial and precise. Interview relentlessly, one question at a time, walking each branch of the decision tree and resolving dependencies between decisions. For each question, give your recommended answer. If a question can be answered by exploring the codebase, explore instead of asking.

During the grill, do all of the following:

- **Target the right context (multi-context repos).** When a `CONTEXT-MAP.md` exists, infer which context the current topic belongs to and write to THAT context's `CONTEXT.md` and `docs/adr/`. Put only system-wide decisions in the root `docs/adr/`. If it's unclear which context the topic relates to, ask.
- **Challenge against the glossary.** If a term conflicts with the relevant `CONTEXT.md`, call it out immediately: "Your glossary defines X as A, but you seem to mean B — which is it?"
- **Sharpen fuzzy language.** Propose a precise canonical term for vague/overloaded words. Update the relevant `CONTEXT.md` inline the moment a term is resolved — don't batch.
- **Probe with concrete scenarios.** Invent edge-case scenarios that force precision about boundaries between concepts.
- **Cross-reference with code.** If the user states how something works, check whether the code agrees. Surface contradictions.

`CONTEXT.md` is a glossary and nothing else — keep it free of implementation details, specs, or scratch notes. Format: term in bold, one or two sentences defining what it IS, and an `_Avoid_:` line listing rejected synonyms. Only include terms specific to this project's domain, not general programming concepts.

**Offer ADRs sparingly.** Only create an ADR when ALL THREE are true: (1) hard to reverse, (2) surprising without context, (3) the result of a real trade-off with genuine alternatives. Write it to the relevant context's `docs/adr/NNNN-slug.md` (root `docs/adr/` for system-wide decisions). An ADR can be a single paragraph: what's the context, what was decided, and why. Skip it otherwise.

---

## PHASE C — Write & validate the spec

1. **Write the spec trio.** Copy `docs/specs/_TEMPLATE/` to `docs/specs/<feature>/` and fill `requirements.md` + `design.md` from Phases A/B. (`tasks.md` is produced at hand-off by `capivar-writing-plans` — it owns the Progresso table.) Commit.
2. **Self-review with fresh eyes:** scan for placeholders (TBD/TODO/vague requirements), internal contradictions, scope that's too large for one plan, and any requirement open to two interpretations — pick one and make it explicit. Fix inline.
3. **User review gate:** "Spec written and committed to `docs/specs/<feature>/`. Please review it and tell me if you want changes before we move to the plan." Wait. If changes are requested, make them and re-run the self-review.
4. **Hand off.** Only after approval, transition to the planning step:
   - Lean loop → invoke `capivar-writing-plans` (produces `tasks.md`).
   - Full pipeline (issue tracker) → invoke `capivar-to-prd`, then `capivar-to-issues`, then `capivar-writing-plans`.

The ONLY skills you invoke after specify are the planning/PRD skills above. Do not jump to any implementation or design-build skill.

## Key principles

- One question at a time, in both phases.
- Phase A opens; Phase B closes. Never interrogate while still exploring.
- Capture domain decisions (`CONTEXT.md`, ADRs) inline as they crystallize, not at the end.
- Incremental validation — approval after design, and again after the written spec.
