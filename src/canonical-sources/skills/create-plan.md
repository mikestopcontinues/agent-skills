
Plan creation lifecycle. Composes `/launch-project`, `/write-doc`,
`/validate-doc`, `/triage-feedback`, `/revise-doc`, `/process-feedback`, and
`/lock-decisions` into the per-chapter and overall validate-loop. Same shape as
`/create-spike`; differs in baseline reviewer set (`accuracy, architecture,
integration, dx, scope` per d08) and target artifact (plan vs spike).

## When to Use

- After a spike is approved and the captain wants to move to a tech spec
- When the captain asks for an implementation plan or design doc
- When a feature, subsystem, or refactor needs an ordered task breakdown
  before code is written

## When NOT to Use

- Pure research with no implementation target → `/create-spike`
- Single-file edit of an existing plan chapter → `/write-doc` directly
- Applying review findings to an already-validated plan → `/revise-doc`
- Capturing one locked decision out-of-band → `/create-decision`
- Executing an already-approved plan → `/execute-plan`

## Inputs

- **plan name** — lowercase kebab-case (e.g., `auth-refactor`); the `pNNN-`
  prefix is auto-assigned by the scaffold
- **source spike (optional)** — path to a spike whose findings seed the plan;
  cited in chapter source lists
- **chapter outline (optional)** — captain may pre-supply an outline; absent
  one, propose one and confirm before authoring

## Tools

`Read, Edit, Write, Glob, Grep, Bash, WebFetch, WebSearch, TodoWrite, Dispatch`
(full orchestrator toolset).

## Process

### 1. Pre-flight — load project context

Invoke `/launch-project`. If it refuses (no project determinable from cwd or
prompt), ask the captain for the project name and retry once. Abort if still
unresolved — plans live inside a project subtree, not at `docs/`.

### 2. Identify scope, constraints, success criteria

Before scaffolding, fix the plan's frame:

- **Problem** — what we're solving and why (one paragraph)
- **Constraints** — what limits the solution space (boundaries, deps, deadlines)
- **Success criteria** — how we know the plan is done
- **Source spike (if any)** — which spike's recommendations seed this plan

Confirm the frame with the captain before proceeding when the source isn't a
fully approved spike.

### 3. Scaffold the plan

Invoke `/write-doc` to scaffold a new plan via the `pNN-<name>` convention.
`/write-doc` delegates to `yolo new plan <project> <name>`
— never improvise the path or pick a number manually. The CLI's JSON
envelope reports the assigned `filePath`; per-chapter authoring later
uses `yolo new chapter <project> <plan-slug> <name>`.

Confirm the scaffold landed before authoring chapters.

### 4. Per-chapter authoring + validate-loop

For each chapter in the outline, in dependency order:

#### a. Author the chapter

Invoke `/write-doc` with the chapter target path and content directive. Match
the surrounding directory's tone, depth, and section shape. For chapters
derived from a source spike, cite the spike's chapters in the chapter's
**Sources** section.

#### b. Validate

Invoke `/validate-doc` with:

- `artifactPath` = the chapter file
- `focusList` = `[accuracy, architecture, integration, dx, scope]` (the
  create-plan baseline per d08)
- Add contextual focuses when the chapter warrants them — `security` for
  auth/crypto/secrets, `performance` for hot paths, `compatibility` for public
  surfaces. The orchestrator (this skill) picks; `/validate-doc` is dumb.
- `iteration` = current iteration index for this chapter (1, 2, 3)

`/validate-doc` dispatches one `/review-doc` per focus in parallel and returns
the rNN- file paths it landed.

#### c. Triage

Invoke `/triage-feedback` with the rNN- paths from step b and the chapter
artifact path. It returns clusters with route assignments per d11:
`act` / `auto-act` / `process` / `defer` / `lock-decisions`.

#### d. Revise — `act` and `auto-act` clusters

For every cluster routed `act` or `auto-act`, invoke `/revise-doc` against the
chapter, passing the cluster's member findings (via the source rNN- files or
inline). `/revise-doc` applies the edits and surfaces contradictions; do not
auto-pick contradictions — they go to the captain.

