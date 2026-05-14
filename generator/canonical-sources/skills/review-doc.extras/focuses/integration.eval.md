> Promoted from the pre-d15 `review-integration` agent eval brief. Per decision d15 (in the openspike repo) the `integration` review *focus* is now a brief loaded by `review-doc` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.

# Eval brief: review-integration agent

**Task**: T1A2.07

## Contract

Reviewer subagent dispatched by `create-plan` (and any plan-revision flow)
to evaluate whether the plan composes with existing systems and whether it
breaks consumers without naming them and giving them a path forward.
Findings are concrete consumer-impact assertions backed by `Grep`
evidence; the agent stays out of internal-architecture, DX, and
comprehensiveness scopes (those belong to sibling reviewers). Severity
follows the d11 routing tiers (Blocker / Major / Minor / Nit). Output is
`r{NN}-integration.md` next to the artifact.

## Eval inputs

Four real artifacts in this repo. The first three exercise normal
behavior; the fourth is adversarial.

1. **Cross-package coupling (provider catalog)**:
   `docs/x002-oauth-standardization/p01-oauth-standardization/02-provider-catalog.md`. Adds
   eight provider configs and a `registerBuiltinOAuthProvider` helper that
   crosses `@os/oauth` ↔ `@os/secrets` ↔ `@os/registry`. Expected: at
   most 1 Minor (consumer list completeness on `provider:openai` Codex
   and `channel:discord`); no Blockers/Majors. Should NOT flag the
   `RegisterBuiltinOverrides` shape (DX scope).
2. **Internal-only refactor**:
   `docs/plans/p016-oauth-cleanup-and-hardening/02-lifecycle-class.md`.
   Refactor inside `@os/oauth`'s package boundary; no public API change
   on the `index.ts`. Expected: 0 Blockers, 0 Majors, ≤1 Minor, ≤1 Nit.
   Must NOT flag internal class boundaries (architecture scope).
3. **Explicit handoff contracts**:
   `docs/plans/p016-oauth-cleanup-and-hardening/03-lifecycle-migration.md`.
   Names six consumers with file:line citations and per-caller migration
   paths. Expected: 0 Blockers, 0 Majors. May surface a Minor if any
   consumer is missing from the list (verify via `Grep` of the changed
   symbol). The "Public HTTP-API change" callout should be acknowledged
   as a documented migration path, not flagged as a break.
4. **Adversarial — public API change with no migration noted**: synthesize
   a one-page test fixture from chapter 03 above by stripping the
   "After" migration blocks and the "Public HTTP-API change" callout,
   leaving only the new `Promise<ForgetIdentityOutcome>` return type.
   Save under the worktree-local `tests/fixtures/review-integration/`.
   Expected: 1 Blocker naming the four CLI/server callers and demanding
   a documented migration path or deprecation shim.

## Pass criteria

- **Severity counts within tolerance** per input above (±1 Minor on
  inputs 1–3 acceptable; counts on input 4 must hit exactly 1 Blocker
  for the missing-migration finding).
- **Adversarial finding caught**: input 4 surfaces the seeded breaking
  change with file:line citations for all four callers found via `Grep`.
- **No false positives on legitimate internal refactor**: input 2 must
  not produce any Blocker or Major. A Minor that strays into
  internal-class shaping is a fail.
- **Citations present**: every finding cites at least one
  `path:line` reference. Findings without citations fail the eval
  regardless of correctness.
- **Scope discipline**: no findings on DX, comprehensiveness, or
  internal architecture. Cross-scope drift on any input is a fail.

## Iteration log

- **Iter 1** (2026-05-09): Initial authoring. Frontmatter and shape
  follow the canonical reviewer template from
  `docs/x000-yolo-project/p01-agent-skills-toolkit/02-foundation-hooks-agents.md`.
  Severity tiers aligned with `d11-process-feedback.md` routing
  (Blocker → `act`, Major → `act`/`process`, Minor → `auto-act`/`defer`,
  Nit → `defer`). Recipe section codifies the consumer-trace workflow
  (`Glob` index.ts → `Grep` callers → walk dep graph → cross-check
  CLAUDE.md conventions → `WebFetch` for external compositions). Eval
  inputs lifted from real recent OAuth plans so the agent exercises
  actual repo coupling shapes. Adversarial fixture deliberately strips
  the documented migration path so the seeded Blocker is unambiguous.
  Awaiting first live dispatch to confirm severity calibration.
