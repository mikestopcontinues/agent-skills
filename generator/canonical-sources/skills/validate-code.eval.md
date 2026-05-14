# Eval brief: validate-code dispatcher skill

**Task**: T1A3.04

## Contract

L2 dispatcher for code review. Mirrors `validate-doc` but operates on code
artifacts (a diff, a file, or a directory) and dispatches `review-code`
subagents per focus in parallel. Owns artifact-to-diff resolution,
`NN`-derivation against an existing `rNN-*.md` set, single-batch parallel
fan-out, and an honest summary that surfaces every reviewer error. Never
swallows failures; never auto-bypasses.

## Eval inputs

Three scenarios cover artifact resolution, parallelism, and the negative.

1. **Doc-history diff (skill-ecosystem chapter)** — artifact is the diff
   produced by `git diff master...HEAD --
   docs/x000-yolo-project/s01-harness-conversion/04-skill-ecosystem.md`.
   Focus list: `architecture, scope`. **Expected**: 2 `rNN-` files written
   (`r1-architecture.md`, `r2-scope.md` if reviewDir is empty), summary
   status `ok`, parallelism within threshold (see below). Confirms the
   dispatcher works end-to-end against a real, single-file artifact even
   when the artifact is a markdown file (review-code reviews the diff
   payload regardless of language; sibling reviewers handle prose-quality
   findings).
2. **Recent commit in openspike repo** — artifact is the worktree path of
   any package modified in the most recent commit on the current branch
   (e.g., `packages/oauth/src/lifecycle/`). Focus list: `architecture,
   accuracy, integration`. ReviewDir pre-populated with a stale
   `r1-architecture.md` from a prior iteration. **Expected**: 3 `rNN-`
   files written at `r2`, `r3`, `r4` (NN derivation skips the existing
   `r1`); no overwrite of `r1`; summary status `ok`; total wall-time
   within the parallelism threshold. This is the multi-focus dispatch
   case that catches off-by-one NN derivation and sequential-dispatch
   regressions simultaneously.
3. **Empty diff (negative control)** — artifact is a path that resolves
   to an empty diff (e.g., a file with no uncommitted changes against the
   merge-base, or a directory containing only unmodified files). Focus
   list: `architecture, accuracy`. **Expected**: skill refuses with the
   error message `validate-code: artifact '<path>' produced an empty diff
   against <base>; nothing to review.`; ZERO `rNN-` files written; ZERO
   subagent dispatches; summary status `failed` with reason `empty-diff`.
   This catches the failure mode where the dispatcher would otherwise
   spend reviewer budget on a no-op.

## Parallelism instrumentation

Each `review-code` reviewer agent's eval-mode prompt embeds a deliberate
`sleep 5` before producing the `rNN-` file (mirrors the `validate-doc`
instrumentation per Ch3). With four parallel subagents, total dispatcher
wall-time should approximate the slowest single reviewer.

**Threshold**: total wall-time < 1.5× per-reviewer sleep (~7.5s for a
5s sleep). If wall-time approaches Nx (e.g., ~20s for 4 reviewers at 5s
each), dispatch was sequential and the body needs the explicit
"single-batch" framing reinforced.

## Pass criteria

- Scenario 1: 2 `rNN-` files present, sequentially numbered from
  reviewDir's free integer; summary `ok`; wall-time within threshold.
- Scenario 2: 3 new `rNN-` files at the correct NN offsets; the existing
  `r1-` untouched; summary `ok`; wall-time within threshold; every
  finding cites lines in the diff (not in unrelated files).
- Scenario 3: zero dispatches, zero file writes, error message verbatim,
  summary `failed`. The dispatcher must NOT fall through to a "best
  effort" review.
- Across all scenarios: any reviewer error appears in the summary's
  `status`/`error` columns; no silent omission. A reviewer producing an
  empty `rNN-` file counts as `errored`, not `ok`.

## Static eval rationale

This brief documents *expected* dispatcher behavior without live runs.
The body produces the expected behavior because: artifact resolution
gates on file extension and `git diff` exit content (catches scenario 3
before any dispatch); the NN-derivation algorithm explicitly seeds
`next = max + 1` with the empty-directory case folded in (catches
scenario 2's off-by-one risk); and the single-batch dispatch directive
plus the no-silent-swallow summary contract jointly enforce parallelism
+ honest reporting (catches scenarios 1 and 2's wall-time threshold and
scenario 3's no-dispatch requirement). Live dispatch on first real use
in `write-code` or `execute-plan` integration.

## Iteration log

- **Iter 1** (2026-05-09): Initial authoring pass alongside the L1
  `review-code` skill. Three scenarios chosen to cover artifact
  resolution (doc-history diff vs source diff), the multi-focus
  parallel + NN-skip case, and the empty-diff refusal. Parallelism
  threshold lifted from `validate-doc` per Ch3:106. Live dispatch
  deferred to first integration with `write-code`.
