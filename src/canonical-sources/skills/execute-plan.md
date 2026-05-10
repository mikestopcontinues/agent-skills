
Per-phase orchestrator for an approved plan. Reads the plan's `tasks.md`
or chapter task tables, walks phases sequentially (per Ch5 OQ2 — no
intra-plan parallelism), and per phase: stands up a worktree, dispatches
`/write-code` to land the phase's code, runs `/validate-code` against
the phase diff, drives the triage / process / lock-decisions cycle, and
merges on convergence. State persists in the plan's `tasks.md` so the
captain can interrupt and resume.

## When to Use

- Executing an approved plan (`docs/plans/pNNN-*/`)
- Resuming a plan whose earlier phases already landed (state read from
  `tasks.md` checked-row markers)
- The captain says "execute pNNN" / "build the plan" / "land the next
  phase of pNNN"

If the captain wants ad-hoc code work that is not phase-scoped within a
plan, route to `/write-code` directly — not this skill.

---

## Phase 0: Pre-flight

1. Invoke `/launch-project`. If no project is determinable from cwd or
   prompt, the launch refuses; ask the captain for a project name and
   retry once. If still unresolved, stop.
2. Confirm a plan target. The captain's prompt usually names one
   (`pNNN-<slug>`); otherwise list candidates from
   `docs/<project>/plans/` (or `docs/plans/` for legacy layouts) and
   ask the captain to pick.
3. Read the plan's `README.md` and `tasks.md` (or chapter task tables
   when the plan keeps tasks inline). Verify the plan is in an
   executable state — if it is still in proposal / open-questions
   posture, stop and surface that to the captain.

---

## Phase 1: Identify phases and resume point

1. Parse the task breakdown. A "phase" is the atomic unit the plan
   declares — typically a numbered group in `tasks.md` (`T1A`, `T1B`,
   …) or a chapter section labeled "Phase N". Use the plan's grouping;
   do not invent your own.
2. Walk phases in declared order. The next phase is the first one with
   any unchecked task row. Phases whose rows are all checked are
   already done; skip.
3. Build a TodoWrite list with one entry per remaining phase. Mark the
   first as `in_progress`; the rest stay `pending`.
4. If a worktree from a prior interrupted run already exists for the
   resume-point phase (`.claude/worktrees/worktree-<plan>-<phase>` is
   present), pick it up where it stands rather than re-creating.

---

## Phase 2: Per-phase loop

Sequential. Do not start phase N+1 until phase N has merged or the
captain has explicitly authorized parking it.

### 2a. Worktree setup

If no worktree for this phase exists:

```
git worktree add .claude/worktrees/worktree-<plan>-<phase> -b worktree-<plan>-<phase>
cd .claude/worktrees/worktree-<plan>-<phase>
pnpm install
```

Worktree names MUST match `worktree-<plan>-<phase>` (e.g.,
`worktree-p018-t1b2`). Per project worktree-discipline, names always
start with `worktree-`.

### 2b. Dispatch /write-code

Issue exactly one `/write-code` Dispatch call. The prompt contains:

- The plan ID and phase ID being executed
- The phase's task list (verbatim from `tasks.md`)
- Any phase-scoped acceptance criteria from the plan chapters
- The worktree path (`/write-code` operates inside it)
- The reminder that worker output is summarized back here for
  validation; the worker does not merge

Wait for the worker's hand-off summary (commit list, files touched,
deviations).

### 2c. Validate the phase diff

Invoke `/validate-code` with:

- `artifact`: the worktree path (validate-code will derive
  `git diff <base>...HEAD` scoped to the worktree)
- `focusList`: the execute-plan baseline — `accuracy`, `architecture`,
  `dx` — plus contextual reviewers chosen from the phase's nature:
  - `security` when the phase touches auth, crypto, secrets, network
    boundaries, or session lifecycles
  - `performance` when the phase touches hot paths (request loops,
    serialization, hashing, big-O sensitive code)
  - `integration` when the phase changes a public `index.ts` export
    consumed by another module
- `iteration`: the current iteration number for this phase (1 on the
  first pass; bumped on rerun)
- `reviewDir`: the plan directory (`docs/<project>/plans/<plan>/` or
  `docs/plans/<plan>/`) — review files land alongside the plan, not
  inside the worktree

If `validate-code` returns `failed` (any reviewer errored or produced
no substantive `rNN-` file), surface the error to the captain rather
than auto-retrying.

### 2d. Triage / process / lock-decisions cycle

Per the Ch5 cluster-based loop:

1. Invoke `/triage-feedback` with the new `rNN-*.md` set and the
   artifact (the worktree diff).
