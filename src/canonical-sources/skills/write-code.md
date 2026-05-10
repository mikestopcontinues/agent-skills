
Singleton for code work. Every code change — bug fix, refactor, feature
increment, or one phase of a larger plan dispatched by `execute-plan` —
goes through this skill. It enforces worktree isolation, incremental
commits, and the `pnpm run check` quality gate.

## When to Use

- Fixing a bug
- Refactoring code (preserving behavior)
- Adding or extending a feature, with tests
- Executing one phase of a plan when dispatched by `execute-plan`
- Resuming partially-completed code work in an existing worktree

If you are about to write, edit, or modify code — use this skill.

---

## Step 1: Refuse master/main

Run `git branch --show-current`. If the branch is `master` or `main`,
**stop**. Do not edit source files. Do not attempt a commit (the
`block-main-edits` hook will deny it; `verify-worktree-path` denies
source edits outside a worktree).

Either create a worktree (Step 2), or `cd` into the existing worktree
the captain meant.

---

## Step 2: Worktree setup

If already in a worktree (branch starts with `worktree-`), skip ahead.

Otherwise, derive a kebab-case `<name>` from the directive:

| Directive shape          | Worktree name                  |
|--------------------------|--------------------------------|
| Bug fix                  | `worktree-fix-<brief>`         |
| Refactor                 | `worktree-refactor-<brief>`    |
| Feature increment        | `worktree-<feature-brief>`     |
| Plan phase (dispatched)  | `worktree-<plan>-<phase>`      |

```
git worktree add .claude/worktrees/worktree-<name> -b worktree-<name>
cd .claude/worktrees/worktree-<name>
pnpm install
```

Names MUST start with `worktree-`. `cd` into the worktree before any
edit.

---

## Step 3: Plan the change

For multi-step work, use `TodoWrite` to track tasks. Each task is one
atomic change that leaves the repo passing checks.

Before editing:
- Read the affected files; understand the surrounding code.
- Refactors: identify all call sites; preserve behavior.
- Features: name the test cases first.
- If the change modifies a public `index.ts` export consumed by other
  modules, **escalate to the captain** before proceeding (per CLAUDE.md).

---

## Step 4: Implement and commit, one atomic change at a time

Repeat per task:

1. Make the edit (code + matching test in the same task).
2. Run `pnpm run check` locally. The pre-commit gate runs it again, but
   catching failures here is faster.
3. Stage only this change's files: `git add <specific-files>`. Do not
   use `git add -A` or `git add .`.
4. Commit with a message that explains **why**, not what:
   ```
   git commit -m "<short subject>

   <one or two sentences on why this change exists>"
   ```
5. Mark the todo complete. Move to the next task.

The repo must be in a working state after every commit. If a change is
big enough to need a commit-in-progress, split it: land prep work
(rename, scaffold, tests-first) as its own passing commit, then the
behavior change as another.

---

## Step 5: Quality-gate failure handling

If `pnpm run check` fails (locally or via the `pre-commit-gate` hook
denying the commit):

1. Read the failure output. Identify the root cause — type error, lint,
   failing test, build break.
2. Fix the cause in the working tree.
3. Re-stage: `git add <files>`.
4. Create a **new commit**. Do NOT `git commit --amend`. The prior
   commit never landed (the gate denied it); amending would modify a
   different, unrelated commit.
5. Never bypass the gate with `--no-verify` unless the captain
   explicitly authorizes it for a specific commit. The gate exists to
   keep the repo green.

If the failure is in unrelated code (pre-existing breakage, not caused
by this change), **escalate to the captain** rather than working around
it.

---

## Step 6: Hand off

When all tasks are committed and `pnpm run check` passes on the final
commit:

- Summarize: commit list (hash + subject), files touched, any
  deviations from the directive.
- Do NOT merge or push. The captain merges, removes the worktree, and
  decides when to push.

For plan-phase dispatch: return the summary to `execute-plan`, which
owns cross-phase coordination.
