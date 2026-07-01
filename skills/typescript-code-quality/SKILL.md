---
name: typescript-code-quality
description: Use when writing or editing TypeScript — new files, new functions, refactors, or fixing type errors — to apply broad code-quality best practices across the whole change, favoring simplicity over complexity. Covers strict tsconfig/lint enforcement and no-any discipline, runtime validation at trust boundaries (external API/JSON/env data with Zod, parse vs safeParse, annotation vs assertion vs satisfies, env coercion gotchas), exhaustive discriminated unions, null/immutability, error handling (Error subclasses, Result types), async/promise correctness (no floating promises, parallel awaits), module and naming conventions, comments, plus a full anti-pattern catalog and a pre-completion checklist. Apply whenever a task touches .ts/.tsx code, type design, tsconfig or eslint strictness, Zod/runtime validation, or async code — even if the user does not explicitly ask for quality or type safety.
---

# TypeScript Code Quality

> **Apply this skill:** before writing any TypeScript — new files, new functions, or edits to existing ones.
> **Use it as reference, not linear reading:** read §0 plus the section relevant to your current task. Do **not** read the whole skill before writing — that wastes context.
> **Precedence:** the project's `CLAUDE.md` / `AGENTS.md` / `tsconfig` / lint config always wins. When they conflict with this skill, follow the project and note the deviation.
> **How rules read:** `RULE → WHY → ✅ do / ❌ avoid`. Earlier sections are higher leverage.

## Sections (quick lookup)

- **§0 Operating rules** — read first, always (simplicity comes first)
- **§1** tsconfig & lint (enforcement floor) · **§2** Type the domain · **§3** `any` / `unknown` / `as` / `satisfies`
- **§4** Functions & exhaustiveness · **§5** Null & immutability · **§6** Runtime validation at boundaries
- **§7** Error handling · **§8** Async & concurrency · **§9** Modules & naming
- **§10** Comments · **§11** Anti-pattern catalog (reject on sight) · **§12** Pre-completion checklist

---

## 0. Operating rules for the agent

1. **Simplicity first — before anything else.** Prefer the simplest construct that works, in code, types, and file/folder structure. Don't add an abstraction, generic, dependency, or layer of indirection when a plainer form suffices. Complexity is debt paid on every future read, edit, and test — it must earn its place. A type or helper with one caller is usually premature. When two designs are equally correct, ship the smaller one.
2. **Match the surrounding code.** Before writing, read 1–2 nearby files. Mirror their naming, error style, import style, and comment density. Consistency beats personal preference.
3. **Respect the toolchain.** Run the project's `typecheck` and `lint` before declaring done. Never silence an error you don't understand.
4. **Never weaken types to make an error disappear.** `any`, `as`, `!`, and `@ts-ignore` are last resorts, each requiring justification (see §3).
5. **Boundaries are validated, internals are trusted.** Validate untrusted data once at the edge (§6), then rely on the type system everywhere inside.
6. **State decisions in types, not comments.** A precise type documents itself and is checked. A comment rots.

---

## 1. Compiler & lint configuration (the enforcement floor)

A guide that depends on human discipline fails. Make the compiler and linter **reject** violations so they're caught before merge, not in review. A loose config defeats every rule below.

**1.1 tsconfig — the strict floor:**

| Option | Value | Why |
|---|---|---|
| `strict` | `true` | Enables the whole strict family. Non-negotiable. |
| `noUncheckedIndexedAccess` | `true` | `arr[i]` and `obj[key]` become `T \| undefined` — forces handling the missing case. |
| `exactOptionalPropertyTypes` | `true` | Distinguishes "absent" from "present and `undefined`". |
| `noImplicitOverride` | `true` | `override` keyword required — catches renamed base methods. |
| `noFallthroughCasesInSwitch` | `true` | Catches missing `break`/`return` in `switch`. |
| `noImplicitReturns` | `true` | Every code path must return. |
| `noPropertyAccessFromIndexSignature` | `true` | Forces `obj["dynamicKey"]` (bracket) for index-signature keys — keeps known vs dynamic access visible. |
| `verbatimModuleSyntax` | `true` | Forces explicit `import type`; clean, predictable emit. **Caveat:** requires ESM output (`module: "NodeNext"`/`"ESNext"`). On a CommonJS-emit project it errors — leave it off there rather than fighting it. |
| `forceConsistentCasingInFileNames` | `true` | Avoids cross-OS import breakage. |

