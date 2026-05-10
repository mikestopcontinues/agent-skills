# Eval brief: validate-doc dispatcher skill

**Task**: T1A3.03

## Contract

L2 dispatcher skill called by lifecycle skills (`create-spike`, `create-plan`,
`archive-project`) and ad-hoc validation rounds. Inputs: artifact path, focus
list, iteration number, review directory. Behavior: validates the artifact,
derives the next free `rNN-` integer from existing siblings, dispatches one
`review-doc` subagent per focus **in a single parallel Task batch**, waits for
all to return, summarizes per-reviewer status and errors. No auto-bypass on
reviewer errors — surface in summary, captain decides. Tools: `Read, Glob,
Grep, Bash, Dispatch`.

## Eval scenarios

### Scenario A — 4-focus baseline (create-spike), empty review directory

Inputs:
- artifact: a chapter under `docs/x000-yolo-project/s01-harness-conversion/` with no existing `rNN-*.md` siblings
- focus list: `[accuracy, architecture, depth, dx]` (the create-spike baseline)
- iteration: 1
- reviewDir: the chapter's parent

Expected:
- 4 files written, in input-list order: `r01-accuracy.md`, `r02-architecture.md`, `r03-depth.md`, `r04-dx.md`
- Summary lists all 4 entries as `landed` with their paths
- **Parallelism check**: total wall-time < 1.5 × per-reviewer wall-time. Per-reviewer wall-time set by an eval-mode `sleep N` baked into each `review-{focus}` agent (see pre-condition below). Sequential dispatch would yield ≈ 4 × per-reviewer wall-time — that fails the eval.

### Scenario B — 3-focus reduced set (chapter that doesn't need depth review)

Inputs:
- artifact: same chapter, different empty review directory
- focus list: `[accuracy, architecture, dx]`
- iteration: 1
- reviewDir: empty

Expected:
- 3 files written: `r01-accuracy.md`, `r02-architecture.md`, `r03-dx.md`
- Summary lists all 3 as `landed`
- No `r04-*.md` written; the skill does not pad the focus list

### Scenario C — iter 2, existing rNN- files present (no overwrite, next-free integer)

Inputs:
- artifact: a chapter whose review directory already contains `r01-accuracy.md`, `r02-architecture.md`, `r03-depth.md`, `r04-dx.md` (from iter 1)
- focus list: `[accuracy, architecture]` (two clusters re-opened after iter 1 revisions)
- iteration: 2
- reviewDir: same directory, populated as above

Expected:
- 2 new files written: `r05-accuracy.md`, `r06-architecture.md`
- Existing `r01–r04` unchanged on disk (timestamp + content identical)
- Summary lists `r05-accuracy.md` and `r06-architecture.md` as `landed`
- NN derivation grounded in `max(existing) + 1`, not in the focus list's index alone

## Adversarial side-checks

- **Errored reviewer** — if one of the dispatched reviewers errors (e.g., the focus name has no matching agent), the summary must include it as `errored` with the error message. The other reviewers still run and land. No silent swallow, no retry.
- **Target collision** — if a target filename already exists on disk before dispatch (e.g., `r05-accuracy.md` already there in Scenario C's reviewDir), the skill aborts the whole batch with a clear error rather than overwriting.

## Pass criteria

1. File counts and filenames match expected for each scenario.
2. NN sequence is contiguous in input-list order; no gaps, no overwrites.
3. Summary contains one entry per dispatched focus, in input-list order, with the listed status fields.
4. Errored reviewers surface verbatim in the summary; the skill does not retry or auto-bypass.
5. **Parallelism** (Scenario A, gated on the pre-condition below): total wall-time under 1.5 × per-reviewer sleep.

## Pre-condition for the parallelism check

Wall-time measurement is only meaningful once each `review-{focus}` agent's
prompt embeds a deliberate eval-mode `sleep N` (e.g., 5 seconds) so per-
reviewer time is predictable. That instrumentation lands with task **T1A3.07**
(integration eval for validate-doc against real chapters). Until then,
Scenarios A–C are **static evals**: verify expected behavior by inspecting the
skill body's dispatch shape and by single-shot live runs that confirm filenames
and summary structure. The wall-time threshold becomes a hard gate in T1A3.07.

## Static eval rationale

The skill body produces the expected behavior because: step 1 explicitly
aborts on missing/non-markdown artifacts (no dispatch happens with bad
inputs); step 2's NN-derivation algorithm is spelled out as `max + 1` with the
empty-dir branch (Scenarios A, B, C all match); step 3 mandates a single Task
batch with one tool call per focus (parallelism check passes once
instrumentation lands); step 5 requires every dispatched focus to appear in
the summary with status (errored-reviewer and collision side-checks pass);
step 5's "do not auto-bypass" instruction blocks the silent-swallow failure
mode triage'd from p01 Ch3.

## Iteration log

- **Iter 1** (2026-05-09): Initial authoring pass. Body skeleton from p01 Ch3 lines 86–95, expanded with explicit parallel-batch framing, NN algorithm pseudocode, summary schema, and the failure-modes section. Eval inputs cover the three scenarios from Ch3 lines 99–102 plus two adversarial side-checks (errored reviewer, target collision). Parallelism check deferred to T1A3.07 pending reviewer-side `sleep N` instrumentation.
