# Eval brief: pre-write-doc.sh

**Task**: T1A1.02

## Contract

PreToolUse hook for `Write`. Blocks creation of new doc files under recognized doc paths (`docs/spikes/*/README.md`, `docs/plans/*/README.md`, `docs/notes/*.md`) when the Write call did NOT route through the sanctioned scaffolding script (`doc-create.sh` today; `yolo new` after T1C.02 lands).

Mechanism: reads JSON from stdin (Claude Code PreToolUse envelope); if file path matches a gated pattern AND file does not yet exist, emits a `permissionDecision: "deny"` JSON envelope on stdout with a captain-facing remediation message. Always exits 0 (CC convention for hooks that decide via stdout JSON).

**Note on plan spec divergence**: Ch2's "Hook eval-brief fixture format" describes the exit-code variant (exit 2 = block; stderr message). The existing hook uses the JSON-on-stdout variant. Both are valid CC conventions. This eval brief follows the existing hook's pattern; the plan spec is over-prescriptive on exit-code use and should be relaxed in a future revision.

## Eval inputs

Each fixture is a JSON file at `.claude/hooks/pre-write-doc.test/<scenario>.json`. Expected output captured below.

1. **legitimate-skill-overwrite.json** — Write payload to an existing file (e.g., revising a chapter). Expected: exit 0, empty stdout (the hook short-circuits on "file exists").
2. **raw-spike-readme.json** — Write payload to `docs/spikes/sNNN-foo/README.md` (new file; bypassing scaffolding). Expected: exit 0, stdout JSON contains `permissionDecision: "deny"` and a remediation message naming `doc-create.sh spike`.
3. **raw-plan-readme.json** — same shape, plan path. Expected: deny + remediation naming `doc-create.sh plan`.
4. **raw-note.json** — Write payload to `docs/notes/foo.md` (new file). Expected: deny + remediation naming `doc-create.sh note`.
5. **non-doc-write.json** — Write payload to `src/foo.ts`. Expected: exit 0, empty stdout.
6. **doc-non-prefixed.json** — Write payload to `docs/conventions/code-foo.md` (new file; convention file, not a prefixed doc). Expected: exit 0, empty stdout.
7. **project-structure-spike.json** — Write payload to `docs/x999-eval/s01-foo/README.md` (new project structure). Expected: **exit 0, empty stdout** (current hook does NOT gate the new structure — captured as a known gap to address when `yolo new` lands at T1C).
8. **project-structure-note.json** — Write payload to `docs/x999-eval/notes/foo.md`. Expected: **exit 0, empty stdout** (same gap).

## Pass criteria

100% match on inputs 1–6 (these capture the hook's current locked behavior). Inputs 7–8 are characterization fixtures — they document the new-structure gap; the gap is intentional at T1A1 and gets closed at T1C.02 when the hook re-points at `yolo new`.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Authored fixtures; ran each through current hook. All 8 inputs match expected. Inputs 7–8 confirm the new-structure gap.
