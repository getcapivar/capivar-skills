---
name: create-prompt
description: "Use when the user has a sentence they were about to send to an AI agent and wants it sharpened before sending — takes the raw phrasing and returns a better prompt, grounded in the repo when the request is about this codebase. Output lives entirely in the chat: this skill writes and edits NO files, ever. NOT the project plan — that is /create-plan. Use when the user mentions 'create-prompt', 'melhorar prompt', 'melhore essa frase', 'melhorar esse prompt', 'refinar prompt', 'afiar o prompt', 'improve this prompt', or types /create-prompt followed by a sentence."
---

# Create Prompt (Frase → Prompt afiado)

Take the sentence the user was about to send to an AI agent and give it back sharper. That is the
whole job. The output is text in the chat, ready to copy — never a file.

This is the first, optional step of the pipeline. It changes nothing on disk, so it costs nothing
to run and nothing to undo:

**`/create-prompt` → `/discovery` (opcional) → `/specify` (opcional) → `/create-plan` → grill →
`/subagent-driven-development`**

**Announce at start:** "I'm using create-prompt to sharpen this before you send it. I won't write
any files."

<HARD-GATE>
This skill **creates and edits no files. None.** No `ARCHITECTURE.md`, no `docs/`, no scaffolding,
no config, no source file, no scratch note. The entire output lives in the chat.

Reading the repository is allowed and encouraged. Writing to it is not — not even a file the user
would probably want. If the result needs to become a document, that is `/create-plan`, and the user
decides to go there.

Do not invoke `/create-plan`, `/discovery` or `/specify` yourself. Offer, then wait.
</HARD-GATE>

## Input

`/create-prompt <a frase que o usuário ia mandar>`.

If the user invoked the skill with no sentence, ask exactly **one** question — "qual frase você ia
mandar?" — and nothing more. Everything else you need, you read.

## Process

**1. Diagnose the sentence.** Name in 3–5 bullets what is missing, specifically. Each bullet points
at the sentence, not at prompt theory:

- **Ambiguous target** — which file, package, surface or environment. "o login" when the repo has
  three.
- **No success criterion** — nothing in the sentence says how the agent knows it is done.
- **Unstated constraint** — the thing that is obvious to the user and invisible to the agent:
  a version floor, a platform, a deadline, a file that may not be touched.
- **Undefined output shape** — a patch, a plan, an explanation, a list, a running command.
- **Missing context the agent cannot see** — the failure that prompted the ask, what was already
  tried, what the user already ruled out.

If a bullet does not apply, do not write it. Four honest bullets beat five padded ones.

**2. Ground it in the repository** — read-only, and cheap. When the sentence is about the current
repo, resolve the real names before rewriting: actual paths, the framework and version in the
manifest, the test command in the scripts, the conventions in `CLAUDE.md` / `AGENTS.md`. A prompt
that names `src/auth/session.ts` beats one that says "the auth code". If the sentence is not about
a repo, skip this step entirely — do not go hunting for a codebase to attach.

**Never invent a path.** A prompt that sends an agent to a file that does not exist is worse than
the vague sentence it replaced.

**3. Return the sharpened prompt in a code block**, ready to copy. It carries, in this order: the
context the agent needs, the task in one imperative sentence, the constraints, the observable
success criterion, and what **not** to do. Keep the user's intent exactly — sharpening is not
scope-widening. If the original asked for a fix, the rewrite asks for a fix, not a refactor.

**4. One line on what changed and why.** Not a diff, not a lecture — the single most load-bearing
change, so the user learns the pattern instead of only consuming the result. "Troquei 'arrumar o
login' por `src/auth/session.ts` e acrescentei o critério de sucesso, que era o que faltava para o
agente saber quando parar."

**5. Offer the hand-off, then wait.** "Quer que eu leve esta frase para a `/create-plan`?" Ask and
stop. Do not invoke it.

## What to sharpen, and what to leave alone

| Sharpen | Leave alone |
|---|---|
| Vague nouns → real paths, packages, commands | The user's actual goal — never widen it |
| "melhorar", "arrumar", "otimizar" → the observable outcome | Their tone and language |
| Implicit constraints → stated ones | Anything you would have to invent to state |
| Missing output shape → named shape | A deliberately open question, when exploring is the point |

**When the sentence is already good, say so** and hand it back with at most one addition. Rewriting
a clear prompt to look busy is the failure mode of this skill.

## What this is NOT

- **Not the project plan.** Deciding stack, architecture, scope and tasks is `/create-plan`, which
  writes `docs/plans/AAAA-MM-DD-<slug>.md`. This skill decides nothing.
- **Not research.** It does not evaluate libraries or compare approaches — that is `/discovery`.
- **Not a document generator.** It produces no file, by design. If the answer needs to persist, the
  right skill is `/create-plan`.
- **Not a system prompt writer.** This sharpens one request, not an agent's standing instructions.

## Key principles

- **Every specific it adds is a specific it read.** A sharpened prompt full of plausible invented
  detail is a worse prompt, however good it looks.
- The user's intent is the invariant. Everything else is negotiable.
- A prompt is finished when the agent can tell it is done without asking.
- Say what not to do. The constraint that prevents the wrong work is worth more than another
  sentence describing the right work.
