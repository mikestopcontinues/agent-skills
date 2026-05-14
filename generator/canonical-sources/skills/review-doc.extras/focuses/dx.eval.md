> Promoted from the pre-d15 `review-dx` agent eval brief. Per decision d15 (in the openspike repo) the `dx` review *focus* is now a brief loaded by `review-doc` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.

# Eval brief: review-dx reviewer agent

**Task**: T1A2.06

## Contract

Reviewer subagent at `__SKILL_HOME__/agents/review-dx.md`, dispatched by
`create-spike`, `create-plan`, and `execute-plan`. Frontmatter pins
`model: opus` and `tools: Read, Glob, Grep, WebFetch, WebSearch`. Lens:
developer ergonomics of every developer-facing surface the artifact
proposes — anchored on time-to-first-success, discoverability, default
correctness, sibling consistency, progressive disclosure, failure
ergonomics, and accidental complexity. Outputs `rNN-dx.md` per the
canonical Blockers/Majors/Minors/Nits template, every finding paired
with a concrete recommendation. On artifacts with no developer-facing
surface, returns zero findings and says so explicitly.

## Eval inputs

1. **Real plan chapter with developer surface** —
   `docs/x000-yolo-project/p01-agent-skills-toolkit/02-foundation-hooks-agents.md`.
   Proposes hook frontmatter, `pre-write-doc`/`pre-bash-doc` discipline,
   reviewer agent shape, and the `<hook>.test/` fixture format.
   Expected: 1–2 majors (likely the fixture-format and `defineHook`
   precursor shape), 1–2 minors, 0–1 nits. No blockers.
2. **Real spec note** —
   `docs/x000-yolo-project/decisions/d11-process-feedback.md`. Proposes
   `triage-feedback` cluster output, `process-feedback` verdict shapes,
   and routing rules — all developer-consumed contracts. Expected: 1
   major on verdict-shape discoverability (markdown-only, no schema), 1
   minor on cluster-route enum naming consistency, 0–1 nits.
3. **Control: chapter with no developer surface** —
   `docs/x000-yolo-project/p01-agent-skills-toolkit/11-cutover-and-followups.md`.
   Internal cutover sequencing only. Expected: zero findings, summary
   states "no developer-facing surface proposed" and stops.
4. **Adversarial input** — synthetic chapter `T1A2.06-adversarial.md`
   describing a proposed `defineToolkit({ skills: SkillRef[],
   hooksConfig: { matcher: { regexes: string[]; eventList: string[] };
   handlerStringOrModule: string; legacyShape?: any } })` factory: kebab
   nowhere, every field required, no defaults, no discriminator on
   `handlerStringOrModule`, names diverge from sibling `defineSkill` /
   `defineHook` (`hooksConfig` vs `hooks`, `regexes` vs `matchers`),
   error message documented as `"invalid input"`. Expected: 1 blocker
   (`handlerStringOrModule` non-discoverable), 2–3 majors (mandatory
   ceremony, wrong defaults, sibling-naming divergence), 1 minor
   (error-message specificity), 1 nit (`hooksConfig` → `hooks`).

## Pass criteria

- Severity counts within ±1 of the expected envelope per input.
- The seeded ergonomic friction in input 4 is caught: at minimum the
  union-type discoverability blocker and the sibling-naming divergence
  major must surface with the recommended fixes named.
- Zero findings on input 3 (false-positive control). A finding here
  fails the eval regardless of how plausible it sounds.
- Every emitted finding cites `[file:section]` and pairs the problem
  with a concrete recommendation. Findings without a recommendation
  fail the eval.
- The reviewer does not stray into architecture, accuracy, clarity, or
  performance lanes. Cross-lens findings fail the eval — those belong
  to sibling reviewers.

## Iteration log

- **Iter 1** (2026-05-09): Authored agent and brief. Static eval —
  scenarios drafted but not yet dispatched against the live agent.
  Adversarial fixture (`T1A2.06-adversarial.md`) needs to be authored
  as a standalone file before the first live run. Expected behaviors
  derived by mental walkthrough against the agent prompt; first live
  dispatch will calibrate severity envelope tolerances.
