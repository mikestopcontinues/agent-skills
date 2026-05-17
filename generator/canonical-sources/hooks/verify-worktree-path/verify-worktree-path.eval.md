# Eval brief: verify-worktree-path.sh

**Task**: T1A1.04

## Contract

PreToolUse hook for `Edit|Write`. When worktrees are active (any directory exists under `.claude/worktrees/`), source files matching `packages/*/src/*` may only be edited from inside a worktree. Non-source files (docs, config, `.claude/`) are always allowed. If no worktrees exist, hook is a no-op (allow all).

Mechanism: enumerates `.claude/worktrees/*/`; checks if `file_path` is inside any worktree's tree.

## Eval inputs

Fixtures at `.claude/hooks/verify-worktree-path.test/<scenario>.json`:

1. **doc-edit.json** — Edit payload to `docs/x000-yolo-project/README.md`. Expected: exit 0, empty stdout (non-source path always allowed).
2. **claude-config-edit.json** — Edit to `.claude/settings.json`. Expected: exit 0, empty stdout.
3. **source-edit-in-worktree.json** — Edit to `<repo>/.claude/worktrees/worktree-foo/packages/core/src/index.ts`. Expected: exit 0, empty stdout (inside a worktree).
4. **source-edit-outside-worktree.json** — Edit to `<repo>/packages/core/src/index.ts` (main checkout). Expected: exit 0, deny envelope naming the rule.

(For the source-edit fixtures, the absolute paths must resolve in the captain's actual environment for the worktree-presence check to fire correctly. Tests run from the worktree root where `.claude/worktrees/worktree-p01-foundation-hooks/` exists.)

## Pass criteria

100% match on all 4 inputs.

## Iteration log

- **Iter 1** (2026-05-09): Authored fixtures; behavior matches contract (verified
  via Bash invocations with `CLAUDE_PROJECT_DIR=/Users/mike/Code/openspike` so
  the worktree-presence check resolves to the canonical `.claude/worktrees/`).
  All 4 inputs match expected.