**1.2 Lint — ban the unsafe escapes (typescript-eslint):**

```jsonc
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-floating-promises": "error",          // see §8.2
  "@typescript-eslint/consistent-type-assertions": ["error", { "assertionStyle": "never" }],
  "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-expect-error": "allow-with-description" }]
}
```

The `no-unsafe-*` family is what actually closes the gap: it blocks *using* externally-typed data without validating it first (§6). Run `tsc --noEmit` + lint as a CI merge gate.

✅ Assume strict mode + these lint rules. Write code that passes both cleanly.
❌ Do not propose disabling any of them to get past an error. Fix the code instead.

---

## 2. Type the domain first

Types are the design. Get them right and the implementation follows. Keep them as simple as the domain allows (§0.1) — reach for conditional/mapped-type machinery only when a plain union or object won't do.

**2.1 `type` vs `interface`.** Default to `type` — it expresses unions, intersections, mapped, and conditional types uniformly. Use `interface` when you need declaration merging, a class contract, or a public extension point; interfaces also display by name in hovers/errors (complex `type` aliases often expand inline), which helps on large shared library surfaces.

**2.2 Make illegal states unrepresentable.** Model so that bad combinations cannot be constructed.

```ts
// ❌ four impossible states (loading + data, error + data, ...)
type State = { loading: boolean; error?: Error; data?: User };

// ✅ discriminated union — exactly one shape is valid at a time
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: Error };
```

**2.3 Discriminate with a literal tag.** Every union member shares a singleton field (`status`, `type`, `kind`). It enables narrowing and exhaustiveness (§4.4).

**2.4 Prefer literal unions over `enum`.** Unions are simpler, tree-shakeable, and need no runtime object. Avoid `const enum` entirely across module boundaries — it is inlined at compile time and breaks under isolated transpilers (Babel, esbuild, SWC, `isolatedModules`).

```ts
// ✅
type Role = "admin" | "member" | "guest";
// ❌ avoid unless you need reverse-mapping or a nominal runtime value
enum Role { Admin, Member, Guest }
```

**2.5 Brand primitives that aren't interchangeable.** Stops mixing a `UserId` with an `OrderId`, or unvalidated input with validated.

```ts
type UserId = string & { readonly __brand: "UserId" };

// `as` is acceptable ONLY here: this is the single validated construction point
// for UserId. Callers must route through it; runtime validation belongs inside.
const asUserId = (s: string): UserId => s as UserId;
```

**2.6 Reuse, don't duplicate, shapes.** Derive with utility types instead of re-declaring: `Pick`, `Omit`, `Partial`, `Required`, `Readonly`, `Record<K, V>`, `ReturnType`, `Parameters`, `Awaited`, `NonNullable`. A derived type stays in sync with its source.

**2.7 `readonly` by default for data you don't mutate.** Mark object fields `readonly` and accept `readonly T[]` in parameters. Use `as const` for literal config.

```ts
const ROLES = ["admin", "member", "guest"] as const;
type Role = (typeof ROLES)[number]; // "admin" | "member" | "guest"
```

**2.8 `satisfies` validates a value against a type without widening it** — checks the shape while keeping the narrow inferred type, unlike an annotation (widens) or `as` (no check). Best for internal literals/config you own.

```ts
const routes = {
  users: { method: "GET", auth: true },
} satisfies Record<string, { method: "GET" | "POST"; auth: boolean }>;
routes.users;        // ✅ known key, literal types preserved
// routes.missing;   // ❌ compile error — precision kept (annotation would have widened it away)
```

