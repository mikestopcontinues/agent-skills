> Promoted from the pre-d15 `review-accuracy` agent eval brief. Per decision d15 (in the openspike repo) the `accuracy` review *focus* is now a brief loaded by `review-doc` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.

# Eval brief: review-accuracy reviewer agent

**Task**: T1A2.01

## Contract

Reviewer subagent dispatched by `create-spike`, `create-plan`,
`archive-project`, and `execute-plan` to verify external factual claims
(library APIs, framework behavior, vendor docs, spec/standards, version
numbers) against primary sources at the project's pinned version. Produces
`rNN-accuracy.md`. Findings are external-source mismatches, missing
citations, version mismatches, dead URLs, misattributed sources, or
unmarked unverified claims. Stays out of subjective design opinions
(architecture / dx / clarity / scope / comprehensiveness reviewers own
those). Severity ladder: blocker > major > minor > nit per d11. Anchors
the iteration discipline for the other 7 reviewer agents.

## Eval inputs

Three real chapters from `docs/x000-yolo-project/s01-harness-conversion/`,
plus one adversarial seed:

1. **Cleanly-written chapter** —
   `03-project-organization.md` (507 lines, 0 `[UNVERIFIED]`). Mostly
   internal-design prose with few external claims. **Expected**: 0
   blockers, 0–1 majors (any unsourced load-bearing claim about harness
   directory layout), at most a handful of minors/nits. A noisy run here
   is the canonical false-positive failure mode — most observations
   should belong to other reviewers.
2. **Rich-external-claims chapter** —
   `01-harness-capability-matrix.md` (404 lines, 0 `[UNVERIFIED]`). Dense
   with version-pinned claims (`cli_version: 0.111.0`, `opencode-ai@1.4.6`,
   Claude Code `v2.1.86`, agentskills.io standard, hook-event counts, file
   paths into `.repos/`). **Expected**: 0–2 blockers if any cited path
   has drifted, 3–6 majors (table cells without per-cell citation despite
   load-bearing position), 5–10 minors (parenthetical claims without
   inline source), nits for "1.x" style version smearing. The capability
   matrix table itself should produce a whole-section recommendation
   ("add Sources column"), not a finding per cell.
3. **`[UNVERIFIED]`-bearing chapter** —
   `02-source-of-truth.md` (401 lines, 1 `[UNVERIFIED]` at line 85). The
   marked claim must NOT be flagged (the author did the right thing). The
   surrounding paragraph's other claims (Codex `Repo > User > System >
   Admin`, OpenCode 8-tier precedence) should be spot-checked against
   `.repos/codex-cli/` and `.repos/opencode/`. **Expected**: 0 blockers,
   0–2 majors, the `[UNVERIFIED]`-marked claim absent from findings.
4. **Adversarial seed** — a synthetic chapter fragment containing four
   deliberately-seeded false claims:
   (a) "Claude Code's `Task` tool was renamed to `Agent` in v2.0.0" —
   verifiable false against `.repos/claude-code/` source;
   (b) "Codex CLI requires `features.codex_hooks: true` even for
   plugin-shipped hooks" — directly contradicts d12 and Ch1's headline
   finding #3;
   (c) "OpenAI's o1 model has a 200k context window" — wrong (128k per
   official docs at the pinned model version);
   (d) "Valibot v1.x supports declaration-merging" — fabricated; no such
   feature in the pinned version. **Expected**: all four caught; (a) and
   (b) as **blockers** (downstream work would break), (c) as **major**
   (load-bearing if used to size prompts), (d) as **major** (would
   misroute schema architecture).

## Pass criteria

- Severity counts within ±1 of expected for inputs 1–3 in each bucket.
- All four seeded claims in input 4 caught; (a) and (b) classified as
  blocker; (c) and (d) classified as major or blocker.
- Zero false positives on subjective design choices, scope, coupling,
  phrasing, or internal contradictions across inputs 1–3.
- The `[UNVERIFIED]`-marked claim in input 3 is NOT flagged.
- Every finding cites an artifact location AND a primary-source
  disconfirmation (URL, `file:line`, or "WebFetch returned 404").
- No finding paraphrases an artifact claim — the reviewer quotes verbatim
  before disconfirming.
- Whole-section recommendations (e.g., "add Sources column to capability
  matrix") appear in Summary, not as N duplicated per-cell findings.

## Static eval rationale

Brief documents *expected* findings without live dispatch. The prompt
produces them because: the six accuracy-finding shapes match the seeded
failure modes; the "What NOT to flag" list routes subjective/scope/clarity
observations to sibling reviewers (suppressing input 1's false-positive
risk); the verification recipe pins version before WebFetch (catches input
4 seeds b and c); and the false-positive section explicitly excludes
`[UNVERIFIED]`-marked claims (protects input 3 line 85). Live dispatch on
first real review.

## Iteration log

- **Iter 1** (2026-05-09): Initial authoring pass. Anchors the iteration
  discipline for the other 7 reviewers — six accuracy-finding shapes,
  severity tied to downstream consequence, explicit exclusions routed to
  sibling reviewers, five-step verification recipe (pin → read cited
  source → version-specific WebFetch → Context7-only-on-version-match →
  skim). Eval inputs stress false positives, volume + version pinning,
  `[UNVERIFIED]` discipline, and seeded-defect detection.
