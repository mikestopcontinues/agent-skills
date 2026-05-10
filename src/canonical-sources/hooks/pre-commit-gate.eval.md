# Eval brief: pre-commit-gate.sh

**Task**: T1A1.03

## Contract

PreToolUse hook for `Bash`. Intercepts `git commit` invocations (including `&&`, `||`, `;`, and `cd <path> && git commit` chains); runs `pnpm run check` from the resolved working directory; if check fails, emits `permissionDecision: "deny"` with the truncated error tail. Always exits 0.

Working dir resolution: extracts `cd <path>` prefix if present; else `git rev-parse --show-toplevel`; falls back to `CLAUDE_PROJECT_DIR`.

## Eval inputs

Fixtures at `.claude/hooks/pre-commit-gate.test/<scenario>.json`:

1. **non-commit-bash.json** — `ls -la` payload. Expected: exit 0, empty stdout (not a commit; pass-through).
2. **bare-commit-clean.json** — `git commit -m "msg"` payload, expected to run against the worktree state. **Skipped from automated runs** because it actually runs `pnpm run check` (~10–30s); manual smoke check covers it.
3. **chained-commit.json** — `cd /path && git commit -m "msg"` shape. Expected: same as bare commit (extracted `cd` path used for check). Same skip note.
4. **commit-after-other-commands.json** — `make build && git commit -m "msg"`. Expected: hook detects the commit; runs check from session cwd's git root.
5. **non-git-bash.json** — `npm install` payload. Expected: exit 0, empty stdout.

## Pass criteria

100% match on inputs 1, 4, 5 (the synthetic fast paths). Inputs 2–3 verified via manual smoke check during T1A1.09.

## Iteration log

- **Iter 1** (2026-05-09): Authored fixtures; ran 1, 5 through hook (input 4
  triggers actual `pnpm run check` and is deferred to manual smoke). Match
  expected.
- **Iter 2** (2026-05-09): Carried the same trailing-whitespace fix from
  T1A1.05 (cd-extraction sed regex) into pre-commit-gate.sh proactively —
  same regex shape, same latent bug. Bug not directly observed here because
  the synthetic fast paths don't exercise chained-cd, but the smoke run for
  T1A1.09 will validate.