---

## 3. `any` / `unknown` / `as` / `satisfies`

**3.1 `any` is a type-system off switch — it disables checking and silently spreads.** Treat its presence as a bug. The lint rules in §1.2 ban it and its unsafe consequences.

**3.2 Use `unknown` for genuinely-unknown input, then narrow.** `unknown` forces you to prove the type before use.

```ts
function parse(raw: unknown): User {
  if (!isUser(raw)) throw new ParseError("not a user"); // narrow, don't just `as User`
  return raw;
}
```

**3.3 Pick the right tool: annotation `: T` vs assertion `as T` vs `satisfies` vs schema.** These are not interchangeable.

| Form | What it does | Checked? | Use for |
|---|---|---|---|
| `const x: T = v` | **Annotation** — asks the compiler to check `v` against `T` | ✅ compile-time | declaring a value's type when you want it widened to `T` |
| `const x = v as T` | **Assertion** — you override the compiler | ❌ no | last resort, only when you know more than the compiler |
| `const x = v satisfies T` | **Check without widening** — keeps the narrow inferred type (§2.8) | ✅ compile-time | internal literals/config you own |
| `schema.parse(v)` | **Runtime validation** | ✅ runtime | any external/untrusted data (§6) — the only one that protects at runtime |

Prefer annotation over assertion: while the source is `any`, neither checks anything, but once a library tightens its return type from `any` to a concrete type that doesn't extend your `T`, the **annotation fails at compile time** to warn you while `as` keeps swallowing it. For external data, neither is enough — parse it (§6).

**3.4 Assertions (`as`) are claims the compiler can't verify.** Allowed only when you know more than the compiler and the alternative is worse. `as unknown as T` (double assertion) is a smell — if you reach for it, stop and write a type guard (§3.7) or a schema parse (§6).

**3.5 The non-null assertion `!` hides a possible crash.** Prefer a guard, optional chaining `?.`, or `??`. Use `!` only with a provable invariant, and state that invariant in a comment if it isn't obvious.

**3.6 `@ts-expect-error` self-cleans; never `@ts-ignore`.** `expect-error` fails the build once the underlying issue is fixed. Always add a one-line reason.

**3.7 Type guards encapsulate narrowing — for lightweight structural checks only.** A `x is T` predicate is fine for a quick shape check, but it validates only what you write. For full validation of external data, prefer a schema (§6) — a hand-written guard that checks one field will pass malformed objects.

```ts
function isUser(x: unknown): x is User {
  return typeof x === "object" && x !== null && "id" in x && typeof x.id === "string";
  // ↑ enough to narrow, NOT enough to trust as a full User — use schema.safeParse for that
}
```

---

## 4. Functions, control flow, exhaustiveness

**4.1 Annotate exported/public function return types.** Inference is fine for locals, but explicit returns on the public surface catch accidental changes and speed up the compiler. Keep parameter types explicit always.

**4.2 Accept the widest sensible input, return the narrowest type.** Parameters: `readonly T[]`, union of accepted shapes. Returns: the exact concrete type, never widened to `any`/`object`.

**4.3 Guard clauses over nested `if`.** Return early on the invalid/edge cases; keep the happy path at the lowest indentation.

```ts
function price(item: Item | null): number {
  if (!item) return 0;
  if (item.archived) return 0;
  return item.base * item.qty;
}
```

