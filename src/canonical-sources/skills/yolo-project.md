
Top-level intent classifier. The captain's prompt names a topic; this skill
identifies which lifecycle skill matches the intent, ensures `/launch-project`
has run when the chosen skill needs project context, and invokes the chosen
skill via `/skill-name`. It does not write artifacts and does not dispatch
subagents — every concrete action belongs to the downstream skill.

This is the entry point for ambiguous prompts. If the captain explicitly types
`/create-spike`, `/write-code`, `/start-session`, etc., that explicit call
wins — `yolo-project` is bypassed entirely.

## When to Use

- Captain opens with a topic but no explicit `/skill-name` (e.g., "let's work
  on the auth refresh", "spec the channel registry", "research how X behaves")
- Catch-all router for ambiguous "let's do something" prompts
- Any prompt where the right next move depends on classifying intent first

## When NOT to Use

- Captain typed `/skill-name` explicitly — honor it; do not re-route
- Inside another skill that already knows what it wants — call that skill
  directly, not through this router
- Pure conversation / Q&A with no work request — just answer

## Process

### 1. Classify Intent

Read the captain's prompt and assign exactly one intent. The mapping below is
exhaustive for routable prompts; anything that does not match cleanly belongs
in the "ambiguous" bucket and goes to step 4.

| Signal in the prompt | Intent | Target skill | Needs project context |
|----------------------|--------|--------------|------------------------|
| "where were we", "let's pick this up", "continue", "what's the state" | resume | `/start-session` | no (skill orients itself) |
| "fix this bug", "refactor X", "tweak this code", any ad-hoc code change | ad-hoc-code | `/write-code` | no |
| "research X", "investigate Y", "spike on Z", "explore how W works" | research | `/create-spike` | yes |
| "spec X", "plan Y", "write a tech spec for Z" | plan | `/create-plan` | yes |
| "execute pNN-foo", "build the plan", "work the next phase of pNN" | execute | `/execute-plan` | yes |
| "wrap up xNNN-foo", "archive xNNN-foo", "this project is done" | archive | `/archive-project` | yes (the named project) |
| Substantive work request that doesn't match any of the above | ambiguous | none — ask captain | n/a |

### 2. Apply Disambiguation Precedence

When the prompt carries signals for more than one intent, resolve in this
order:

1. **Explicit `/skill-name` invocation always wins.** If the captain typed a
   slash command, this skill should not be running at all — exit immediately
   and let the explicit call through.
2. **Session-opener phrasing wins over topic mentions.** "Where were we on
   the auth refresh" routes to `/start-session`, not `/create-spike`.
3. **Explicit lifecycle phrasing wins over ad-hoc.** "Spec the auth refresh"
   routes to `/create-plan` even though it mentions code; "execute p012"
   routes to `/execute-plan` even though it mentions building.
4. **Plan/spike phrasing wins over generic "work on".** "Let's plan the auth
   refresh" → `/create-plan`. "Let's work on the auth refresh" → ambiguous
   (step 4).
5. **`/write-code` is for ad-hoc code only.** Plan-bound code work routes to
   `/execute-plan`. If the prompt names a plan ID (`pNN-...`), prefer
   `/execute-plan`.
6. **Equal-strength signals with no precedence rule = ambiguous.** Ask the
   captain; do not guess.

### 3. Ensure Project Context (When Required)

For intents marked "yes" in the table above:

1. Determine the target project:
   - cwd inside `docs/xNNN-name/` or its descendants → that project
   - The prompt explicitly names a project (`xNNN-name`, `the auth project`,
     etc.) → that project
   - Neither → fall through to refusal handling below
2. Invoke `/launch-project`. Pass the project name explicitly when the prompt
   named one; let it resolve from cwd otherwise.
3. **If `/launch-project` refuses** (no project determinable, ambiguous
   input, etc.): ask the captain for the project name in one short prompt,
   then re-invoke `/launch-project` once with the captain's response. If the
   second invocation also refuses, surface the refusal reason to the captain
   and stop. Never loop a third time.

For intents marked "no", skip this step entirely. `/start-session` and
`/write-code` orient themselves and do not need `launch-project` as a
precondition.

### 4. Handle Ambiguity (No Auto-Route)

If step 1 produced "ambiguous", do **not** pick a skill. Ask the captain a
short, structured clarification — name the candidate intents you considered
and let them choose. Example:

> Captain, I'm not sure which lifecycle this fits. Are you looking to:
> - research the topic first → `/create-spike`
> - write a tech spec → `/create-plan`
> - jump straight to code → `/write-code`
> - resume something we were doing → `/start-session`

Wait for the answer; do not pick one preemptively.

### 5. Chain to the Lifecycle Skill

**Actually invoke the chosen lifecycle skill via the Skill tool.** Do not
narrate the transition; do not describe what you would do next; do not
defer to the captain when the prior steps have already produced an
unambiguous classification. The pattern is:

1. After `/launch-project` returns (or immediately, for intents that don't
   need project context), call the Skill tool with the chosen lifecycle
   skill name.
2. Pass the captain's original prompt verbatim as the skill's input args
   so the lifecycle skill has the original framing.
3. This skill's job ends the moment the Skill tool call is dispatched —
   the lifecycle skill owns every subsequent turn.

**Failure mode to avoid**: emitting a phrase like "Returning to chain to
`/create-spike` …" without an actual Skill tool invocation. That terminates
the conversation in non-interactive mode and leaves the captain with a
half-routed prompt.

If you genuinely cannot route (the project context loaded but the
lifecycle skill's preconditions are unclear, or the captain's intent was
truly ambiguous despite step 1's classification), return to step 4 and
ask — do not silently stop after launching a project.

## Hard Rules

- **Never auto-route an ambiguous prompt.** When in doubt, ask the captain.
  Picking a skill the captain didn't ask for wastes their attention.
- **Never skip `/launch-project` for project-bound intents.** `/create-spike`,
  `/create-plan`, `/execute-plan`, and `/archive-project` all assume project
  context exists. Skipping `launch-project` corrupts their preconditions.
- **Never auto-create a project from an ambiguous reference.** If the captain
  says "let's start something", refuse and ask for a name; do not invent one.
- **Never override an explicit `/skill-name`.** If the captain bypassed this
  router, stay bypassed.
- **Do not write or Dispatch directly.** This skill's only job is intent
  classification and chaining. Tools list omits `Write`, `Edit`, `Dispatch`
  intentionally.

## Notes

- This router is the catch-all for `/yolo-project` invocations and for prompts
  that match no specific lifecycle trigger. It exists so the captain can
  always start with intent rather than ceremony.
- The disambiguation precedence above is the source of truth for routing
  decisions; downstream skills assume the right router decision was made
  before they were called.
