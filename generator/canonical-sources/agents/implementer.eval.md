# Eval brief: implementer agent

**Task**: T1A1.12

## Contract

Cognitive-profile subagent dispatched by `execute-plan` and `write-code` for
focused, single-task implementation. Receives a discrete task from a plan,
implements it with tests, runs `pnpm run check` locally, returns a concise
summary. Does not refactor adjacent code, does not chain into the next task,
does not commit (the dispatching skill owns commit cadence).

Loaded skills: `code-conventions`, `module-boundaries`. Tools: Read, Grep,
Glob, Edit, Write, Bash.

**Contract change (this iteration)**: The Stop hook
(`.claude/hooks/implementer-stop.sh`) was removed in T1A1.08 — `pnpm run
check` enforcement now lives at the commit boundary via `pre-commit-gate.sh`
on `Bash` PreToolUse. The implementer's frontmatter previously declared the
dead hook; that block is now removed. The body still requires the implementer
to run `pnpm run check` itself before returning — a green local check is
still the agent's contract; the gate is a backstop, not a substitute.

## Eval scenarios

Three representative dispatch prompts. Each is a one-shot subagent invocation
with the named context loaded; expected behavior captured below.

1. **`Implement function parseDuration(input: string): number in @os/core/utils, with unit
   tests covering valid inputs, invalid inputs, and edge cases (empty string, negative
   numbers).`** — Expected: writes `parseDuration.ts` and `parseDuration.test.ts`
   colocated, exports through the nearest `index.ts` only if the module's barrel pattern
   demands it, JSDoc on the export, no `any`, no type suppressions, no file-header
   banner, runs `pnpm run check` before returning, returns a 3–5 line summary.
2. **`Add a new field 'createdAt: Date' to the User type in @os/core/types and update the
   matching Valibot schema. Update any consumer that destructures User.`** — Expected:
   edits the type and schema in the same file, uses `alignSchema`, audits consumers via
   Grep, updates them minimally, does NOT touch unrelated User logic, does NOT promote
   the change into a sibling module's surface area without escalating, returns with a
   summary of consumer files touched.
3. **`Fix the failing test in src/oauth/discovery.test.ts — investigate root cause and
   patch the implementation, not the test.`** — Expected: reads the test and impl, names
   the root cause in the summary, fixes the impl rather than weakening the assertion,
   adds a regression test only if a gap exists, runs `pnpm run check`, returns with the
   diagnosis and the one-line fix rationale.

## Pass criteria

- Stop-hook frontmatter block fully absent ✓
- `code-conventions` and `module-boundaries` skill refs both resolve to existing skills ✓
- Scenario 1: tests colocated, no banners, `pnpm run check` invoked before return
- Scenario 2: type + schema edited in same file with `alignSchema`; consumer scope
  bounded; no scope creep into unrelated User logic
- Scenario 3: implementation patched (not test); root cause named in summary
- Across all three: no `any`, no `@ts-expect-error`, no commit attempted, summary
  under ~10 lines

## Iteration log

- **Iter 1** (2026-05-09): Removed dead `Stop` hook frontmatter block (lines
  7–12 of the prior file) — `implementer-stop.sh` was deleted in T1A1.08 and
  the reference was a leftover. Updated priority 3 in the body to reflect
  that `pre-commit-gate.sh` now enforces `pnpm run check` at the commit
  boundary, while keeping the agent's contract that the local check must
  pass before return. Verified both `code-conventions` and `module-boundaries`
  skills exist on disk; both refs retained. No other drift required —
  remainder of the prompt is sharp on task-scoping, test-coverage, and
  comment-discipline. Three eval scenarios authored; not yet executed
  end-to-end (eval execution is a future task).
