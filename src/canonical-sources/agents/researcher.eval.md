# Eval brief: researcher agent

**Task**: T1A1.10

## Contract

Cognitive-profile subagent dispatched by `create-spike` (and other research-heavy
flows) for breadth-first investigation. Embodies "evidence-first investigation —
breadth before depth, skeptical of abstractions." Required behaviors: pin the
target version from `package.json`/lockfile before researching; verify external
library/framework/CLI/service claims against the official web docs at the
pinned version (Context7 only when returned version matches exactly, otherwise
`WebFetch`); prefer local source code in `.repos/` over `gh browse` for
reference libraries; survey breadth before depth; cross-reference independent
sources; mark unverified claims `[UNVERIFIED]` and track provenance with
file:line / URL / SHA. Tools: `Read, Grep, Glob, Write, WebFetch, Bash`.

## Eval scenarios

Each scenario is a dispatch prompt the captain (or an orchestrator skill) would
send to the researcher. Expected behavior captured per scenario.

1. **External library capability check** — "Does Valibot v1.x support
   bidirectional schema-to-type alignment, and what is the canonical pattern?
   Report findings." Expected: agent reads root `package.json` to pin the
   Valibot version, `WebFetch`es the version-specific Valibot docs (not a
   generic landing page), cross-checks against any `.repos/valibot` clone or
   local source, and reports findings with citations. If Context7 is
   consulted, the version must match — otherwise it falls through to
   `WebFetch`. Unverifiable assertions are marked `[UNVERIFIED]`.

2. **Reference-repo pattern survey** — "Survey how three or more agentic
   runtimes in `docs/REFERENCE.md` model channel inbound events. Identify
   convergences and outliers." Expected: agent enumerates the candidate
   reference repos from `docs/REFERENCE.md`, pulls fresh `.repos/<name>`
   clones for direct file access, reads actual source (not READMEs alone),
   produces a structured comparison with file:line citations, and flags
   absences as findings. Does not over-focus on the best-known repo.

3. **Skeptical re-check of a delegated claim** — "Sub-agent X reported that
   tsdown emits ESM-only by default. Verify before we wire this into our
   build config." Expected: agent treats the prior summary as a hypothesis,
   checks `package.json` for the tsdown version in use, `WebFetch`es the
   version-specific tsdown docs, and inspects the actual tsdown source or
   config schema. Reports a verified outcome with provenance — confirming,
   refuting, or marking the claim `[UNVERIFIED]` if the primary source is
   ambiguous.

## Pass criteria

For each scenario, the dispatched run must (a) pin the target version before
making version-specific claims, (b) cite primary sources (URL or file:line)
for every load-bearing assertion, (c) use `WebFetch` for external docs unless
Context7's returned version matches exactly, (d) prefer local `.repos/` clones
over `gh browse` for reference libraries, (e) mark unverified claims
`[UNVERIFIED]`, and (f) avoid premature recommendations before the survey is
complete. A run that recommends without first surveying, or asserts without
citing, fails the eval regardless of the conclusion's correctness.

## Iteration log

- **Iter 1** (2026-05-09): Initial sharpening pass. Drift fixed: bare
  `REFERENCE.md` corrected to `docs/REFERENCE.md`. Strategies tightened with
  the four CLAUDE.md research-discipline rules (pin version, WebFetch
  official docs, Context7 version-match, source-code-over-docs) plus the
  `.repos/` workflow and `[UNVERIFIED]` marking convention from project
  memory. Tools expanded with `WebFetch` and `Bash` so the agent can
  actually execute the discipline. Structure (Priorities/Values/Thinking
  Style/Strategies/Focus Areas) and frontmatter preserved. Eval scenarios
  exercise web-doc verification, reference-repo breadth, and delegated-claim
  skepticism — the three places where a researcher most often drifts.
