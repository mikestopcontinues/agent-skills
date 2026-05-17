# Eval brief: triage-feedback skill

**Task**: T1A3.05

## Contract

Cluster-routing skill. Inputs: `rNN-{focus}.md` paths + artifact path. Reads
each rNN- file, classifies severity from the H3 header and category from the
filename, dedupes findings naming the same defect at the same location across
reviewers, groups remaining findings by topic, severity-normalizes (max),
marks ambiguity and blocking per d11, detects decision-shaped members
(`r*-scope.md` always; `major`/`blocker` in `r*-architecture.md`), splits
mixed-route clusters with cross-reference, and routes per the d11 table.
Output: conversational markdown matching the schema in `__SKILL_HOME__/agents/triage.md`.
Tools: `Read, Glob, Grep` only — no Dispatch.

## Eval scenarios

Synthetic rNN- inputs are described inline; not committed. Verify by inspecting
the cluster list against the expected output.

### Scenario 1 — semantic dedupe across reviewers

**Input** (artifact `docs/spikes/sNNN/03-auth.md`):

- `r01-accuracy.md` `## Majors`: "Section 3 claims Valibot ships an
  `alignSchema` helper; it does not — the helper is in `@os/core/types`."
- `r02-architecture.md` `## Majors`: "The `alignSchema` reference in section
  3 is wrong. Valibot doesn't expose this; ours lives in `@os/core/types`."
- `r03-dx.md` `## Minors`: "Section 5 example uses tabs; rest is two-space."
- `r04-comprehensiveness.md` `## Nits`: "README link to chapter 7 missing."

**Expected**: 3 clusters. C1 "alignSchema source", Major, unambiguous, blocking,
surfaced by `accuracy`+`architecture` (one merged member), route `act`. C2
"section 5 indent", Minor, unambiguous, non-blocking, route `auto-act`. C3
"missing chapter 7 link", Nit, route `defer`. Pass when cluster count = 3
(not 4 — dedupe collapsed two phrasings) and C1 lists both reviewers.

### Scenario 2 — mixed severities + scope-category decision-shape

**Input** (artifact `docs/plans/pNNN/02-architecture.md`):

- `r01-architecture.md` `## Blockers`: "Module X imports from sibling Y's
  internals — boundary breach at line 42."
- `r02-scope.md` `## Majors`: "Plan covers webhook delivery but the captain
  scoped this to inbound only — needs a decision on whether to expand."
- `r03-dx.md` `## Minors`: "Function name `doStuff` is non-descriptive."
- `r04-security.md` `## Nits`: "Code block 4 lacks a language tag."

**Expected**: 4 clusters. C1 "module X boundary breach", Blocker, unambiguous,
blocking, route `act`. C2 "webhook scope expansion", Major,
**decision-shaped** (from `r*-scope.md` — category alone, not severity),
blocking, route `lock-decisions`. C3 "function naming", Minor, ambiguous (style
judgment), non-blocking, route `process`. C4 "missing language tag", Nit, route
`defer`. Pass when C2 routes to `lock-decisions` purely on filename category;
C3 is `process` (ambiguous Minor), not `auto-act`; nit is not dropped.

### Scenario 3 — cluster split (decision-shaped + non-decision on same topic)

**Input** (artifact `docs/spikes/sNNN/05-channel-contract.md`):

- `r01-accuracy.md` `## Minors`: "Code block in section 4 has a typo:
  `chanel.send` should be `channel.send`."
- `r02-architecture.md` `## Majors`: "Channel adapters expose an outbox state
  field; this couples adapters to persistence — should outbox be owned by the
  channel contract or by the runtime?"
- `r03-scope.md` `## Majors`: "Whether channels own outbox state is a
  load-bearing decision the captain should lock — current spike treats it as
  settled."
- `r04-comprehensiveness.md` `## Minors`: "Section 4 missing a sequence
  diagram for outbox flush."

**Expected**: 3 clusters (one topic split into two). C1 "section 4 typo",
Minor, unambiguous, non-blocking, route `auto-act`. C2 "channel outbox
ownership (decision)", Major, **decision-shaped** (architecture-Major +
scope), blocking, surfaced by `architecture`+`scope`, route `lock-decisions`,
**see also C3**. C3 "channel outbox sequence diagram gap", Minor, ambiguous,
non-blocking, surfaced by `comprehensiveness`, route `process`, **see also
C2**. Pass when the architecture+scope+comprehensiveness findings merge into
one topic-cluster and then split because the cluster mixes decision-shaped
and non-decision members; both halves carry reciprocal cross-references.

## Static eval

Read-only. Walk the cluster list the skill returns against expected output.
Do not dispatch live subagents — these are reasoning fixtures for skill
iteration.

## Iteration log

- **Iter 1** (2026-05-09): Initial draft. Three scenarios target the highest-
  risk failure modes from Ch3:160–164: semantic dedupe equivalence,
  category-based decision-shape detection, cluster split with cross-reference.
  Severity-normalization (max, not average) is exercised in Scenario 1's C1.