#### e. Process — `process` clusters

Dispatch `/process-feedback` in parallel — one subagent per `process` cluster,
**all in a single Task batch**, capped at 4 concurrent. Each returns one of
two canonical verdicts:

- `verified-resolution` — apply via `/revise-doc` using the patch suggestion
- `narrowed-options-brief` — surface to the captain only when the cluster is
  also blocking; non-blocking briefs queue for the next iteration's reviewers

Hand-back markers (decision-shaped clusters mistakenly routed here) re-route to
`/lock-decisions`.

#### f. Lock decisions — `lock-decisions` clusters

Invoke `/lock-decisions` with the decision-shaped cluster list. The captain
walks each finding via the three-path prompt (`lock` / `defer` / `grill`).
Locked decisions write `dNN-<slug>.md` under the project's `decisions/`
directory.

#### g. Iterate this chapter to convergence

Convergence rules (per Ch5):

- **Minimum 2 iterations.** Even a clean first pass repeats once.
- **Hard cap at iteration 3.** If clusters remain after iter 3, surface the
  remaining cluster list to the captain in the convergence summary; do not
  auto-loop further.
- A chapter has converged when every cluster from the latest iteration is
  routed to `defer` (nits / out-of-scope) or has a landed resolution
  (`act`-applied edit, `process` verified-resolution applied, `lock-decisions`
  locked or deferred per captain).

Move to the next chapter only after this one converges.

### 5. Overall pass — validate the plan README

After all chapters converge, run one validate-loop against the plan's
`README.md`:

- `/validate-doc` with the create-plan baseline focus list, scope = README
- `/triage-feedback` on the rNN- output
- Same act / process / lock-decisions handling as per-chapter

If the overall pass surfaces a chapter-scoped issue (a finding that points back
into a specific chapter), **the captain decides** whether to reopen that
chapter for another iteration. Do not auto-loop chapters from the overall
pass — that thrash is forbidden.

### 6. Convergence summary to captain

Brief the captain with:

- **Plan summary** — what will be built, at what scope
- **Per-chapter convergence** — iterations taken; any clusters deferred to
  next phase
- **Locked decisions** — the `dNN-` files this plan produced (link each)
- **Pending clusters** — every cluster that did not land a resolution this
  cycle, with its route, severity, and current state. **This list is
  mandatory** — hiding pending clusters in the summary is forbidden per d11.
- **Open questions for captain** — narrowed-options-briefs awaiting captain
  input; defer-after-grill items the captain may revisit

Wait for captain approval before downstream work (`/execute-plan`) begins.

## Failure modes to avoid

- **Skips overall pass** after per-chapter convergence — the README must be
  validated end-to-end, not assumed correct because chapters passed.
- **Auto-loops chapters** when the overall pass surfaces a chapter-scoped
  issue — captain decides per Ch5; never silently re-open.
- **Hides pending clusters** in the convergence summary — every unresolved
  cluster appears with its route and severity.
- **Sequential `/process-feedback` dispatch** — must dispatch all `process`
  clusters in a single Task batch (cap 4). One Task per assistant turn defeats
  parallelism and is a known failure mode.
- **Skipping `/launch-project`** — plans live inside a project subtree;
  authoring without project context produces orphaned files.
- **Decision-shaped clusters routed to `/process-feedback`** — process-feedback
  hands them back; the orchestrator must re-route to `/lock-decisions`
  rather than re-dispatching process.
- **Picking between contradicting `/revise-doc` findings** — surface both to
  the captain; do not silently choose.
- **Inventing a chapter outline without captain confirmation** — when the plan
  is non-trivially scoped, propose the outline and wait.

## Cross-cutting

- New docs use `yolo new` (the pre-write-doc hook enforces
  this); delegate via `/write-doc`, never write paths directly.
- Cross-references between docs use relative paths without anchors (per d06).
- Locked decisions land under the project's `decisions/` directory via
  `/create-decision` (invoked by `/lock-decisions`); the plan README links
  each one in the convergence summary.