2. For each cluster routed to **`act` / `auto-act`**:
   - If the cluster targets the plan doc (e.g., a chapter says one
     thing and the code says another, and the *plan* is wrong): apply
     via `/revise-doc` against the plan chapter.
   - If the cluster targets the *code* (the plan is right and the code
     diverged): dispatch `/write-code` again into the same worktree
     with the cluster as the directive.
3. For each cluster routed to **`process`**: dispatch `/process-feedback`
   in parallel (single Dispatch batch, cap 4). Apply each
   `verified-resolution` as in step 2 (against plan or code as the
   resolution dictates). Surface each `narrowed-options-brief` to the
   captain and wait — do not pick.
4. For each cluster routed to **`lock-decisions`**: invoke
   `/lock-decisions` with the cluster list.
5. Iterate. Re-validate (back to step 2c with iteration+1). Convergence
   = a validate pass whose triage returns no `act` / `process` /
   `lock-decisions` clusters (only `defer` / nothing). Minimum 2
   iterations per phase; if iteration 3 still has open blocking
   clusters, stop the loop and surface to the captain.

### 2e. Merge on convergence

When the phase converges:

1. Confirm `pnpm run check` passes on the worktree's tip commit.
2. **`cd` back to the repo root.** Steps 3–5 run from the repo root — never
   from inside the worktree. (Running `git merge <branch>` while cwd is in
   that worktree is a no-op; `git worktree remove` on the worktree you're
   standing in deletes your cwd. If you ran `pnpm run check` inside the
   worktree, `cd` out first.)
3. Rebase the worktree branch onto the base, then **fast-forward** merge —
   `master` history stays linear, never a merge commit:
   ```
   git -C .claude/worktrees/worktree-<plan>-<phase> rebase <base>
   git merge --ff-only worktree-<plan>-<phase>
   ```
   If `--ff-only` fails, the rebase didn't catch the current tip — rebase
   again. Never fall back to a plain `git merge` or `--no-ff`.
4. Remove the worktree (from the repo root):
   ```
   git worktree remove .claude/worktrees/worktree-<plan>-<phase>
   git branch -d worktree-<plan>-<phase>
   ```
5. Run `pnpm install` at the repo root if package manifests changed
   during the phase.

If the rebase or `--ff-only` merge fails (conflict against a base advanced by
another landed phase), stop and surface to the captain — do not auto-resolve
conflicts and do not paper over it with a merge commit.

### 2f. Update tasks.md

Edit the plan's `tasks.md` to check off every row this phase covered.
The state must persist across captain interruptions: if the captain
walks away mid-loop, `tasks.md` is the canonical record of what is
done.

If the phase's completion implies a status change in the plan README
(e.g., "Phase 1.A complete" header), update that too.

Mark the TodoWrite entry `completed` and advance to the next phase.

---

## Phase 3: Plan-level wrap-up

When every phase has merged and `tasks.md` shows all rows checked:

1. Optionally suggest `/archive-project` if the plan was the final
   work item for the parent project. Do not invoke it — the captain
   decides.
2. Summarize: phases landed (with merge SHAs), open clusters that the
   captain accepted as deferred, any narrowed-options briefs still
   awaiting captain decision, follow-up notes captured along the way.
3. Stop. Do not push; the captain pushes.

---

## Hard rules

- **Phases are sequential.** One phase merges before the next starts.
  Cross-plan parallelism (multiple `/execute-plan` invocations on
  different plans) is a captain-managed concern; this skill never
  spawns parallel phases of its own plan.
- **Worktree lifecycle is owned by this skill.** A worktree this skill
  creates must be merged or explicitly parked-with-captain-approval
  before phase exit. Leaks (created worktree, no merge, no captain
  hand-off) are a defect.
- **`/validate-code` scope is the phase diff, not the whole repo.**
  Always scope the artifact path so the dispatched reviewers see only
  what the phase changed.
- **`tasks.md` updates are per-phase, not deferred to the end.** State
  must persist mid-loop — the captain can interrupt at any point and
  resume from `tasks.md` plus filesystem state.
- **No silent decision picking.** Narrowed-options briefs surface to
  the captain. Decision-shaped clusters route to `/lock-decisions`.
- **No `--no-verify` on commits inside the worktree.** The
  `pre-commit-gate` hook is the backstop; if it denies a commit, the
  worker fixes the cause and tries again.
- **No interface changes without escalation.** If a phase's diff
  modifies a public `index.ts` export, the worker should have already
  escalated; if it slipped through, surface it during validate-code's
  `integration` review and re-route.

## Cross-cutting

- All new docs (e.g., notes captured during phase work) use
  `yolo new` (the pre-write-doc hook enforces this).
- Cross-references between docs use relative paths without anchors
  (per d06).
