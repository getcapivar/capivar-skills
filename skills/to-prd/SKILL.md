---
name: to-prd
description: "Turn the current conversation context into a PRD and publish it to GitHub issues via the gh CLI. Part of the issue-tracker route of the pipeline: /specify → /to-prd → /to-issues → /create-plan. Use when the user wants to create a PRD from the current context, or mentions 'PRD', 'to-prd', 'criar um PRD', or 'publicar como issue'."
---

# to-prd

Takes the current conversation context and codebase understanding and produces a PRD, then publishes it as a GitHub issue via `gh`. Do NOT interview the user — synthesize what you already know.

## Process

1. **Explore the repo** to understand the current state, if you haven't already. Use the project's domain vocabulary — read the relevant `CONTEXT.md` (or `CONTEXT-MAP.md` → per-context `CONTEXT.md` in this multi-context monorepo) and respect any ADRs in `docs/adr/` for the area you're touching.

2. **Sketch the test seams.** Prefer existing seams to new ones; use the highest seam possible. If new seams are needed, propose them at the highest point you can. Check with the user that these seams match their expectations.

3. **Write the PRD** using the template below, then publish it via `gh issue create` with the `ready-for-agent` label. No additional triage needed.

```bash
gh issue create --title "<feature>" --label ready-for-agent --body "$(cat <<'EOF'
<prd body>
EOF
)"
```

<prd-template>

## Problem Statement

The problem the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories in the format:

1. As an <actor>, I want a <feature>, so that <benefit>

Cover all aspects of the feature.

## Implementation Decisions

Modules built/modified, interfaces, technical clarifications, architectural decisions, schema changes, API contracts, specific interactions.

Do NOT include specific file paths or code snippets — they go stale fast. Exception: a prototype snippet that encodes a decision more precisely than prose (state machine, reducer, schema, type shape) — inline the decision-rich bits and note it came from a prototype.

## Testing Decisions

What makes a good test (external behavior, not implementation details); which modules will be tested; prior art in the codebase.

## Out of Scope

What is explicitly out of scope.

## Further Notes

Any further notes.

</prd-template>

> Hand-off: break the PRD into tickets with `to-issues`, then plan with `create-plan`.
