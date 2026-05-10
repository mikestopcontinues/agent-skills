> Promoted from the pre-d15 `review-comprehensiveness` agent eval brief. Per decision d15 (in the openspike repo) the `comprehensiveness` review *focus* is now a brief loaded by `review-doc` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.

# Eval brief: review-comprehensiveness agent

**Task**: T1A2.03

## Contract

Reviewer subagent dispatched by `archive-project` and the overall
`validate-doc` pass to verify that a condensed artifact (project README,
plan README, archived note) carries every locked decision, follow-up,
constraint, rationale, and provenance link a downstream agent or future
captain will need. Read/Glob/Grep/WebFetch/WebSearch only — no Write,
no edits. Cross-checks the artifact against on-disk primary sources
(`dNN-` decisions, sibling chapters, iteration logs). Severities follow
d11's routing: Blocker = missing decision; Major = missing rationale or
follow-up; Minor = stale/missing provenance; Nit = cosmetic. Does NOT
flag clarity, scope creep, architectural objections, or subjective
"could include X too" — those are other reviewers' domains.

## Eval inputs

1. **Spike condensation README** —
   `docs/x000-yolo-project/s01-harness-conversion/README.md`. Six
   chapters plus 13 decisions condensed. Expected: zero findings (all
   13 decisions are listed by name with provenance; archived ones note
   the supersession; research-notes hoisted; glossary present).
2. **Plan README** —
   `docs/x000-yolo-project/p01-agent-skills-toolkit/README.md`. Multi-phase plan
   summary with status table. Expected: 0–1 Minor (provenance to spike
   chapters could be denser per chapter); no Blockers/Majors.
3. **Archived note** — `docs/x000-yolo-project/notes/security-posture.md`.
   Captures v0.1 posture + 8 v0.2 follow-ups (B1, M1–M8). Expected:
   zero findings (every follow-up named, every mechanical fix listed
   with provenance to r05; threat model + acknowledged limitations
   present).
4. **Adversarial input — seeded omission.** Make a working copy of
   input #1 with the line for `d11-process-feedback.md` deleted from
   the Decisions list (and only that line). Dispatch on the working
   copy. Expected: one Blocker finding naming `d11` by file path,
   citing `decisions/d11-process-feedback.md` as the primary source,
   noting downstream `validate-loop` implementers will re-derive
   routing. No false positives elsewhere.

## Pass criteria

- Severity counts within tolerance: inputs #1 and #3 produce **zero**
  Blockers/Majors; input #2 produces 0 Blockers, 0 Majors, 0–1 Minor;
  input #4 produces **exactly one** Blocker for the seeded omission.
- The seeded omission in #4 is caught by file path (`d11-process-feedback.md`),
  not by paraphrase; downstream-impact rationale appears in the finding body.
- No false positives on intentionally-condensed material — agent does not
  flag absent chapter-level detail when the README is summarizing, and does
  not flag absent rationale when rationale exists in the linked `dNN-` file
  and the README cites it by name.
- Each finding carries a `[file:section]` citation and names the primary
  source where the missing context lives (decision file, chapter, or commit).
- No findings about clarity, scope, or architecture — those route to other
  reviewers per d08.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass after authoring
  `__SKILL_HOME__/agents/review-comprehensiveness.md`. Focus-specific guidance
  written around the d11-style decision-trace contract. Severity table
  aligned to d11 routing semantics (Blocker→act, Major→act, Minor/Nit
  per ambiguity). Worked examples surface-vs-skip drafted from the
  spike's own README. Inputs selected to span condensation flavors
  (spike README, plan README, archived note). Adversarial seeding plan
  documented (delete `d11` line from input #1). No live dispatch yet —
  scenarios captured for first real use against archive-project.
