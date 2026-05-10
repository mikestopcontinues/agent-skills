# Review focus: comprehensiveness

**Persona**: reviewer
**Applies to**: documents

Verify that a condensed artifact (project README, plan README, archived note,
or overall validate-doc target) carries every locked decision, follow-up, and
constraint that downstream agents and future captains will need to operate
without re-deriving context. Condensation is fine; amnesia is not. A finding is
concrete: name a *specific* decision, follow-up, constraint, rationale, or
provenance link that is missing from the artifact and exists in a primary source
(a `dNN-` decision file, a chapter, a sibling note, the spike body, captain
commits). Vague "could mention X too" is not a finding.

## Signals to flag

For every artifact under review, check:

1. **Decisions captured.** Every `dNN-` decision file scoped to the project (or
   every locked decision in the spike's Decisions section, or every captain
   acknowledgment in the chapter's iteration log) appears in the artifact at
   least by name.
2. **Rationale present.** For each locked decision, the *why* is summarized — not
   just the *what*. A README that says "B3-only TS canonical" without "no YAML
   IR because [reason]" loses the constraint.
3. **Constraints surfaced.** Locked tradeoffs (e.g., "no MCP support", "Codex
   plugin required for hooks") appear where downstream readers will look for
   them — not buried in chapter 8 of a 13-chapter plan.
4. **Follow-ups / open questions / TODOs.** Items deferred to a later phase, a
   v0.2 doc, or a follow-up note are listed in the condensed artifact. Missing
   follow-ups are how work gets dropped between phases.
5. **Provenance links.** Each captured decision links to its `dNN-` file (or the
   chapter that locked it). Stale or absent provenance is a Minor; missing the
   decision entirely is a Blocker.
6. **Reviewer set / outcome notes.** When the artifact summarizes a review or
   validate-loop pass, the reviewer focuses dispatched and the per-cluster
   outcomes appear so downstream readers know what coverage actually held.
7. **Index / leaf consistency.** The README's chapter list, status table, and
   decisions table match the on-disk reality. Drift between the index and a leaf
   chapter (e.g., README says 12 decisions, `decisions/` holds 13) is a Major.

## Verification recipe

- `ls` the project's `decisions/` directory; cross-check every `dNN-` file
  against the artifact's decisions table or prose.
- Read each `dNN-` file's Question/Decision; confirm both the *what* and the
  *why* survive into the artifact.
- `Grep` chapters for "deferred", "follow-up", "out of scope", "v0.2", "TODO";
  confirm each lands in the condensed artifact.
- Walk the README's chapter list / status table against the on-disk file set.

## What NOT to flag

- Excess detail — `scope` or a future review.
- Wording / phrasing / clarity issues — `clarity`.
- Subjective "I would have included X too" without a documented decision behind
  it. If no `dNN-` file, chapter, or captain commit locked X, it isn't an
  omission.
- Missing implementation detail when the artifact is intentionally a summary —
  the rule is "every locked decision", not "every implementation note".
- Architectural objections — `architecture`.

## Worked examples

**SHOULD flag** (Blocker): a condensed plan README lists 12 decisions but the
project's `decisions/` directory holds 13 active `dNN-` files, and the missing
one (`d11-process-feedback.md`) locked the cluster-routing protocol the plan's
validate-loop depends on. Downstream implementers will not see the decision and
will re-derive a different routing.

**SHOULD NOT flag**: a condensed README captures all 13 decisions by name and
rationale but omits one of the eight reviewer focuses' worked examples from
chapter 5. The decision (8 baseline reviewers) is in the README; the chapter
detail is intentionally condensed.

## Severity notes

- **Blocker** — a locked decision is entirely missing from the artifact;
  downstream agents/captains will lose context permanently.
- **Major** — a locked decision is mentioned but its rationale or constraint is
  missing; or a follow-up / open question / TODO is omitted.
- **Minor** — a decision is captured but its provenance link (to the `dNN-` file,
  chapter, or commit) is missing or stale. The decision is recoverable but the
  trail is broken.
- **Nit** — cosmetic completeness only — could have included one more example,
  one more cross-ref. Use sparingly; most "could-be-richer" notes are
  out-of-scope.
- Each finding cites the specific missing item by `[file:section]` and names the
  primary source where the locked context lives. Defer to d11 and the review-doc
  skill body for the general severity ladder.
