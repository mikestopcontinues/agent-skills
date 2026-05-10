# Eval brief: review-code skill

**Task**: T1A3.02

## Contract

Subagent-style skill dispatched by `validate-code`. Loads one
`__SKILL_HOME__/agents/review-{focus}.md` agent and runs it against a code
artifact (diff, file, or directory) — never against a whole project.
Resolves the artifact to a unified diff (using the file as-is if it is
already a `.diff`/`.patch`, otherwise via `git diff <baseRef>...HEAD`).
Writes a single `r{NN}-{focus}.md` review file at the caller-supplied
`targetFile` path and returns that path. Tools: `Read, Glob, Grep, Bash`
(no `WebFetch`, no `Dispatch`). Scope discipline (hard rule): findings
about inline comments / JSDoc prose are out of scope **unless** the
focus agent's mandate explicitly covers that surface.

## Eval inputs

Four scenarios drawn from real openspike commits. Static evaluation —
expected behaviors are documented; no live dispatch yet.

1. **Architecture — coupling/layout violation** — diff
   `git diff e2352e64^..e2352e64 -- packages/config/src/`
   (`refactor(config): harden resolution and permissions`). The diff adds
   `packages/config/src/pathAccess.ts` and
   `packages/config/src/toolsPermissions.ts` directly at `src/*.ts`.
   Per CLAUDE.md "src/ file layout", only package-export files may live
   at `src/*.ts`; everything else belongs in a submodule with `index.ts`.
   Focus: `architecture`.
   **Expected**: 2 Majors (one per misplaced file), each citing
   `packages/config/src/pathAccess.ts` and
   `packages/config/src/toolsPermissions.ts` with the layout rule.
   0 Blockers. ≤1 Minor on submodule shape. Must NOT flag the internal
   refactor inside `loader.ts` / `resolver.ts` (boundary intact).

2. **Accuracy — production change with no test** — synthetic fixture
   derived from `9790c72d` by stripping the two test-file hunks
   (`packages/skills/src/tools/skillSearch.test.ts` and
   `packages/tools/src/builtins/toolSearch/toolSearch.test.ts`), leaving
   only the `toolSearch.ts` and `skillSearch.ts` production changes that
   convert serial `await` calls into parallel `Promise.all`. Save under
   `tests/fixtures/review-code/T1A3.02/no-test.diff`. Focus: `accuracy`.
   **Expected**: 0 findings on accuracy. Accuracy reviews **external**
   factual claims — citations, vendor docs, version-pinned facts — not
   test coverage. Test absence belongs to a future `coverage` reviewer
   or to `comprehensiveness`. A run that flags missing tests under
   `accuracy` is a scope leak and fails. (This scenario primarily tests
   that the skill does not co-opt the wrong reviewer for the wrong
   concern.) If a `[UNVERIFIED]` JSDoc URL appears in the diff, that
   is in scope.

3. **Integration — public-API break** — diff
   `git diff c33ea970^..c33ea970 -- packages/oauth/src/`
   (`refactor(oauth)!: rename OAuthSupplierConfig to OAuthSupplierDeps`).
   Public exported type renamed; `createOAuthSupplier` signature changes
   from `(store, options)` to a single deps bag. Focus: `integration`.
   **Expected**: 1 Blocker naming the cross-package callers updated in
   the same commit (`packages/cli/src/command/serve.ts`,
   `packages/cli/src/command/oauth/controllerFactory.ts`,
   `packages/channel-discord/src/oauth/supplier.ts`). The reviewer must
   use `Grep` to corroborate the consumer list rather than trusting the
   diff's own caller updates. The commit's `!` marker and updated call
   sites are an acceptable migration path; if all callers are present
   in the diff, downgrade to 0 Blockers + 1 Minor recommending an
   explicit deprecation note. Either verdict passes — the eval checks
   the reviewer **traced the consumers**, not the final severity.

4. **Clean — negative control** — diff
   `git diff 9790c72d^..9790c72d` (`fix(search): batch discovery
   tracking callbacks`). Bug fix scoped to two files; tests added in the
   same commit; no public surface changes; no boundary crossings. Focus:
   `architecture` (any of the 8 focuses should pass, but architecture is
   the strictest single-focus negative).
   **Expected**: 0 Blockers, 0 Majors, 0 Minors, 0–1 Nit (purely
   stylistic). A run that surfaces any Major or Blocker on this diff is
   over-firing.

## Pass criteria

- **File written**: every scenario writes one `rNN-{focus}.md` to
  `targetFile`; skill returns that path verbatim.
- **Diff resolution**: scenario 1 resolves directory → `git diff`;
  scenario 2 reads the `.diff` file as-is; scenarios 3 & 4 resolve
  commit-range diffs. An empty diff produces a "No diff to review"
  summary, not invented findings.
- **Severity counts within tolerance** per scenario above
  (±1 Nit acceptable; named Blockers/Majors must match exactly).
- **Scope discipline** (the headline assertion): no scenario produces a
  finding about an inline comment or JSDoc prose unless the focus
  agent's mandate explicitly covers it. The most likely failure is
  scenario 1 or 4 surfacing a "this comment is misleading" finding —
  that fails the eval regardless of finding accuracy.
- **No cross-focus drift**: scenario 2 must not invent a "missing test"
  Blocker under `accuracy` (the wrong reviewer for that concern).
- **Citations**: every finding cites `path:line` from the diff's
  post-image. Findings without citations fail.

## Iteration log

- **Iter 1** (2026-05-09): Initial authoring against the Ch3 contract
  for `review-code`. Eval inputs are real recent commits chosen so each
  scenario exercises one risk class without overlapping the others:
  `e2352e64` for the `src/*.ts` layout violation (architecture),
  `9790c72d` stripped for "production change without test" (accuracy
  scope-leak guard), `c33ea970` for the renamed public type
  (integration consumer-tracing), and `9790c72d` whole for the clean
  negative control. Synthetic fixture (#2) is the only constructed
  input — it strips two test hunks from a real commit so the diff
  retains real production code shape. Scope-discipline assertion is
  encoded as both a hard pass criterion and a likely failure mode in
  scenarios 1/4. Awaiting first live dispatch.
