> Promoted from the pre-d15 `review-clarity` agent eval brief. Per decision d15 (in the openspike repo) the `clarity` review *focus* is now a brief loaded by `review-doc` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.

# Eval brief: review-clarity reviewer agent

**Task**: T1A2.04

## Contract

Reviewer subagent dispatched by `archive-project` and overall `validate-doc`
to assess whether an artifact is readable to a future captain who has no
context. Read-only (Read/Glob/Grep/WebFetch/WebSearch) — emits a single
`rNN-clarity.md` file per the canonical review template. Does not assess
correctness, completeness, architecture, or scope; those belong to other
reviewers. Severity boundaries align with d11 routing (`nit`/`minor` non-
blocking, `major`/`blocker` blocking).

## Eval inputs

1. **Cleanly-written chapter** —
   `docs/x000-yolo-project/s01-harness-conversion/06-conversion-catalog-migration.md`
   (272 lines, well-bounded, clear lede). Expected: zero blockers, zero
   majors, ≤ 2 minors, ≤ 3 nits. The reviewer should not invent findings
   to look productive.

2. **Condensed README** —
   `docs/x000-yolo-project/s01-harness-conversion/README.md` (71 lines,
   index-shape doc summarizing the spike). Expected: zero blockers, zero
   majors. Minors permitted only if a wikilink target is unobvious or a
   navigation cue is missing. Nits ≤ 2.

3. **Dense decision note** —
   `docs/x000-yolo-project/decisions/d11-process-feedback.md` (175 lines,
   long paragraphs, project-specific terms like "act / surface / defer /
   decision-shaped", "process-feedback", "lock-decisions"). Expected: zero
   blockers; majors only if a load-bearing term is genuinely undefined on
   first use. Long-but-structured sections must NOT generate length-only
   findings — that is the dense-but-clear false-positive trap.

4. **Adversarial input** — A short synthetic draft (described inline in the
   eval, not committed to docs/) seeded with: (a) "the FTRR pass blocks
   when it cannot drain" — `FTRR` is never expanded; (b) a paragraph that
   says "It then routes the result to it, which forwards it" with three
   "it" pronouns lacking distinct antecedents; (c) a section titled
   "Approach" whose first 80% is preamble, with the actual approach in the
   last sentence; (d) the term "harness" used in two senses (CLI runner
   vs. test harness) without distinguishing. Expected: at least one
   blocker OR two majors; specifically, the undefined `FTRR`, the pronoun
   chain, and the buried lede must each surface as separate findings.
   Inconsistent "harness" usage should surface as a major.

## Pass criteria

- **Severity counts within tolerance** for each non-adversarial input
  (blockers: 0; majors: 0 for inputs 1–2, ≤ 1 for input 3; minors and nits
  per the per-input bounds above).
- **Seeded ambiguity caught**: the adversarial input surfaces all four
  seeded issues at major or higher; no seeded issue dropped to nit.
- **No false positives on dense-but-clear technical prose**: input 3 must
  not generate length-only findings. Long paragraphs with explicit internal
  structure (named anchors, numbered sub-points) are out of scope.
- **No domain crossover**: zero findings about correctness, completeness,
  scope, or architecture across all four inputs. If the reviewer flags a
  factual error or a missing decision, that is a domain leak and fails the
  eval.
- **Output shape**: each output is a valid `rNN-clarity.md` with all four
  severity sections present (empty sections written as `(none)`), every
  finding carrying a `[file:line]` cite.

## Iteration log

- **Iter 1** (2026-05-09): Initial agent prompt authored alongside this
  brief. Frame anchored on "future captain with no context" per the plan
  mandate; severity definitions aligned with d11; explicit not-to-flag
  list to head off domain leaks into other reviewers' scopes; one worked
  example each for surface and don't-surface to calibrate the dense-but-
  clear false-positive trap. No live dispatch yet — eval inputs captured
  for first real run; the adversarial draft will be authored at dispatch
  time and held in the eval scratch space, not committed to `docs/`.
