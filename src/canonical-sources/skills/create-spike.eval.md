# Eval brief: create-spike skill (refresh)

**Task**: T1B2.01

## Contract

L4 lifecycle orchestrator — drives the full spike-creation flow by composing
L3 singletons (`/launch-project`, `/write-doc`, `/revise-doc`,
`/lock-decisions`, `/create-decision`) with L2 dispatchers (`/validate-doc`,
`/triage-feedback`, `/process-feedback`). Inputs: a captain prompt naming a
research question and a proposed chapter list (or enough context to elicit
both). Tools: `Read, Edit, Write, Glob, Grep, Bash, WebFetch, WebSearch,
TodoWrite, Dispatch` — full orchestrator toolset per p01 Ch5.

Hard contract:

- **Pre-flight invokes `/launch-project`**; one-retry pattern on refusal;
  abort on second refusal with the launch-project error verbatim.
- **Per-chapter loop**: `/write-doc` → `/validate-doc` (baseline focus
  list `[accuracy, architecture, depth, dx]`) → `/triage-feedback` →
  per-cluster routing (`act`/`auto-act` → `/revise-doc`; `process` →
  `/process-feedback` parallel cap 4; `lock-decisions` →
  `/lock-decisions`; `defer` → record).
- **Per-chapter convergence**: minimum 2 iterations; hard cap iter 3
  surfaces unresolved clusters.
- **Overall pass** on the spike `README.md` after all chapters converge
  (same routing). README-level clusters that are chapter-scoped surface
  to the captain — never auto-reopen the chapter.
- **Convergence summary** lists pending clusters explicitly (per d11);
  empty list is stated as such.
- **Process-feedback dispatch is parallel** (single Task batch, cap 4
  per round).

## Eval inputs

Two inputs cover the full surface — synthetic small spike + real spike
chapter re-validation. Per p01 Ch5: "Eval inputs are real artifacts from
this repo (or a small synthetic fixture under `docs/x999-eval-seed/`)";
lifecycle skills are heavyweight, so the input set is intentionally small.

1. **Synthetic small spike (2 chapters)** — captain prompt:
   "research how the existing repo's note frontmatter compares to the
   decision frontmatter; propose a unified shape." Synthetic question
   crafted so two short chapters (current state; comparison) suffice.
   **Expected**:
   - Pre-flight `/launch-project` lands without retry (cwd inside an
     active project) and returns project metadata.
   - Spike scaffolded via `doc-create.sh spike` (or `yolo new`); `Write`
     never used directly on the `sNNN-<name>/README.md` path.
   - Chapter 1 author → validate (focuses
     `accuracy, architecture, depth, dx`) → triage → cluster routing.
   - Per-cluster routes dispatch correctly: any `process`-routed clusters
     dispatch in a single Task batch (cap 4); any `lock-decisions`-routed
     cluster collects into one `/lock-decisions` invocation per
     iteration; any `act`/`auto-act` invokes `/revise-doc`.
   - Chapter converges in ≥2 iterations; hard cap at iter 3 surfaces
     unresolved if reached.
   - Chapter 2 follows the same loop.
   - Overall pass runs against the spike README; README-level clusters
     that cite a specific chapter surface to the captain (no
     auto-reopen).
   - Final convergence summary contains the four required sections
     (Chapters / Decisions locked / Pending clusters / Process-feedback
     verdicts carried). Pending clusters section present even when
     empty, stated as "No pending clusters."

2. **Real spike chapter re-validation** — captain selects an existing
   spike chapter from this repo (e.g., a chapter from `docs/spikes/sNNN-*`
   or a chapter under `docs/x000-yolo-project/s01-harness-conversion/`)
   and asks create-spike to re-validate it. Treat as a single-chapter
   loop entered mid-flight (the chapter file already exists; `/write-doc`
   is invoked only if the captain directive includes prose updates).
   **Expected**:
   - Pre-flight `/launch-project` resolves the project from cwd or the
     spike path.
   - Skip the scaffold step (chapter file exists); skip `/write-doc`
     unless the directive needs it; jump straight to `/validate-doc`.
   - Triage routing matches the captain's actual recent validation
     experience (this is the eval signal — does the routing feel right?).
   - Convergence summary lists pending clusters honestly. If the chapter
     was already mature, the summary should converge in ≤2 iterations
     with a small or empty pending list. If the chapter was stale, the
     summary should surface the staleness via blocking clusters.

## Pass criteria

- Pre-flight calls `/launch-project` exactly once on success, exactly
  twice on retry; never proceeds with no project context.
- Every chapter loop invokes the four core skills in declared order:
  `/write-doc` → `/validate-doc` → `/triage-feedback` → per-cluster
  dispatch (`/revise-doc` / `/process-feedback` / `/lock-decisions`).
- `/process-feedback` dispatches are emitted in a single Task batch per
  round (cap 4); sequential dispatch fails the eval.
- Per-chapter convergence requires ≥2 iterations; iter 3 hard cap
  surfaces remaining clusters.
- Overall pass runs against the spike README after all chapters
  converge; chapter-scoped clusters at the README level surface to the
  captain (no auto-loop).
- Convergence summary always contains an explicit Pending clusters
  section (even if empty); decision-shaped findings flow through
  `/lock-decisions` (never `/process-feedback` — verified by the
  hand-back pattern in process-feedback).
- The skill never authors prose itself; every prose change is a
  `/write-doc` or `/revise-doc` invocation.
- Captain interaction occurs only at the design-mandated decision
  points: launch-project refusal retry; `narrowed-options-brief`
  surfacing for blocking clusters; `/lock-decisions` per-finding three-
  path prompt; chapter-scoped README clusters; convergence summary.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass — refresh `.claude/skills/create-spike/SKILL.md`
  per p01 Ch5. Replaces the prior phase-based body (Phases 0–6, hard-coded
  6-review set) with the L4 composition contract: pre-flight
  `/launch-project`, per-chapter validate-loop with `/validate-doc` +
  `/triage-feedback` + per-cluster routing (act/auto-act → `/revise-doc`,
  process → parallel `/process-feedback`, lock-decisions →
  `/lock-decisions`, defer → record), per-chapter convergence
  (min 2 iter, hard cap at 3), overall pass on spike README, convergence
  summary with mandatory pending-clusters section per d11. Common-failure-mode
  list at the bottom. Eval is static — describes expected behavior. Live
  eval lands when the captain drives a real spike post-merge.
