---
name: writing-plans
description: Use when you have a Capivar spec (the trio in docs/specs/<feature>/) and need to fill its tasks.md before touching code. Capivar project fork of `writing-plans` that writes the trio's tasks.md (Progresso table = source of truth) instead of a standalone plan file.
---

# writing-plans

Capivar fork of the upstream `writing-plans` skill (kept intact). Same discipline — bite-sized tasks, DRY, YAGNI, TDD, frequent commits — but the output is the **`tasks.md` of the spec trio**, not a standalone plan file. This honors the docs-restructure decision: `tasks.md` is the source of truth and it comes from this skill.

**Announce at start:** "I'm using writing-plans to fill the spec's tasks.md."

Write comprehensive tasks assuming the engineer has zero context for this codebase. Document which files to touch, the code, how to test it, and what docs to check. Bite-sized tasks. Assume a skilled developer who knows almost nothing about our toolset or domain.

## Output

Write to **`docs/specs/<feature>/tasks.md`** (the trio member; copy the skeleton from `docs/specs/_TEMPLATE/tasks.md` if it doesn't exist yet). Keep the **Progresso table** at the top as the single source of truth — phase status (⬜/🔄/✅) + "Fechada por" (the PR), updated in the SAME commit that delivers each phase.

## Scope check

If the spec covers multiple independent subsystems, it should have been split into sub-feature specs during `specify`. If not, suggest splitting — one spec/tasks per subsystem.

## File structure

Before defining tasks, map which files will be created or modified and what each owns. Design units with clear boundaries; files that change together live together; split by responsibility, not by technical layer. In existing code, follow established patterns; split a file only if it has grown unwieldy and you're already modifying it.

## tasks.md shape

Follow `docs/specs/_TEMPLATE/tasks.md`: the Progresso table, then one section per phase. Inside each phase, decompose into **bite-sized steps (2-5 minutes each)** — "write the failing test", "run it to see it fail", "minimal implementation", "run to see it pass", "commit". Each phase ends with its verification gate:

```
npx turbo run typecheck lint test --filter=<workspace>   # confirm via turbo exit, never tail
```

For docs-only markdown changes, the lefthook gate skips Turbo.

## No placeholders

Every step contains the actual content an engineer needs. Plan failures — never write them: "TBD"/"TODO"/"implement later"; "add appropriate error handling / validation / handle edge cases"; "write tests for the above" without the test code; "similar to phase N" (repeat it); steps that say what without showing how; references to types/functions not defined in any task.

## Self-review

After writing the full tasks.md, re-read the spec's `requirements.md` + `design.md` with fresh eyes:
1. **Spec coverage** — can you point to a task for each requirement/decision? List gaps; add tasks.
2. **Placeholder scan** — search for the red flags above; fix inline.
3. **Type consistency** — method signatures and names used in later phases match earlier ones.

Fix inline; no re-review needed.

## Execution hand-off

The Progresso table notes that **parallel execution is the swarm/Captain's job** in Capivar. After writing tasks.md, offer the execution path:

- **Capivar swarm** (Modo Dev) — dispatch phases as tasks to the Planner/Coder/Reviewer/Tester/Fixer/Decider workers via the Captain.
- **Subagent-driven (this session)** — `superpowers:subagent-driven-development` (fresh subagent per task + two-stage review).
- **Inline** — `superpowers:executing-plans` (batch with checkpoints).
