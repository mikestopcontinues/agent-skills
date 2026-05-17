# Eval brief: pre-bash-doc.sh

**Task**: T1A1.06

## Contract

PreToolUse hook for `Bash`. Intercepts `git commit` invocations; runs `doc-check-links.sh`; if it finds broken references, emits `permissionDecision: "deny"` with remediation. Always exits 0.

## Eval inputs

Fixtures at `.claude/hooks/pre-bash-doc.test/<scenario>.json`:

1. **non-commit-bash.json** — `ls` payload. Expected: exit 0, empty stdout.
2. **commit-clean-links.json** — `git commit -m "msg"` against current tree (links currently clean per repo state). Expected: exit 0, empty stdout. Verifies the script exit is 0 and no deny fires.
3. **commit-broken-links.json** — same Bash payload, run after temporarily introducing a broken link. Expected: deny envelope. Skipped from automated runs (would require actually breaking and restoring a link); covered by manual smoke during T1A1.09.

## Pass criteria

100% match on inputs 1, 2 (the runs that don't require mutating the link graph).

## Iteration log

- **Iter 1** (2026-05-09): Authored fixtures; inputs 1, 2 match expected.
