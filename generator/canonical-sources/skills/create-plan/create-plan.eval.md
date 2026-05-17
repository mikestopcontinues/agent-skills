# Eval brief: create-plan skill

**Task**: T1B2.02

## Contract

L4 lifecycle skill at `.claude/skills/create-plan/SKILL.md`. Same shape as
`/create-spike`; differs in baseline reviewer focus list (`accuracy,
architecture, integration, dx, scope` per d08) and target artifact (a plan
under `<project>/plans/pNNN-<name>/`, not a spike).

A successful run:

1. **Pre-flight**: invokes `/launch-project`; refuses cleanly if no project is
   determinable from cwd or prompt; retries once after asking the captain.
2. **Frames the plan** before scaffolding: problem, constraints, success
   criteria, source spike (if any). Confirms with the captain when the source
   is not a fully approved spike.
3. **Scaffolds via `/write-doc`** which delegates to `doc-create.sh plan
   <name>` — never improvises path or picks a `pNNN-` number manually.
4. **Per-chapter validate-loop** in dependency order:
   - `/write-doc` for chapter authoring
   - `/validate-doc` with focus list `[accuracy, architecture, integration, dx,
     scope]` (plus contextual focuses where warranted)
   - `/triage-feedback` to cluster + route
   - `/revise-doc` for `act` / `auto-act` clusters
   - `/process-feedback` (parallel single-Task batch, cap 4) for `process`
     clusters; `verified-resolution` outputs apply via `/revise-doc`,
     `narrowed-options-brief` outputs surface only when blocking
   - `/lock-decisions` for `lock-decisions` clusters
   - Iterates with min 2 / hard cap 3 per chapter
5. **Overall pass** runs `/validate-doc` + same triage / revise / process /
   lock-decisions cycle against the plan's `README.md` once all chapters
   converge. Captain decides whether to re-open a chapter from an overall
   finding — never auto-loops.
6. **Convergence summary** to the captain enumerates per-chapter convergence,
   locked decisions (`dNN-` files), and **pending clusters** (mandatory — no
   hiding per d11), plus narrowed-options-briefs awaiting captain input.

Tools: full orchestrator set (`Read, Edit, Write, Glob, Grep, Bash, WebFetch,
WebSearch, TodoWrite, Dispatch`).

## Eval scenarios

Lifecycle skills are heavyweight (multi-subagent dispatch, full validate-loop
convergence). Two inputs per Ch5's per-skill iteration depth rule.

### Scenario A — small synthesized plan from an existing spike's recommendations

**Input**: derive a small 3-chapter plan from a known spike's recommendations
(e.g., a synthetic plan against `s01-harness-conversion`'s validation
discriminator decisions, scoped to a refactor that touches one package).

**Expected behavior**:

- `/launch-project` resolves to `x000-yolo-project` from the harness conversion
  spike's location; no captain prompt needed.
- Captain confirms the 3-chapter outline before authoring (problem framing,
  approach + boundaries, task breakdown).
- Per chapter: `/write-doc` authors → `/validate-doc` dispatches 5 reviewers
  in parallel (`accuracy, architecture, integration, dx, scope`) → 5 rNN-
  files land → `/triage-feedback` clusters and routes per d11.
- `integration` reviewer fires on the chapter that interacts with sibling
  packages; `scope` reviewer fires on the task-breakdown chapter.
  Decision-shaped clusters (any `r05-scope.md` finding, plus
  `major`/`blocker` `r02-architecture.md` findings) route to
  `/lock-decisions`; captain locks at least one decision via
  `/create-decision`.
- All three chapters converge in 2 iterations each (no third iteration).
- Overall pass runs against the README; surfaces no chapter-scoped reopens
  (clean overall convergence).
- Convergence summary lists the 3 chapter convergence rows, links the locked
  `dNN-` file(s), and shows an empty pending-clusters list.

**Failure modes this scenario guards**:

- Skipping `/launch-project` (orphaned files at `docs/`)
- Sequential `/process-feedback` dispatch (must be one Task batch)
- Hiding pending clusters in the summary (forbidden per d11)
- `integration` or `scope` reviewers absent from the dispatched focus list
  (these are the create-plan-specific baselines — the whole point of d08's
  reviewer-set distinction from create-spike)

### Scenario B — drive against this very plan (p01-agent-skills-toolkit)

**Input**: re-run the create-plan lifecycle against the existing `p01-agent-
skills-toolkit` plan as if authoring it fresh. The plan has 11 chapters, 5
existing rNN- review files at the README level, 3 phases, and 14 locked
decisions (`d01–d14`). The skill should match the captain's actual experience
authoring this plan.

**Expected behavior**:

- `/launch-project` resolves from cwd inside the worktree; project context
  loads `x000-yolo-project`'s README, tasks, and prior decisions.
