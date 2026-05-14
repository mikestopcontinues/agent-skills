# Eval brief: execute-plan skill

**Task**: T1B2.04

## Contract

L4 lifecycle skill. Per-phase plan execution; orchestrator that walks
an approved plan's phases sequentially (per Ch5 OQ2 — no intra-plan
parallelism), and per phase: stands up a worktree, dispatches
`/write-code` to land the phase, runs `/validate-code` against the
phase diff, drives the cluster-based triage / process /
lock-decisions cycle, and merges on convergence. State persists in
the plan's `tasks.md` across captain interruptions. Tools: `Read,
Edit, Write, Glob, Grep, Bash, TodoWrite, Dispatch`. Composes:
`/launch-project`, `/write-code`, `/validate-code`,
`/triage-feedback`, `/process-feedback`, `/lock-decisions`,
`/revise-doc`. Owns worktree lifecycle end-to-end (no leaks). Refuses
when no project is determinable; surfaces unresolved blocking
clusters at iteration cap rather than auto-looping.

## Eval scenarios

Per Ch5 line 167: only the synthetic small-plan scenario is in scope
for this iteration. Real-plan eval is deferred to Ch7's pre-pivot
system eval, after the toolkit has been used for a while.

### Scenario A — synthetic single-phase plan under x999-eval-seed (success path)

Input: a small synthetic plan staged at
`docs/x999-eval-seed/plans/p999-eval-refactor/` with:

- `README.md` — plan summary (one paragraph)
- `tasks.md` — one phase `T1A` with 2–3 unchecked task rows describing
  a small refactor against fixtures inside `docs/x999-eval-seed/`
  (e.g., extract a helper from a duplicated function in two fixture
  source files; add tests)
- A short chapter or inline acceptance criteria the worker can use

Captain invokes `/execute-plan p999-eval-refactor` from the main
checkout.

Expected:

1. **Pre-flight** — `/launch-project` resolves the parent project
   (`x999-eval-seed`); plan target confirmed; plan posture is
   executable.
2. **Phase identification** — phase `T1A` identified as the resume
   point (all rows unchecked); TodoWrite list built with one entry.
3. **Worktree creation** — `worktree-p999-t1a` created under
   `.claude/worktrees/`; `pnpm install` run; cwd switched into the
   worktree.
4. **Write-code dispatch** — exactly one `/write-code` Dispatch call
   with the phase's task list verbatim, plan ID, phase ID, and
   worktree path; worker returns a summary (commits, files, no
   deviations).
5. **Validate-code** — invoked with `artifact` = worktree path,
   `focusList` = `[accuracy, architecture, dx]` (no contextual
   reviewers — refactor in test fixtures triggers neither security
   nor performance nor integration), `iteration` = 1, `reviewDir` =
   `docs/x999-eval-seed/plans/p999-eval-refactor/`. New `rNN-*.md`
   files appear there.
6. **Triage cycle** — `/triage-feedback` invoked with the new review
   set; clusters routed per d11. Synthetic plan is constructed so
   triage returns no `act` / `process` / `lock-decisions` clusters
   (only `defer` nits) — a one-iteration convergence.
7. **Convergence + merge** — `pnpm run check` runs and passes; rebase
   onto base then `--ff-only` merge; worktree removed; branch
   removed; `pnpm install` re-run only if manifests changed.
8. **tasks.md update** — every row of phase `T1A` checked off in the
   committed `tasks.md` (the update lands as part of the merge or
   immediately after).
9. **Wrap-up** — summary lists the phase merge SHA; suggests (does
   not invoke) `/archive-project` if applicable; does not push.

### Scenario B — interruption + resume (state persistence)

Input: same synthetic plan, but the captain interrupts after step 6
above, before merge. Captain returns later and re-invokes
`/execute-plan p999-eval-refactor`.

Expected:

- Phase identification reads `tasks.md` and finds rows still
  unchecked (the merge never landed), so `T1A` remains the resume
  point.
- The pre-existing `worktree-p999-t1a` is detected and reused (not
  recreated); the loop picks up at the validate-code or merge step
  rather than re-running `/write-code` from scratch.
- Convergence and merge proceed exactly as in Scenario A from the
  resumption point onward.

### Scenario C — narrowed-options brief surfaces (captain interaction path)

Input: synthetic plan tweaked so one of the synthetic reviewers
returns a `process`-routed cluster that `/process-feedback` resolves
as `narrowed-options-brief` (e.g., two defensible naming choices for
the extracted helper).

Expected:

- The brief is surfaced to the captain via the lifecycle skill's
  output — verbatim options + recommendation.
- The skill **stops** and waits; it does not pick an option silently.
- On captain reply (option A or B), the chosen resolution is applied
  via `/revise-doc` (plan) or `/write-code` (code) per the option's
  target, then the loop continues from the next iteration.

## Pass criteria

1. **Project pre-flight gate** — `/launch-project` invoked first;
   refusal-on-no-project honored; one retry only.
2. **Sequential phases** — never spawns a second phase of the same
   plan in parallel; intra-plan concurrency is zero.
3. **Worktree naming + lifecycle** — every worktree starts with
   `worktree-` and matches `worktree-<plan>-<phase>`; created ones
   are merged or explicitly parked with captain approval; no leaks
   on success or convergence-failure paths.
4. **Validate-code scope** — `artifact` always points to the phase
   worktree (or its diff), never the whole repo; reviewers see only
   the phase's diff.
5. **Triage routing fidelity** — `act` / `auto-act` clusters drive
   `/revise-doc` (plan-targeted) or `/write-code` (code-targeted);
   `process` clusters dispatch `/process-feedback` in a single batch
   (cap 4); `lock-decisions` clusters drive `/lock-decisions`; nits
   route to `defer`.
6. **No silent picking** — narrowed-options briefs surface to the
   captain; the skill waits for a reply.
7. **State persistence** — `tasks.md` updated per phase, not deferred
   to the end; Scenario B's resume succeeds without re-doing landed
   work.
8. **Iteration cap** — minimum 2 iterations per phase; iteration 3
   with open blocking clusters surfaces to the captain instead of
   looping further.
9. **Quality gate compliance** — `pnpm run check` passes on the tip
   commit before merge; no `--no-verify` ever appears in any
   committed command.
10. **No push** — final summary stops at merge; the captain pushes.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Body authored from Ch5
  skeleton (lines 141–174). Encoded the per-phase loop as Phase 2
  with sub-steps 2a–2f; added Phase 0 pre-flight and Phase 3
  wrap-up. Sequential-phases rule from Ch5 OQ2 made explicit in the
  Hard Rules section. Worktree naming locked to
  `worktree-<plan>-<phase>` to align with `write-code`'s table.
  Validate-code focus list set to `accuracy, architecture, dx` per
  Ch5; contextual reviewers (security, performance, integration)
  scoped to phase nature. Triage routing handles act-target
  ambiguity (plan vs code) explicitly — common failure mode in
  earlier orchestrator drafts. Three eval scenarios: success, resume
  after interruption (state persistence), and narrowed-options
  surfacing (captain interaction). Real-plan eval deferred to Ch7
  per Ch5 line 167. Not yet dispatched live; the synthetic seed
  fixture under `docs/x999-eval-seed/` doesn't exist yet (it lands
  in a sibling task), so live execution waits on that fixture.

## Open uncertainties

- **`tasks.md` row format.** The skill assumes Markdown checkbox
  rows (`- [ ]` / `- [x]`) per the p01 task breakdown's own format.
  If a plan uses a different convention, the per-phase update step
  needs adapting — flagged for Ch7 system-eval review.
- **Plan directory canonicalization.** Phase 0 mentions both
  `docs/<project>/plans/` (project-scoped) and `docs/plans/` (legacy
  flat). The xNNN- migration in p01 will collapse to
  project-scoped; until then the body accepts both. Worth a single
  pass once the migration lands.
- **Rebase conflict behavior.** Phase 2e surfaces conflicts to the
  captain rather than auto-resolving. If multi-phase plans see
  routine rebase friction (likely in code-heavy plans), this may
  warrant a dedicated conflict-resolver dispatch — defer until
  observed.
