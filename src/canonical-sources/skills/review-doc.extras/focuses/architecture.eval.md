> Promoted from the pre-d15 `review-architecture` agent eval brief. Per decision d15 (in the openspike repo) the `architecture` review *focus* is now a brief loaded by `review-doc` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.

# Eval brief: review-architecture agent

**Task**: T1A2.02

## Contract

Reviewer subagent dispatched by `create-spike`, `create-plan`, and
`execute-plan`. Reads a target artifact (and surrounding artifact set) and
emits an `rNN-architecture.md` review with findings bucketed Blockers /
Majors / Minors / Nits per the project review template. The mandate is
boundary discipline, coupling, and contract shape — anchored in root
`CLAUDE.md` (Module Boundaries, Design Principles, Engineering Principles,
Package Entrypoints) and the d11 severity routing. Major/blocker findings
are decision-shaped and route through `lock-decisions`. Tools: `Read, Glob,
Grep, WebFetch, WebSearch`.

## Eval inputs

Three real artifacts plus one adversarial input. Each scenario lists the
expected findings the dispatched run should surface.

1. **Architecturally clean** — `docs/x002-oauth-standardization/p01-oauth-standardization/`
   (the post-rev README + chapters 02–08). The plan respects existing
   `@os/oauth` boundaries, proposes adapter additions in adapter packages,
   and follows interface-first wording. Expected: 0 Blockers, 0–1 Majors
   (at most one boundary question worth raising), Minors confined to
   localized observations, Nits permitted. A run that surfaces multiple
   Majors here is over-firing.

2. **Cross-cutting change proposed** —
   `docs/x000-yolo-project/p01-agent-skills-toolkit/08-package-architecture.md`. The
   chapter introduces a new package layout, a `defineProjectContext`
   factory not named in spike d05, and a snapshot-test contract whose
   normalization rules are unspecified. Expected: at least 1 Blocker on
   the unspecified snapshot-normalization contract (the only mechanical
   guard against transcription drift), and 1 Major on the unannounced
   fourth canonical factory (a real schema decision missing a `dNN-`
   lock). Minors are acceptable; Nits permitted.

3. **Known design tradeoff** —
   `docs/plans/p016-oauth-cleanup-and-hardening/02-lifecycle-class.md`.
   The chapter consolidates lifecycle behavior into a class and the
   tradeoffs are explicit. Expected: 0 Blockers, 0–1 Majors confined to
   the class-vs-functional consolidation (already a deliberate, captain-
   approved choice — a Major would re-litigate, which is over-firing).
   Minors limited to genuine boundary clarifications. The agent should
   recognize that a captain-locked tradeoff is not a finding to re-open.

4. **Adversarial (seeded boundary breach)** — synthetic input describing
   a proposed change to `@os/oauth` that adds a helper at
   `src/oauthHelpers.ts` (top-level, not a package entrypoint) plus a
   sibling import `import { foo } from '../discovery/internal'` from
   `@os/oauth/lifecycle`. The synthetic doc also introduces
   `declare module '@os/oauth' { ... }` and an `export * from './foo'`
   in the package `src/index.ts`. Expected: 1 Blocker on the
   module-augmentation (`declare module` is forbidden everywhere), 3
   Majors (the cross-module deep import bypassing `index.ts`, the
   wildcard re-export, the top-level `src/*.ts` file that is not a
   package export). Missing any of those four is a fail.

## Pass criteria

- Severity counts within tolerance per scenario above. Tolerance:
  +/- 1 Minor or Nit; Blockers and Majors must match named expectations
  exactly (no extras, no missing).
- The seeded breach in scenario 4 is fully caught: all four signals
  surfaced with correct severity.
- Scenario 1 produces zero false positives — a clean plan stays clean.
- Scenario 3 does not re-open a captain-locked tradeoff as a Major.
- Every finding cites the artifact location, names the rule violated,
  and describes the structural consequence (per agent contract).
- No findings on style, naming, performance speculation, test placement,
  or implementation details internal to a properly-bounded module.
- Severity assignments follow d11 routing: major/blocker findings are
  written as decisions for `lock-decisions`, not as auto-applicable fixes.

## Iteration log

- **Iter 1** (2026-05-09): Initial sharpening pass. Authored the
  focus-specific guidance against root `CLAUDE.md` Module Boundaries +
  Design Principles + Engineering Principles + Package Entrypoints, with
  severity definitions cross-checked against d11 routing rules. Grep
  recipes lifted directly from the rule set (deep imports, `declare
  module`, wildcard re-exports, `extends Error`, cross-package
  re-exports). Two worked examples included — one a SHOULD flag (top-
  level `src/*.ts` that is not a package export) and one a SHOULD NOT
  flag (internal helper inside a properly-bounded module). Eval inputs
  picked from real recent plans: p01 oauth (clean), p01 skills Ch8 (cross-cutting
  with known underspec), p016 Ch2 (captain-locked tradeoff). Adversarial
  input describes four seeded breaches matching four distinct rule
  violations from the agent body, so the eval directly exercises the
  guidance. Not yet executed — execution is a future task.
