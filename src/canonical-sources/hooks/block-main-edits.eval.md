# Eval brief: block-main-edits.sh

**Task**: T1A1.05

## Contract

PreToolUse hook for `Bash`. Blocks `git commit` invocations when current branch (resolved from `cd <path>` prefix or git toplevel or CLAUDE_PROJECT_DIR) is `main` or `master`. Always exits 0; emits `permissionDecision: "deny"` for matched cases.

## Eval inputs

Fixtures at `.claude/hooks/block-main-edits.test/<scenario>.json`:

1. **non-commit-bash.json** — `ls -la` payload. Expected: exit 0, empty stdout.
2. **commit-on-master.json** — `git commit -m "msg"` from master branch. Expected: exit 0, deny envelope citing the branch + worktree remediation.
3. **commit-on-worktree.json** — `git commit -m "msg"` from a worktree branch. Expected: exit 0, empty stdout.
4. **chained-commit-on-master.json** — `cd /Users/mike/Code/openspike && git commit -m "msg"` from any cwd. Expected: deny (resolves to master).

Branch resolution depends on actual git state. Smoke runs from the worktree (current branch is `worktree-worktree-p01-foundation-hooks`); fixture #3 passes; fixture #2 requires being on master to fire — captured in T1A1.09 smoke.

## Pass criteria

100% match on all 4 inputs. Inputs 2 and 4 require running the hook with
`CLAUDE_PROJECT_DIR=/Users/mike/Code/openspike` (the actual main checkout where
master is current) so that the `cd /Users/mike/Code/openspike` prefix resolves
to a directory whose branch is master. From inside any worktree the explicit
`cd` does the work — no need to actually be on master to run the eval.

## Iteration log

- **Iter 1** (2026-05-09): Authored fixtures; inputs 1 and 3 match expected.
- **Iter 2** (2026-05-09): Fixtures 2 and 4 silently passed instead of denying.
  Root cause: cd-extraction sed regex captured a trailing space, so `git -C
  "/path "` failed and `branch` resolved to empty. Fixed by piping the captured
  path through `sed -E 's/[[:space:]]+$//'`. All 4 inputs now match expected.
  This bug was a real regression caught by the eval — exact contract the eval
  loop was designed to surface.
