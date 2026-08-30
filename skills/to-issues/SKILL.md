---
name: to-issues
description: "Break a plan, spec, or PRD into independently-grabbable GitHub issues using tracer-bullet vertical slices, published via the gh CLI. Part of the issue-tracker route of the pipeline: /specify → /to-prd → /to-issues → /create-plan. Use when the user wants to convert a plan/spec into implementation tickets, or mentions 'to-issues', 'quebrar em issues', 'criar tickets', or 'fatias verticais'."
---

# to-issues

Break a plan/spec into independently-grabbable issues using vertical slices (tracer bullets), published via `gh`.

## Process

### 1. Gather context

Work from whatever is already in the conversation. If the user passes an issue reference (number, URL, or path), fetch it with `gh issue view` and read its full body and comments. The spec source is usually `docs/specs/YYYY-MM-DD-<topic>-design.md`, produced by `specify`.

### 2. Explore the codebase (optional)

If not already done, explore to understand current state. Issue titles/descriptions use the project's domain vocabulary — read the relevant `CONTEXT.md` (or `CONTEXT-MAP.md` → per-context `CONTEXT.md`) and respect ADRs in `docs/adr/`.

### 3. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice cutting through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be **HITL** (require human interaction — an architectural decision or design review) or **AFK** (implementable and mergeable without human interaction). Prefer AFK where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the breakdown as a numbered list. For each slice show: **Title**, **Type** (HITL/AFK), **Blocked by** (which slices must complete first), **User stories covered**. Ask whether granularity, dependencies, and HITL/AFK marks are right. Iterate until approved.

### 5. Publish the issues

For each approved slice, `gh issue create` using the template below, with the `ready-for-agent` label unless instructed otherwise. Publish in dependency order (blockers first) so you can reference real issue numbers in "Blocked by".

<issue-template>
## Parent

A reference to the parent issue (if the source was an existing issue, otherwise omit).

## What to build

A concise description of this vertical slice — end-to-end behavior, not layer-by-layer implementation.

Avoid specific file paths or code snippets — they go stale fast. Exception: a prototype snippet that encodes a decision more precisely than prose — inline the decision-rich bits, note it came from a prototype.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to the blocking ticket, or "None - can start immediately".

</issue-template>

Do NOT close or modify any parent issue.
