> Promoted from the pre-d15 `review-scope` agent eval brief. Per decision d15 (in the openspike repo) the `scope` review *focus* is now a brief loaded by `review-doc` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.

# Eval brief: review-scope agent

**Task**: T1A2.08

## Contract

Reviewer subagent dispatched by `create-plan` (and any lifecycle skill that
includes the `scope` focus baseline) to evaluate whether the artifact stays
inside its stated charter. The agent reads the README's problem statement,
status table, decisions tally, and out-of-scope section, then walks every
task / chapter / new-public-symbol asking "does this serve the charter?"
Findings cite `<file>:<heading-or-line>` and reference the charter clause
violated or the deferral omitted. Severity follows d11 routing (blocker /
major / minor / nit) anchored to the charter, not to reviewer taste. The
agent stays in its lens — architecture, accuracy, and DX concerns are
explicitly out of scope for this reviewer. Tools: `Read, Glob, Grep,
WebFetch, WebSearch`.

## Eval inputs

Each input is a real artifact in this repo plus the dispatch prompt
"Review the scope of <artifact-path>." Expected severity tally and the
specific findings the agent should surface listed per input.

1. **Well-bounded plan** — `docs/plans/p010-guardrail-codification/README.md`.
   A focused convention-enforcement plan with a clean phase table, all
   phases serving the stated codification goal. Expected: zero blockers,
   zero majors. At most one minor (the absence of an explicit Out of Scope
   table) or zero findings. Any major or blocker against this artifact is a
   false positive.

2. **Multi-chapter plan with explicit deferrals** —
   `docs/x002-oauth-standardization/p01-oauth-standardization/README.md`. Eight worktrees plus
   an "Out of Scope" table naming DPoP, mTLS, `private_key_jwt`, RFC 7662
   introspection, RFC 9126 PAR, RFC 9396 RAR, FAPI 2, multi-user `ownerId`
   plumbing, `'custom'` audience mode, and Web-UI disconnect. Expected:
   zero blockers, zero majors, at most one minor. A finding that
   re-litigates an item already named in the deferral table is a false
   positive.

3. **Chapter with rich task-list** —
   `docs/x000-yolo-project/p01-agent-skills-toolkit/12-task-breakdown.md`. ~360 lines
   of phase-numbered tasks. Expected: zero blockers, at most one major
   (agent should notice if any task references a phase not declared in
   Ch01's sub-phase structure) and ≤2 minors. The agent must not flag
   task-density as scope creep — density is necessary detail for the
   chapter's purpose.

4. **Adversarial input — charter narrower than task breakdown reveals**
   (seeded). Author a temporary scratch plan README at
   `docs/plans/_eval-scratch/README.md` whose opening paragraph says the
   plan only fixes a single `clientSecret` refresh bug, but whose status
   table lists chapters for (a) the bug fix, (b) a full encryption
   envelope rewrite, (c) a new metrics seam, (d) a CLI rename. Expected:
   exactly one **major** ("scope of the chapter list exceeds the README's
   stated bug-fix charter; either expand the charter to name encryption,
   metrics, and CLI work, or extract those chapters to follow-up plans")
   and zero false positives on the legitimate bug-fix chapter. The
   adversarial fixture is the bar — if the agent misses it, the eval fails
   regardless of how clean the other three runs are.

## Pass criteria

- Severity counts within tolerance per input above (zero blockers across
  inputs 1–3; exactly one major on input 4).
- Adversarial seeded scope creep on input 4 caught with severity ≥ major
  and a citation that names the offending chapter rows.
- Zero false positives on input 2 (deferrals already documented must not
  re-surface as findings).
- Every finding cites `<file>:<heading>` or `<file>:<line-range>` and
  names the charter clause violated or the deferral omitted — no
  free-floating "this feels broad" findings.
- The agent stays in its lens: architecture, accuracy, comprehensiveness,
  and DX findings on any input fail the eval (out-of-scope reviewer).

## Iteration log

- **Iter 1** (2026-05-09): Initial authoring. Severity definitions
  anchored to the artifact's own charter (per d11). Worked examples drawn
  from real OAuth-plan patterns the captain has seen. "What NOT to flag"
  enumerated to suppress lens-creep into architecture / accuracy. Eval
  inputs picked to exercise the four canonical shapes: well-bounded plan,
  multi-chapter plan with explicit deferrals, task-rich chapter, and an
  adversarial under-scoped charter. Static eval: against the four inputs,
  the agent should produce 0 / ≤1 minor / ≤2 minors / 1 major
  respectively. Awaiting first live dispatch to confirm severity boundaries
  match expectations.
