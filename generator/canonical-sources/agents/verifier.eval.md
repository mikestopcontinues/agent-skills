# Eval brief: verifier agent

**Task**: T1A1.15

## Contract

Cognitive-profile agent dispatched by `validate-doc` and `execute-plan` to
run behavioral checks at task end. Verifier owns three jobs:

1. Execute `pnpm run check` and report per-phase pass/fail (typecheck, lint,
   test, spec, build) with concrete numbers and failing file:line.
2. Detect module-boundary violations via grep patterns. Post-T1A1.07 there
   is no `check-module-boundary.sh` hook — verifier and review-architecture
   are the only line of defense before merge.
3. Cross-reference plan task tables against `git log` / diff to confirm
   every task has a matching commit and file change.

Non-destructive — observes and reports, never edits code.

## Eval scenarios

Three representative dispatch prompts:

1. **"Verify task T1A1.15 complete in plan p01-agent-skills-toolkit"** —
   Verifier reads `docs/x000-yolo-project/p01-agent-skills-toolkit/12-task-breakdown.md`,
   locates T1A1.15, runs `git log --oneline master..HEAD`, confirms a
   commit (or staged diff) touches `__SKILL_HOME__/agents/verifier.md` and the
   eval brief. Output cites the commit SHA and changed file paths.
2. **"Audit module boundaries in package @os/oauth"** — Verifier runs the
   sibling-deep-import grep, the cross-package internal-import grep, the
   `declare module|global` grep, and the wildcard re-export grep against
   `packages/oauth/src/`. Output is a table of violations as
   `file:line — pattern` rows, plus a numeric total. Zero violations
   reports as "0 violations across N files scanned" — never as "looks
   clean."
3. **"Report check status with specifics"** — Verifier runs
   `pnpm run check` and emits a per-phase breakdown:
   `typecheck: pass | lint: pass | test: 412 passed / 0 failed | spec: pass | build: pass`.
   Failure case names the failing file:line and the exact error message,
   not a paraphrase.

## Pass criteria

- Outputs include numeric pass/fail counts per check phase, never a bare
  "passes" / "looks good."
- Boundary-violation reports cite `file:line` for every hit and a
  total-violations count, even when zero.
- Plan-completeness reports cite commit SHAs and changed file paths, not
  task-status assertions.
- No code edits in any output — verifier observes only.
- Grep patterns from the agent's Strategies section are reachable copy-paste
  invocations (verified by running each one against the repo at brief
  authoring time).

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Refreshed verifier.md to reflect
  post-T1A1.07 reality (no boundary hook), added concrete grep recipes
  for boundary detection, restructured Focus Areas around the
  numeric-citation contract. Eval scenarios drafted from the three
  canonical dispatch shapes. Awaiting first live dispatch to confirm
  agent honors the citation contract.
