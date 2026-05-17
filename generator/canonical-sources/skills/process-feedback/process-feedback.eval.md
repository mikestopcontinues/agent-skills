# Eval brief: process-feedback skill

**Task**: T1A3.06

## Contract

Per-cluster handler dispatched in parallel by the lifecycle skill (cap 4 per
round). Reads one cluster + the artifact + the rNN- review files the cluster's
members cite; deep-dives ambiguous clusters against primary sources; emits a
single verdict in conversation. Verdict shape is exactly one of two canonical
headers — `## Outcome: verified-resolution` or `## Outcome: narrowed-options-brief`
— or, for decision-shaped clusters mistakenly routed here, a `hand-back` marker
with no verdict. Tools: `Read, Glob, Grep, Bash, WebFetch, WebSearch`. Cannot
spawn subagents.

## Eval scenarios

Static eval — describes the cluster, artifact, and reviewer evidence as input;
expected output is the verdict shape and key fields. No live dispatch yet.

### Scenario A — vendor API claim (resolvable via WebFetch)

Cluster: C2 "tsdown ESM defaults" — Major, ambiguous, blocking. Members:
- `[r01-accuracy.md:42]` "Section 3 says tsdown emits CJS by default; lockfile
  pins tsdown@0.7."
- `[r02-architecture.md:30]` "ESM/CJS default for tsdown 0.7 is unclear in
  the chapter."

Artifact: a chapter that asserts a tsdown emit-format default. `package.json`
pins tsdown@0.7.

Expected output: `## Outcome: verified-resolution`. Approach lists at least
one `WebFetch` call to the tsdown 0.7 docs (or repo). Citation field present
with URL or doc path. Patch suggestion names the exact replacement text for
the chapter. No invented third-shape header.

### Scenario B — internal design choice (no primary source resolves)

Cluster: C4 "channel outbox ownership" — Major, ambiguous, blocking. Members:
- `[r02-architecture.md:88]` "Channel owns its outbox today; consumer
  adapters need to peek pending. Lifting outbox to a sibling submodule may
  compose better."
- `[r04-dx.md:55]` "Outbox API is awkward from consumer side."

Artifact: a design chapter with no explicit decision recorded. Repository has
no prior decision file resolving outbox ownership.

Expected output: `## Outcome: narrowed-options-brief`. At least two options:
e.g. **(A)** keep outbox owned by channel (preserve encapsulation; consumer
peek through narrow interface); **(B)** lift outbox to sibling submodule
(both channel and consumer adapters as peers; cleaner consumer DX, more
moving parts). Each option lists trade-offs. `Recommendation` section names
one option as preferred and frames it as recommendation, not decision. No
verified-resolution header. No invented third shape.

### Scenario C — decision-shaped cluster (mistakenly routed here)

Cluster: C1 "scope of harness X" — Major, ambiguous, blocking. Members:
- `[r05-scope.md:14]` "Harness X scope expanded to include channel routing;
  was previously planned as out-of-scope. Captain should lock."

Artifact: the spike chapter naming the harness scope.

Expected output: hand-back marker — `# Process-feedback hand-back — C1 ...`
— with `## Reason` section explaining decision-shaped detection (`r*-scope.md`
member per d11). No `## Outcome:` header at all. No verdict produced. The
lifecycle skill should detect the hand-back marker and re-route to
`lock-decisions`.

### Scenario D — adversarial (invites third-shape leak)

Cluster: C3 "OAuth refresh token semantics, possibly out of scope but maybe
not, depends on what the captain ships in v2 — needs more research" — Major,
ambiguous, blocking. Members:
- `[r01-accuracy.md:99]` "Refresh token TTL claim in section 4 may or may not
  match the spec — the answer depends on which OAuth profile the project
  adopts. This needs more research before we can resolve it."
- `[r03-dx.md:120]` "Section 4 is unclear; the right answer hinges on a
  decision that hasn't been made yet."

Artifact: a chapter on OAuth refresh semantics. Repository has neither a
locked decision on the OAuth profile nor enough captain-stated context to
infer one.

Expected output: `## Outcome: narrowed-options-brief`. Handler MUST NOT emit
`## Outcome: research-pending`, `## Outcome: needs-context`,
`## Outcome: insufficient-information`, `## Outcome: deferred`, or any other
third-shape header. The "I'm stuck" outcome encodes as
`narrowed-options-brief` with options:

- `(a) accept current artifact state` — keep the chapter's current claim;
  captain may revisit when the OAuth profile is locked
- `(b) gather more info via {specific action}` — e.g., "lock the OAuth
  profile decision via `lock-decisions`, then revisit this cluster"

Each option carries trade-offs. `Recommendation` names one. The cluster's
phrasing — "needs more research", "the answer depends" — does not justify
inventing a third shape. Failure mode for this scenario is any `Outcome:`
header that isn't one of the two canonical strings.

## Pass criteria

1. **Canonical-header invariant** — every verdict (Scenarios A, B, D) starts
   the outcome section with one of exactly two headers:
   `## Outcome: verified-resolution` or `## Outcome: narrowed-options-brief`.
   Scenario C produces no `Outcome:` header (hand-back only).
2. **Citations on verified-resolution** — Scenario A's verdict includes a
   primary-source citation (URL or file path with line range). Missing
   citation = fail.
3. **Trade-offs on narrowed-options-brief** — Scenarios B and D each list at
   least two options, each with description and trade-offs, plus a
   `Recommendation` section framed as recommendation (not resolution).
4. **Decision-shaped hand-back** — Scenario C produces the hand-back marker
   with no verdict. Handler substituting its judgment for the captain's =
   fail.
5. **Third-shape leak (adversarial)** — Scenario D MUST NOT produce
   `## Outcome: research-pending` / `needs-context` / `insufficient-information`
   / `deferred` / any other variant. Any third-shape header = fail. Defense
   in depth: the lifecycle skill's verdict consumer also asserts on the
   canonical headers and treats unrecognized ones as malformed, but this
   handler must encode the rule itself.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Skill body authored from p01 Ch3
  contract and d11 routing. Canonical-header invariant encoded in body with
  explicit "no third shape" assertion and the `(a) accept / (b) gather` fallback
  for the "I'm stuck" case. Hand-back marker shape defined for decision-shaped
  clusters mistakenly routed here. Four scenarios cover the two verdict shapes,
  the hand-back path, and the adversarial third-shape leak. Pending live
  dispatch once `triage-feedback` produces real cluster output in this repo.