- Per-chapter validate-loop fires on each of the 11 chapters; `integration`
  reviewer surfaces cross-chapter coupling findings (plan ↔ spike ↔ tasks);
  `scope` reviewer surfaces sub-phase boundary findings (the kind that drove
  the Ch1 sub-phase split per r02 in this very plan).
- Multiple `/lock-decisions` invocations land across chapters (the plan's d05,
  d11, d13, d14 all derive from triage-routed decision-shaped clusters in the
  way this skill encodes).
- Overall pass against `README.md` validates the 5 rNN- file set's findings
  are addressed; surfaces residual chapter-scoped issues (if any) for
  captain reopen-or-defer decision; never auto-loops.
- Convergence summary lists all 14 decisions linked, per-chapter convergence,
  and any narrowed-options-briefs the captain still owes.

**Failure modes this scenario guards**:

- Auto-looping a chapter from an overall-pass finding (must be captain's call)
- Missing the `integration` or `scope` reviewer baselines (they're the
  plan-vs-spike differentiators per d08 — if a captain runs `/create-plan` and
  only sees the `/create-spike` reviewer set, the skill is broken)
- Producing a convergence summary that omits any of the 14 decision links or
  the pending-cluster list

This second scenario is intentionally mapped to a real, complex plan the
captain has actively shepherded. It catches the failure modes that only emerge
under realistic chapter count + decision density. Live re-run is deferred
until the toolkit is operational end-to-end (per Ch5's iteration-depth note);
until then, eval is static — match the skill body's encoded behavior against
the captain's actual experience-of-record from authoring p01.

## Pass criteria

1. **Project context required** — every run begins with `/launch-project`. A
   run that authors plan files without project context = fail.
2. **Plan-baseline focus list** — `/validate-doc` dispatches with focuses
   `[accuracy, architecture, integration, dx, scope]` (the d08 create-plan
   baseline). Missing `integration` or `scope` from any per-chapter or
   overall dispatch = fail. These are the whole reason create-plan is a
   distinct lifecycle from create-spike.
3. **Per-chapter convergence discipline** — minimum 2 iterations per chapter;
   hard cap 3; clusters remaining after iter 3 surface in the summary.
   Stopping at iter 1 on a clean pass = fail (the second iteration confirms
   stability).
4. **Overall pass mandatory** — `/validate-doc` + triage cycle runs against
   the plan README after all chapters converge. Skipping this pass = fail.
5. **No auto-loop from overall pass** — when the overall pass surfaces a
   chapter-scoped finding, the skill asks the captain rather than silently
   reopening that chapter for another iteration.
6. **Parallel `/process-feedback`** — `process` clusters dispatch in a single
   Task batch (cap 4). Sequential per-cluster dispatch = fail.
7. **Decision routing** — every cluster from `r05-scope.md` and every
   `major`/`blocker` cluster from `r02-architecture.md` routes to
   `/lock-decisions`, not `/process-feedback`. A decision-shaped cluster sent
   to process must be detected via the hand-back marker and re-routed.
8. **Pending clusters surface in summary** — the convergence summary
   enumerates every cluster that did not land a resolution. Hiding them =
   fail (per d11).
9. **Locked decisions linked** — every `/create-decision` invocation produced
   by `/lock-decisions` during the run shows up as a linked entry in the
   summary.
10. **Scaffold delegation** — plan scaffold goes through `/write-doc` →
    `doc-create.sh plan <name>`; never `Write` a `pNNN-` directory or pick a
    number manually.

## Iteration log

- **Iter 1** (2026-05-09): Refreshed `create-plan/SKILL.md` per Ch5 contract
  (lines 85–101 of `05-lifecycle-and-routers.md`). Stripped prior phase-based
  structure (Phase 1–6) and pre-d11 routing language. Encoded the per-chapter
  validate-loop with explicit invocations of `/launch-project`, `/write-doc`,
  `/validate-doc`, `/triage-feedback`, `/revise-doc`, `/process-feedback`, and
  `/lock-decisions`. Encoded the d08 create-plan baseline focus list
  (`accuracy, architecture, integration, dx, scope`) — the differentiator from
  create-spike's `accuracy, architecture, depth, dx`. Encoded convergence
  rules (min 2, hard cap 3), overall-pass discipline (no auto-loop on
  chapter-scoped findings), and the mandatory pending-clusters surface in the
  convergence summary. Two scenarios cover a synthesized small plan and a
  drive against p01 itself; the second guards integration + scope baseline
  presence and the realistic chapter-count failure modes. Live dispatch
  deferred per Ch5's lifecycle-skill iteration-depth note (heavyweight evals
  budget against the toolkit being operational end-to-end).