**4.4 Make `switch` over a union exhaustive with an `assertNever` helper.** Adding a union member then becomes a compile error at every unhandled site.

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.side ** 2;
    default: return assertNever(s); // ← compile error if a Shape kind is unhandled
  }
}
```

**4.5 One function, one responsibility.** If the name needs "and" to describe it, split it. Treat >~30 lines of logic (excluding guard clauses) as a signal to extract, not a hard limit. Default to pure functions — keep side effects at the call site that owns them.

**4.6 Cap parameter count.** ≥4 params → pass an options object with named fields. Order-dependent booleans are unreadable at the call site.

---

## 5. Null, undefined, and immutability

**5.1 Pick one absence convention and hold it.** Prefer `undefined` for "not provided" in TS code; reserve `null` for "explicitly empty" / external APIs that use it. Don't mix arbitrarily.

**5.2 Use `?.` and `??`, not `||`, for nullish defaults.** `||` swallows valid falsy values (`0`, `""`, `false`).

```ts
const limit = opts.limit ?? 100;   // ✅ keeps 0
const limit = opts.limit || 100;   // ❌ turns 0 into 100
```

**5.3 With `noUncheckedIndexedAccess`, treat indexed access as possibly-undefined.** `arr[i]`, `map.get(k)`, and `JSON.parse(...)` results need a check before use; don't reach for `!`.

**5.4 Don't mutate function inputs.** Return new values. Use `readonly`, spread, and immutable updates. Shared mutable state is the source of the hardest bugs.

**5.5 `readonly`/`as const` over `Object.freeze`.** `Object.freeze` enforces immutability only at runtime, with no compile-time guarantee and no deep freeze. Prefer `readonly` fields and `as const` — the compiler catches mutations and there's zero runtime cost.

---

## 6. Validate at runtime boundaries (schema-first)

TypeScript types vanish at runtime. Parse anything crossing a trust boundary (HTTP, env, file/JSON, IPC, message queue, third-party SDK) once, at the edge, then trust the type system inward.

**6.1 Validate at the edge with a schema library (e.g. Zod).** Parse to a typed value, then trust it inward. Name the schema distinctly from its type to avoid the value/type collision.

```ts
import { z } from "zod";

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.email(),                              // Zod v4 (v3: z.string().email())
  role: z.enum(["admin", "member", "guest"]),
});
type User = z.infer<typeof userSchema>;          // schema is the single source of truth

const user = userSchema.parse(await res.json()); // throws on bad shape; `user` is typed
```

> **Zod v3 vs v4:** examples use the current v4 API. On v3 some names differ: `z.string().email()` / `z.string().url()` instead of `z.email()` / `z.url()`, `.strict()` instead of `z.strictObject()`. Pin one major in `package.json` and stay on it.

**6.2 Derive types with `z.infer`** — never keep a separate `interface` alongside the schema; they drift.

**6.3 Use `safeParse` when invalid input is expected** (user forms, optional config) and you want to branch instead of throw.

**6.4 Validate environment variables at startup**, in one module, and export the typed result. Fail fast with a clear message. Watch the coercion gotcha:

```ts
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),  // "3000" → 3000 — safe
  DEBUG: z.stringbool().default(false),   // string → bool (v4)
  API_URL: z.url(),
});
export const env = envSchema.parse(process.env);
```

> ⚠️ **Never use `z.coerce.boolean()` for env vars** — it's `Boolean(string)`, so `"false"`, `"0"`, and *any* non-empty string become `true`. Use `z.stringbool()` (v4) or an explicit transform `z.enum(["true","false"]).transform(v => v === "true")`. `z.coerce.number()` is safe.

**6.5 Validate success/error contracts as a Zod discriminated union (§2.2).** Optional fields let you read `result` without checking `ok`.

```ts
const apiResult = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), result: z.array(z.string()) }),
  z.object({ ok: z.literal(false), code: z.number(), message: z.string() }),
]);
const data = apiResult.parse(await res.json());
if (data.ok) data.result;   // ✅ narrowed to the success branch
else data.message;          // ✅ compiler forces you to handle the error branch
```

**6.6 Reject unknown keys with `z.strictObject` when you need to detect contract drift.** Plain `z.object()` silently strips undeclared fields; `strictObject` fails on them — useful for security-sensitive input or catching an API that changed shape.

**6.7 Force `unknown` at the boundary so validation is mandatory.** Have boundary helpers return `unknown` instead of `any`; then any use without a schema parse is a compile error.

```ts
async function fetchJson(input: RequestInfo, init?: RequestInit): Promise<unknown> {
  const res = await fetch(input, init);
  if (!res.ok) throw new HttpError(res.status, await res.text());
  return res.json(); // Promise<any> is assignable to Promise<unknown> — no cast needed
}
const data = userSchema.parse(await fetchJson(url)); // ✅ can't skip validation
```

---

## 7. Error handling

**7.1 Throw `Error` (or a subclass), never strings or plain objects.** Only `Error` carries a stack trace.

**7.2 Model expected failures in the return type; reserve exceptions for the exceptional.** A `Result`/discriminated union makes failure visible and forces handling at the call site.

```ts
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

