# Eval brief: archive-project lifecycle skill

**Task**: T1B2.03

## Contract

L4 lifecycle skill. Single-pass variant of the validate-loop. Inputs: a
project id (`xNNN-name`) or absolute project path. Behavior: pre-flight
link check; per-decision captain-confirmed promotion to top-level
`docs/decisions/`; per-item captain-confirmed follow-up move to
`docs/notes/`; cross-reference rewrite across all of `docs/` (markdown
link syntax + frontmatter `source:`, never bare prose); stage condensed
README; single-pass `/validate-doc` with `[comprehensiveness, clarity]`
focus list; captain confirms; **then** delete `tasks.md`, `decisions/`,
`notes/`, and every spike/plan directory; flip condensed README to
`status: archived`; commit atomically. Recovery is `git revert` of the
single commit. Tools: `Read, Edit, Write, Glob, Grep, Bash, Dispatch`.

Critical contract invariants:

- **Validate before delete.** Step 7 (deletion) only runs after step 6
  (`/validate-doc` + captain confirmation) passes. The prior body
  skeleton inverted these — this skill's whole point is the corrected
  ordering.
- **Per-decision captain approval for promotion.** No batch promote.
- **Cross-reference scope** = every Markdown file under `docs/`,
  including `docs/conventions/`, `docs/decisions/`, `docs/notes/`, and
  every other `docs/xNNN-*/`. Match link syntax and frontmatter
  `source:` only — never bare prose mentions.
- **Atomic commit.** All artifacts in one commit; recovery is one
  `git revert`.

## Eval scenarios

### Scenario A — synthetic seed at `docs/x999-eval-seed/` (deferred until seed exists)

Inputs:

