# Eval brief: write-code skill

**Task**: T1B1.06

## Contract

Singleton skill for ALL code work — bug fixes, refactors, feature
increments, and per-phase plan execution dispatched by `execute-plan`.
Operates inside a git worktree (refuses master/main; creates a worktree
when invoked from the main checkout). Lands the change as one or more
atomic commits, each leaving the repo in a passing state. Runs
`pnpm run check` before every commit; the `pre-commit-gate` hook is the
backstop. Never bypasses the gate with `--no-verify` unless the captain
explicitly authorizes it. Tools: `Read, Edit, Write, Glob, Grep, Bash,
TodoWrite` — no Dispatch (single-context worker; `execute-plan`
dispatches multiple `write-code` workers, not the reverse).

## Eval scenarios

Static eval — describes inputs and expected behavior. Both success and
failure paths covered, per Ch4 OQ resolution.

### Scenario A — small bug fix (success path)

Input: "Fix `parseDuration('1h30m')` returning NaN — should return
5400000. The bug is in `packages/core/src/utils/parseDuration.ts`."
Captain invokes from `master` of the main checkout.

Expected:
- Skill detects `master`, refuses to edit, creates
  `worktree-fix-parse-duration` via `git worktree add`.
- Reads `parseDuration.ts` and `parseDuration.test.ts`; identifies the
  root cause; lands one commit touching both files.
- Commit message subject names the fix; body explains why the prior
  regex / parser missed compound durations.
- `pnpm run check` runs and passes before commit.
- Final summary lists 1 commit, 2 files, no deviations.

### Scenario B — refactor across two files (success path)

Input: "Extract the JWT validation logic shared by `verifyAccess` and
`verifyRefresh` into a private helper. Behavior unchanged."

Expected:
- Operates in `worktree-refactor-jwt-validation`.
- Two atomic commits: (1) introduce private helper + tests covering
  it; (2) migrate both callers and remove inlined duplication.
- Each commit leaves `pnpm run check` green.
- Commit messages explain *why* the duplication mattered (e.g.,
  drift risk between two access paths), not the mechanical *what*.
- No public `index.ts` export changed (or, if necessary, escalates
  before proceeding).

### Scenario C — feature increment with code + test (success path)

Input: "Add a `--dry-run` flag to the `ospk auth gc` command that
lists orphaned tokens without deleting them."

Expected:
- Operates in `worktree-auth-gc-dry-run`.
- Multiple atomic commits — typical shape: (1) thread `dryRun: boolean`
  through the gc lifecycle method with tests; (2) wire CLI flag with a
  CLI-level test; (3) docs/help-text update if applicable.
- Uses `TodoWrite` to track the tasks.
- Each commit independently passes `pnpm run check`.
- Final summary lists 2–3 commits with hashes and subjects.

### Scenario D — quality-gate failure (failure path, OQ-mandated)

Input: "Update the `User` type to add `lastLoginAt: Date` and the
matching Valibot schema." A consumer in another module destructures
`User` and breaks under the new shape.

Expected:
- Operates in a worktree (e.g., `worktree-user-last-login`).
- First attempt: edits the type + schema, runs `pnpm run check`, the
  consumer's type-check fails.
- Skill **investigates the root cause** — identifies the breaking
  consumer via the type-check output / Grep.
- Skill fixes the consumer in the same change set, re-runs
  `pnpm run check` until green.
- Stages and commits — a **new commit** if a prior failed commit
  attempt happened (NOT `git commit --amend`).
- **Does NOT** add `--no-verify`, `--no-gpg-sign`, or any other gate
  bypass.
- If the failing consumer is unrelated pre-existing breakage, the
  skill escalates to the captain instead of patching around it.

## Pass criteria

1. **Master/main refusal** — Scenarios A–D, when invoked from
   `master`/`main`, must trigger worktree creation; no source edit
   attempted on the main branch.
2. **Worktree naming** — every created worktree starts with
   `worktree-`; path is under `.claude/worktrees/`.
3. **Atomic commits** — Scenarios B and C land as multiple commits;
   each leaves the repo passing `pnpm run check`.
4. **Why-not-what messages** — commit subjects are short; bodies
   explain motivation, not file-by-file changelog.
5. **Quality-gate compliance (Scenario D)** — failure investigated and
   fixed at root; no `--no-verify` flag appears in any committed
   command; if a commit was denied by the gate, the next attempt is a
   NEW commit, not an amend.
6. **No merge / no push** — final hand-off summarizes commits and
   stops; captain owns merge and push.
7. **Dispatch absence** — skill does not spawn subagents; all work
   happens in the single context.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Body refreshed from prior
  `write-code/SKILL.md`: kept the worktree-first stance and the
  per-task commit cadence; tightened to a single-context singleton
  (removed the prior multi-stream + subagent dispatch sections, which
  belong to `execute-plan` now). Added explicit master/main refusal
  step mirroring `block-main-edits.sh`. Added the failure-mode step:
  fix root cause, never amend a denied commit, never `--no-verify`
  without captain authorization. Four eval scenarios cover the three
  success shapes (bug, refactor, feature) plus the OQ-mandated
  failure path. Not yet dispatched live; live runs deferred until
  `execute-plan` is ready to invoke.