**7.3 Custom error classes for distinct, catchable categories.** Give them a discriminant (`code`) for branching, and set `this.name` so stack traces read correctly (without it, `error.name` stays `"Error"`).

```ts
class NotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  constructor(message?: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
```

**7.4 `catch` binds `unknown` — narrow before use.** Don't assume it's an `Error`.

```ts
try { /* ... */ } catch (e) {
  const message = e instanceof Error ? e.message : String(e);
}
```

**7.5 Never swallow errors silently.** No empty `catch {}`. Log, rethrow, or convert to a `Result` — but make the failure observable. (This also covers a bare `.parse()`: let the `ZodError` reach a boundary that handles it, or use `safeParse`.)

**7.6 Don't catch what you can't handle.** Let it propagate to a layer that can decide. A catch that only re-throws adds noise with no value:

```ts
// ❌ pointless — delete the try/catch entirely
try { return doWork(); } catch (e) { throw e; }
```

---

## 8. Async and concurrency

**8.1 `async`/`await` over raw `.then()` chains.** It reads top-to-bottom and the error path is a normal `try/catch`.

**8.2 Never leave a promise unawaited (no floating promises).** Either `await` it, return it, or — for fire-and-forget — attach a `.catch()` first, then optionally `void` to satisfy the lint rule (§1.2). A bare `void fn()` with no `.catch()` is the unhandled-rejection bug this rule warns about.

```ts
fireAndForget().catch((err) => logger.error(err));        // ✅ rejection handled
void fireAndForget().catch((err) => logger.error(err));   // ✅ also fine (void = "intentional")
void fireAndForget();                                     // ❌ rejection vanishes
```

**8.3 Parallelize independent awaits with `Promise.all`.** Sequential `await` of independent calls wastes wall-clock time. Note `Promise.all` rejects as soon as any input rejects, discarding the rest — use §8.4 when that's not acceptable.

```ts
// ✅ concurrent
const [user, orders] = await Promise.all([getUser(id), getOrders(id)]);
// ❌ serial for no reason
const user = await getUser(id);
const orders = await getOrders(id);
```

**8.4 Use `Promise.allSettled` when partial failure is acceptable** and you need every result regardless of individual rejections.

**8.5 Don't mix `await` inside `.forEach`** — it doesn't wait. Use a `for...of` loop (sequential) or `Promise.all(map(...))` (parallel).

**8.6 Make cancellation/timeouts explicit** with `AbortSignal` for network and long-running work; don't rely on the caller to abandon a hung promise.

**8.7 Use `using` / `await using` for scoped cleanup** (TS 5.2+) when a resource implements `Symbol.dispose` / `Symbol.asyncDispose` (file handles, DB connections, locks). It guarantees release even on early return or throw — more reliable than hand-written `try/finally`.

---

## 9. Modules, naming, organization

**9.1 Name by intent, not type.** `activeUsers` not `arr`; `parseConfig` not `doStuff`. Booleans read as predicates: `isReady`, `hasAccess`, `canEdit`.