- project: `x999-eval-seed`
- Seed contents (to be authored when this eval runs):
  - 1 spike `s01-foo/` with 2 chapters
  - 2 decisions in `decisions/`:
    - `d01-cross-cutting.md` — captain marks **promote**
    - `d02-project-internal.md` — captain marks **summarize-only**
  - 1 note in `notes/topic.md` — captain marks **move to docs/notes/**
  - `tasks.md` with 1 unchecked row — captain marks **drop**
  - 1 inbound cross-reference from a sibling project's chapter
    (markdown link syntax `](../x999-eval-seed/decisions/d01-cross-cutting.md)`)
  - 1 inbound cross-reference from `docs/conventions/<some>.md`
    (frontmatter `source: docs/x999-eval-seed/decisions/d02-project-internal.md`)

Expected post-archive state:

- `docs/decisions/d{next}-cross-cutting.md` exists with `d01`'s body
  copied verbatim, original-name slug preserved
- `docs/notes/topic.md` exists with `notes/topic.md`'s body
- `docs/x999-eval-seed/README.md` is the only file remaining in the
  project directory; frontmatter `status: archived`; body contains
  the promotion mapping table with both decisions, the moved note,
  and the dropped task
- `docs/x999-eval-seed/tasks.md`, `decisions/`, `notes/`, and
  `s01-foo/` are deleted from disk (recoverable from git history)
- The sibling project's inbound link is rewritten from
  `](../x999-eval-seed/decisions/d01-cross-cutting.md)` to
  `](../decisions/d{next}-cross-cutting.md)`
- The convention file's `source:` frontmatter is rewritten from
  `docs/x999-eval-seed/decisions/d02-project-internal.md` to
  `docs/x999-eval-seed/README.md` (the summarize-only target)
- `/validate-doc` ran with focus list `[comprehensiveness, clarity]`
  and produced two `rNN-` files prior to deletion (and those rNN-
  files are themselves deleted in step 7 along with the spike dir)
- `git log -1` shows one atomic commit touching: condensed README,
  promoted decision, moved note, two link rewrites, four deletions
  (tasks, decisions/, notes/, s01-foo/)

### Scenario B — real archived candidate (deferred)

Per Ch5: deferred until the captain has a real candidate (a project the
captain decides is genuinely done). When that exists, drive the skill
end-to-end against it; verify against the captain's ground truth for
which decisions to promote, which notes to move, and which references
to rewrite. Expected to surface this scenario's findings as the second
iteration entry.

## Adversarial side-checks

- **Pre-flight broken link** — seed a single broken link before
  invoking the skill. Expected: skill aborts at step 1, reports the
  broken link, performs no other work. No promotion, no rewrite, no
  staging, no deletion, no commit.
- **Captain rejects a promotion** — when asked about `d01`, captain
  says "summarize only". Expected: `d01` does NOT land in
  `docs/decisions/`; the mapping table records `d01` as
  summarize-only; the cross-reference rewrite from the sibling
  project re-targets the condensed README, not a non-existent
  promoted file.
- **Validate-doc surfaces a blocking finding** — seed the condensed
  README with a comprehensiveness gap (e.g., omit one of the
  decisions from the mapping table). Expected: step 6's
  validate-doc surfaces the gap; skill applies act-items and
  re-presents to captain; **does not proceed to step 7** until
  captain confirms. Source content is still on disk; nothing is
  deleted.
- **Bare prose mention is not rewritten** — seed a sibling chapter
  with a paragraph like "see `docs/x999-eval-seed/decisions/d01-cross-cutting.md`
  for context" (no link syntax, no frontmatter). Expected: the
  paragraph is untouched after step 4; only the link-syntax and
  frontmatter occurrences get rewritten.
- **Re-run on already-archived project** — invoke the skill a second
  time on `docs/x999-eval-seed/` after archive. Expected: skill
  detects `status: archived` in the project README's frontmatter
  and refuses with a clear message ("project already archived; `git
  revert` the archive commit first").

## Pass criteria

1. **Step ordering** — deletion (step 7) only happens after
   `/validate-doc` (step 6) returns and the captain explicitly
   confirms. An eval mid-run snapshot taken between step 6 and
   captain confirmation must show all original source files still
   on disk.
2. **Per-decision approval** — every promotion is preceded by a
   captain prompt; no decision lands in `docs/decisions/` without
   the captain having said yes to that specific decision.
3. **Cross-reference scope correctness** — both the sibling-project
   link and the `docs/conventions/` `source:` frontmatter are
   rewritten; bare prose mentions are not. The rewrite report
   surfaces orphans (refs that match no mapping entry) before
   step 5 begins.
4. **Atomic commit** — exactly one commit lands; `git status` is
   clean for the archive scope after step 9; the commit message
   names the project, promoted count, moved count, rewritten count.
5. **Recovery** — `git revert <commit>` restores the project
   directory to its pre-archive state, including all spike/plan
   chapters and decisions. (Verify by diffing post-revert tree
   against pre-archive snapshot.)
6. **Pre-flight gate** — broken link before invocation aborts the
   skill at step 1 with no other side effects on disk.

## Pre-condition for live dispatch

Scenario A requires `docs/x999-eval-seed/` to exist as an authored
synthetic seed. The seed itself is not part of this task — its
authoring is captured separately and lands when the lifecycle layer's
integration smoke check runs (T1B2.10 layer convergence). Until then,
this eval is a **static eval**: verify the body's step ordering,
cross-reference scope, captain-confirmation gates, and atomic-commit
shape by inspection, plus a single-shot live run against a hand-rolled
fixture if the captain wants pre-merge confidence.

## Static eval rationale

The skill body produces the expected behavior because:

- Step 1 explicitly aborts on broken-link pre-flight (no work happens
  with a broken link graph; matches adversarial side-check 1).
- Step 2 walks decisions one at a time and asks the captain per
  decision (matches Scenario A's per-decision branching and
  adversarial side-check 2).
- Step 4 enumerates the cross-reference scope (`docs/conventions/`,
  `docs/decisions/`, `docs/notes/`, every other `docs/xNNN-*/`) and
  the two reference shapes (link syntax, frontmatter `source:`),
  with explicit "do not match bare path mentions" guidance (matches
  the convention-file rewrite expectation and adversarial
  side-check 4).
- Step 5 stages the condensed README **without deleting source**;
  step 6 runs `/validate-doc` against the staged README; step 7
  deletes only after captain confirmation (matches the validate-
  before-delete invariant and adversarial side-check 3).
- Step 8 verifies `status: archived` and step 9 stages every
  touched artifact in one commit (matches the atomic-commit pass
  criterion and the recovery story).
- The hard-rules section explicitly forbids re-running on an
  archived project (matches adversarial side-check 5).

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Skeleton authored from
  p01 Ch5 lines 103–139 (archive-project section) with the
  corrected step 5/6 ordering per Ch5 r03 B3 (validate before
  delete). Cross-reference scope spelled out per Ch5 (markdown
  link syntax + frontmatter `source:` across `docs/conventions/`,
  `docs/decisions/`, `docs/notes/`, and every other
  `docs/xNNN-*/`; bare prose mentions excluded). Promotion
  mapping table shape and condensed README structure pulled from
  spike Ch3:395–415 (project-organization). Live dispatch
  deferred until the synthetic seed at `docs/x999-eval-seed/`
  exists; Scenario B (real archived candidate) deferred per Ch5
  until the captain identifies one.
