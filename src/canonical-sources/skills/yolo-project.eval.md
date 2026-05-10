# Eval brief: yolo-project router skill

**Task**: T1B2.07

## Contract

L5 router skill at `.claude/skills/yolo-project/SKILL.md`. Top-level intent
classifier. Reads the captain's prompt, assigns one of seven intents
(`resume`, `ad-hoc-code`, `research`, `plan`, `execute`, `archive`,
`ambiguous`), ensures `/launch-project` has run when the chosen lifecycle
skill needs project context, and chains to the right skill via `/skill-name`.

Tools: `Read, Glob, Grep, Bash`. Deliberately omits `Write`, `Edit`,
`Dispatch` — the skill is a router, not a worker.

A successful run (a) classifies intent per the body's signal table without
auto-routing ambiguous prompts, (b) honors the disambiguation precedence
order (explicit `/skill-name` > session-opener > explicit lifecycle phrasing
> generic "work on" → ambiguous), (c) invokes `/launch-project` exactly when
the chosen intent needs project context, (d) bounds `/launch-project` retry
to one cycle and surfaces the refusal reason if the second attempt fails,
(e) chains to the chosen lifecycle skill via `/skill-name`, and (f) never
writes, edits, or dispatches subagents directly.

## Eval scenarios

Static evaluation — describe the expected routing decision per scenario; no
live invocation required. Seven scenarios, one per intent category.

### Scenario A — session-opener phrasing (resume)

Captain prompt: "Where were we?"

Expected:
- Intent classified as `resume`
- No `/launch-project` invocation (start-session orients itself)
- Single chained call to `/start-session` with the original prompt
- No clarification question to the captain

### Scenario B — ad-hoc code (write-code)

Captain prompt: "Fix the typo in `packages/oauth/src/lifecycle.ts`."

Expected:
- Intent classified as `ad-hoc-code`
- No `/launch-project` invocation (write-code does not require project context)
- Single chained call to `/write-code` with the original prompt
- No routing to `/execute-plan` despite the plan-adjacent path (no `pNN`
  prefix in the prompt → not plan-bound)

### Scenario C — research (create-spike, project-bound)

Captain prompt: "Research how OpenAI handles tool-call streaming partials."

Setup: cwd inside `docs/x000-yolo-project/`.

Expected:
- Intent classified as `research`
- `/launch-project` invoked first; resolves `x000-yolo-project` from cwd
- `/launch-project` returns metadata (no refusal)
- Then `/create-spike` invoked with the original prompt
- Order is launch-project → create-spike, never the reverse

### Scenario D — plan (create-plan, project-bound)

Captain prompt: "Spec the auth refactor."

Setup: cwd inside `docs/x000-yolo-project/`; no project name in prompt.

Expected:
- Intent classified as `plan` (not `ad-hoc-code`, despite "auth" — explicit
  lifecycle phrasing wins per precedence rule 3)
- `/launch-project` invoked first; resolves project from cwd
- Then `/create-plan` invoked with the original prompt

### Scenario E — execute plan (execute-plan, project-bound)

Captain prompt: "Execute p012 — let's build the next phase."

Setup: cwd at repo root (no project context); prompt names `p012`.

Expected:
- Intent classified as `execute` (plan ID in prompt → execute, not write-code,
  per precedence rule 5)
- `/launch-project` invoked, with the parent project of `p012` resolved from
  the prompt (project name passed explicitly to launch-project when known;
  otherwise launch-project's own resolution rules apply)
- Then `/execute-plan` invoked with the original prompt

### Scenario F — archive (archive-project, project-bound)

Captain prompt: "Wrap up x000-yolo-project — it's done."

Expected:
- Intent classified as `archive`
- `/launch-project` invoked with `x000-yolo-project` (named in prompt)
- Then `/archive-project` invoked with the original prompt
- Never auto-deletes project artifacts; archive-project owns that work

### Scenario G — ambiguous (no auto-route)

Captain prompt: "Let's work on something."

Expected:
- Intent classified as `ambiguous`
- Skill asks the captain a short structured clarification listing candidate
  intents (research / plan / write-code / start-session, etc.)
- No call to `/launch-project`
- No chained call to any lifecycle skill
- Skill stops after the question; waits for captain answer

## Pass criteria

For each scenario, the skill must:

1. **Intent classification matches the table.** The signal-to-intent mapping
   in the skill body decides; no creative re-interpretation.
2. **Precedence respected.** When signals overlap (Scenarios D and E),
   precedence rules 1–6 break the tie — never a coin flip.
3. **`/launch-project` precondition honored.** Project-bound intents (C/D/E/F)
   invoke `/launch-project` first; non-project intents (A/B) do not.
4. **`/launch-project` retry bounded to one.** If launch-project refuses,
   skill asks the captain once and retries once. A second refusal surfaces
   the reason and stops — never a third attempt.
5. **No auto-route on ambiguity.** Scenario G must result in a clarification
   question, not a guessed skill invocation.
6. **No direct writes / dispatches.** No scenario triggers `Write`, `Edit`,
   or `Dispatch`. The skill chains to other skills only.
7. **Explicit `/skill-name` override respected.** If the captain prefixed the
   prompt with `/create-spike` or any other skill, this router exits
   immediately rather than re-classifying. (Verify by code-review of the
   skill body — explicit override is the first precedence rule.)

## Iteration log

- **Iter 1** (2026-05-09): Authored `yolo-project` SKILL.md and this brief.
  Body encodes the seven-intent table from p01 Ch5, the precedence rules
  from spike Ch4:306–325 (with explicit `/skill-name` override as rule 1),
  the bounded `/launch-project` retry, and the no-auto-route rule for
  ambiguous prompts. Tools list deliberately omits Write/Edit/Dispatch — the
  skill is a router and owns no concrete actions. Static eval drafted; live
  evaluation deferred to the integration smoke check at the end of Phase 1.B
  (Ch5 layer convergence criterion 3).