**9.2 Casing convention (fallback when the project doesn't specify).** `camelCase` values/functions, `PascalCase` types/classes/components, `UPPER_SNAKE` true constants. Project config wins if it differs.

**9.3 Prefer named exports.** They keep names consistent across the codebase and are friendlier to automated refactoring and re-export than `default`.

**9.4 `import type` for type-only imports.** Clarifies intent and avoids accidental runtime imports (required under `verbatimModuleSyntax`).

**9.5 One responsibility per module.** Split a file when it exports functions serving unrelated concerns, or when it grows past ~150 lines of logic — a signal, not a hard cap. Split along the natural seam: group by what changes together. Don't pre-split into a maze of tiny files either (§0.1).

**9.6 Co-locate types with their usage; lift to a shared module only when ≥2 modules need the same type.** Don't pre-build a `types/` dumping ground.

---

## 10. Comments and documentation

**10.1 Comment rules.** Default: **write no comment** — the name and type carry the intent. When you must:
- Explain the **WHY** (a hidden invariant, a workaround and its cause, a deliberate deviation), never the **WHAT** — reading the code tells you what it does.
- Never reference a ticket, "added by", or "used by X" — these rot. Encode constraints in types where possible.
- Use TSDoc (`/** */`) on **public API surface only**: one-line summary, params, returns, thrown errors.

---

## 11. Anti-pattern catalog (reject on sight)

| Anti-pattern | Replace with |
|---|---|
| `any` anywhere (`: any`, `as any`, `<any>`) | `unknown` + narrowing, or a real type (§3) |
| `as SomeType` to silence an error | a type guard or schema parse (§3.4, §6) |
| `as unknown as T` double assertion | the real type via guard / schema (§3.4) |
| `(await res.json()) as T` with no validation | `schema.parse(await res.json())` (§6.1) |
| `x!` non-null assertion | guard, `?.`, `??` (§3.5) |
| `// @ts-ignore` | `// @ts-expect-error: <reason>` (§3.6) |
| `enum` for a closed set / any `const enum` | literal union (§2.4) |
| boolean flags multiplying states / optional success+error fields | discriminated union (§2.2, §6.5) |
| `value \|\| default` | `value ?? default` (§5.2) |
| `Object.freeze` for immutability | `readonly` / `as const` (§5.5) |
| separate `interface` + schema for the same shape | one schema + `z.infer` (§6.2) |
| `z.coerce.boolean()` for an env var | `z.stringbool()` / explicit transform (§6.4) |
| `throw "message"` | `throw new Error("message")` (§7.1) |
| empty `catch {}` / catch that only re-throws | log / rethrow / `Result`, or remove it (§7.5, §7.6) |
| `await` inside `.forEach` | `for...of` or `Promise.all` (§8.5) |
| serial independent awaits | `Promise.all` (§8.3) |
| bare `void fn()` fire-and-forget | `.catch()` the rejection first (§8.2) |
| mutating a function parameter | return a new value (§5.4) |
| `Function`, `Object`, `{}`, `object` as a type | the precise signature / shape |
| stringly-typed ids/status everywhere | branded type or literal union (§2.5, §2.3) |
| abstraction/generic/dependency with one caller | the inline, simpler form (§0.1) |

---

## 12. Pre-completion checklist

Before declaring a TypeScript change done, verify:

- [ ] The change is the **simplest** one that solves the problem — no speculative abstraction, generic, or dependency (§0.1).
- [ ] `typecheck` passes with **zero** errors; `lint` (incl. `no-unsafe-*`) passes without disabling type-safety rules.
- [ ] No `any` escapes left: grep the diff for `as any`, `as unknown as`, `: any`, `<any>`, `@ts-ignore` — none present.
- [ ] All untrusted input is schema-validated at its boundary; types are derived (`z.infer`), not duplicated.
- [ ] Success/error responses use a discriminated union; env booleans use `z.stringbool()`, not `z.coerce.boolean()`.
- [ ] No floating promises; independent awaits are parallel.
- [ ] Every `switch` over a union is exhaustive (`assertNever` default).
- [ ] Errors are `Error` subclasses; nothing is silently swallowed.
- [ ] Names state intent; public functions have explicit return types.
- [ ] New code matches the conventions of the surrounding files.

---

*Apply these rules while writing, not only in review. §12 is your self-assessment gate: a change that passes it is ready to ship. When in doubt, choose the simpler option (§0.1).*
