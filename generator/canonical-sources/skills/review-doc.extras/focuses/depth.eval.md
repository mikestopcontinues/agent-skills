> Promoted from the pre-d15 `review-depth` agent eval brief. Per decision d15 (in the openspike repo) the `depth` review *focus* is now a brief loaded by `review-doc` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.

# Eval brief: review-depth agent

**Task**: T1A2.05

## Contract

Reviewer subagent dispatched by `create-spike` to evaluate research rigor for
one artifact. Flags load-bearing claims about external software (library,
framework, CLI, vendor service) that lack source-code provenance — i.e. no
`.repos/<name>/file:line`, no commit SHA, and no version-pinned URL paired
with a source reference — or speculative claims missing the `[UNVERIFIED]`
marker. Severity scales with load-bearing-ness: blocker when a recommendation
rests entirely on marketing/docs, major when an unmarked load-bearing claim
has no source, minor when partial corroboration was skipped, nit when an
extra reference repo would have triangulated. Stays in lane — does not flag
DX, architecture, scope, clarity, comprehensiveness, or factual accuracy of
already-cited claims. Tools: `Read, Glob, Grep, WebFetch, WebSearch`.

## Eval inputs

1. **Library-claim-rich chapter** —
   `docs/x000-yolo-project/s01-harness-conversion/01-harness-capability-matrix.md`
   (Ch1, harness capability matrix). Dense with claims about Claude Code,
   Codex CLI, OpenCode behavior. Sources block lists `.repos/` paths with
   version pins. Expected: 0–1 majors (most claims are well-sourced); a
   handful of minors/nits where prose makes a sweeping claim without an
   inline file:line. **No blockers.**
2. **Explicitly-marked-unverified chapter** —
   `docs/x000-yolo-project/s01-harness-conversion/02-source-of-truth.md`
   (carries `[UNVERIFIED — order documented in source comments, not in the
   official user docs]` on line 85). Expected: 0 majors / 0 blockers on the
   marked claim itself; reviewer must recognize the marker as the discipline
   working as intended. May surface minors elsewhere; must not flag the
   marked line as a finding.
3. **Decision note** —
   `docs/x000-yolo-project/decisions/d12-codex-plugin-required-for-hooks.md`.
   Short, conclusion-shaped. Expected: 0–1 minors at most; review-depth's
   surface area on a decision note is small. Mostly serves as a
   noise-floor check — depth should not invent findings on a doc with
   little to investigate.
4. **Adversarial input** — a synthetic chapter (or a captain-prepared one
   placed temporarily in `docs/x000-yolo-project/notes/_eval-fixtures/`)
   containing 5+ confident claims about external libraries with zero source
   citations, no version pins, no `[UNVERIFIED]` markers, and a recommendation
   that depends on those claims. Expected: ≥1 blocker (recommendation has
   no source trail); ≥3 majors (each unmarked load-bearing claim).

## Pass criteria

- **Severity within tolerance per input** (above counts ±1 per bucket).
- **Adversarial input**: every seeded source-less load-bearing claim is
  caught. Recommendation flagged blocker. Zero seeded gaps slip through.
- **No false positives on properly-cited content**: input #1's `.repos/`-cited
  claims and input #2's `[UNVERIFIED]`-marked line are not flagged.
- **Lane discipline**: no findings about prose style, missing decisions, DX,
  architecture, or scope. Any drift here is an iteration target.
- **Remediation specificity**: every finding names the specific source the
  author should cite (`.repos/X/path` or version-pinned URL + source ref),
  not "add a citation."

## Iteration log

- **Iter 1** (2026-05-09): Initial authoring. Severity ladder anchored on
  load-bearing-ness rather than claim count. Verification recipe pulled
  from CLAUDE.md "Research discipline" (pin version, WebFetch official docs,
  Context7 version-match, source over docs) and `researcher.md` Strategies
  (`.repos/` over `gh browse`, mark `[UNVERIFIED]`, track provenance). What-
  NOT-to-flag carved against the other seven baseline reviewers' lanes per
  d08. Worked examples drawn from real shapes in `s01-harness-conversion/`
  Ch1 prose. Awaiting first live dispatch.
