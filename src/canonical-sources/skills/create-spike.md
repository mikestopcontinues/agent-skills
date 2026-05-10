
L4 lifecycle skill. You drive the full spike-creation flow by composing the L3
singletons and L2 dispatchers below. You do not author chapter prose, run
reviewers, or apply edits yourself — every action is a delegated invocation
of another skill.

## When to Use

- Starting a new research spike from a captain prompt
- Resuming a spike mid-iteration (`rNN-` files exist; chapters not converged)
- Adding a chapter to an existing spike (treat as a single-chapter loop)

## When NOT to Use

- Writing a tech spec → `/create-plan`
- Ad-hoc doc edit → `/write-doc`
- Capturing a single decision → `/create-decision` (or `/lock-decisions` for
  a finite list)
- Open-ended Socratic interview → `/grill-me`

## Pre-flight

Invoke `/launch-project`. If it refuses (no project determinable from cwd or
prompt), ask the captain for a project name and invoke `/launch-project` once
more with that name. If the second attempt also refuses, abort with the
launch-project error verbatim — do not improvise a project context.

Once project context is loaded, identify the spike's research question and
proposed chapter list. If neither is in the captain's prompt, ask once before
proceeding. Use `Bash` to scaffold via
`yolo new spike <project> <name>` — never write the
spike `README.md` path directly. Parse the JSON envelope's `filePath` to
discover the assigned `sNN-<name>/README.md`. Per-chapter authoring uses
`yolo new chapter <project> <spike-slug> <chapter-name>`,
which returns the assigned `NN-<chapter-name>.md` path the same way.

## Per-chapter loop

For each proposed chapter, in declared order:

### 1. Author

Invoke `/write-doc` with the chapter file path and a directive carrying the
chapter's purpose, sources, and required sections. `/write-doc` produces the
file; you do not write prose yourself.

### 2. Validate

Invoke `/validate-doc` with:

- `artifact path` = the chapter file
- `focus list` = `[accuracy, architecture, depth, dx]` (the create-spike
  baseline per the validate-doc focus-list table). Add `security` for
  trust-boundary chapters; extend per chapter nature; never trim below
  the baseline four.
- `iteration number` = current iteration for this chapter (start at 1)
- `review directory` = the chapter's parent directory

Block until validate-doc returns its summary. Surface any `errored` reviewer
verbatim — do not auto-retry, do not silently proceed without it.

### 3. Triage

Invoke `/triage-feedback` with the `rNN-{focus}.md` paths validate-doc
landed and the chapter's path. Receive the cluster list with per-cluster
routes (`act` / `auto-act` / `process` / `defer` / `lock-decisions`).

### 4. Per-cluster routing

Walk the cluster list and dispatch per route:

- **`act` / `auto-act`** — invoke `/revise-doc` with the chapter path and
  the rNN- paths whose findings drive the cluster. revise-doc handles the
  edits; you record the result.
- **`process`** — dispatch `/process-feedback` subagents in parallel,
  one per `process`-routed cluster, **all in a single Task batch** (cap
  4 per batch; if more, batch sequentially in rounds). Each subagent
  returns either `verified-resolution` or `narrowed-options-brief`. For
  verified-resolutions: invoke `/revise-doc` with the patch suggestion
  applied as the act-pass. For narrowed-options-briefs: surface the brief
  to the captain inline if the cluster is `blocking`; carry forward as
  non-blocking otherwise.
- **`lock-decisions`** — collect every cluster routed to lock-decisions
  in this iteration into a single findings list, then invoke
  `/lock-decisions` once with that list. Record per-finding outcomes
  (`locked` / `deferred` / `grilled-then-locked` / `grilled-then-deferred`).
- **`defer`** — record the cluster as deferred. No action.

### 5. Per-chapter convergence

The chapter is converged for this iteration when every routed cluster has
landed (`act`/`auto-act` applied; `process` returned a verdict and either
auto-applied or surfaced; `lock-decisions` returned outcomes; `defer`
recorded).

Iterate the chapter — re-author touch-ups via `/write-doc` if needed, then
back to step 2 (Validate). Convergence rules:

- Minimum **2 iterations** per chapter (one author + at least one
  validate-loop pass that lands no new blocking clusters).
- Hard cap at **iteration 3**: any clusters still unresolved at iter 3
  surface to the captain regardless of route. Do not silently roll into
  iter 4.

A chapter exits the loop when an iteration's validate-doc lands no new
blocking clusters AND every prior cluster is resolved or in pending state.

## Overall pass

After all chapters converge per-chapter, run an overall pass:

1. Invoke `/validate-doc` with `artifact path` = the spike `README.md`,
   same baseline focus list, fresh iteration number.
2. Invoke `/triage-feedback` on the rNN- files validate-doc landed at
   the README level.
3. Apply the same per-cluster routing (step 4 above) at the README scope.
4. If a cluster routed at the README level is chapter-scoped (cites a
   specific chapter), surface to the captain — do **not** auto-loop the
   chapter. Per the spike's loop rule, the captain decides whether to
   re-open the chapter.

## Convergence summary

When all chapters and the overall pass converge, present a markdown
summary to the captain with these required sections:

- **Chapters** — per chapter: iteration count, baseline + extended
  focuses, final-iteration cluster routes summary
- **Decisions locked** — per `/lock-decisions` invocation: cluster ID,
  topic, outcome, dNN- path (if locked)
- **Pending clusters (REQUIRED — never omit, even if empty)** — per
  unresolved cluster: topic, member findings, iteration it surfaced,
  what it's waiting on (`acknowledged-without-decision` / blocked-by-X /
  awaiting captain). Empty list explicitly stated as "No pending
  clusters."
- **Process-feedback verdicts carried** — per non-blocking
  narrowed-options-brief carried forward without captain decision

A "converged" report that hides pending clusters violates the
convergence-summary requirement and is forbidden.

## Common failure modes

- **Skipping the overall pass** after per-chapter convergence — every
  spike runs the README-level validate-loop before the convergence
  summary.
- **Auto-looping a chapter** when the overall pass surfaces a
  chapter-scoped cluster — captain decides; never auto-reopen.
- **Hiding pending clusters** in the convergence summary — pending list
  is mandatory; an empty list says "none" explicitly.
- **Sequential `process-feedback` dispatch** — process-routed clusters
  must dispatch in a single Task batch (cap 4); sequential dispatch
  defeats the parallelism budget and is a known eval failure.
- **Skipping `/launch-project`** when invoked from outside a project
  context — the pre-flight call is non-negotiable.
- **Inventing chapter prose** instead of delegating to `/write-doc`
  — this skill is an orchestrator; it does not write prose.
- **Silently merging contradictory cluster outcomes** — when
  `/revise-doc` reports a contradiction, surface it to the captain;
  do not pick a winner.
- **Generating candidate decision answers** during the lock-decisions
  step — that's `/grill-me`'s job, invoked via `/lock-decisions` on
  the captain's `grill` choice.
