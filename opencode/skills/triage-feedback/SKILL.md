---
name: triage-feedback
description: "Cluster-routing skill — dispatches the reviewer persona to read every rNN-{focus}.md for an artifact, dedupe across reviewers, cluster by topic, severity-normalize, mark ambiguity/blocking, and route each cluster per d11/d08/d14. A thin wrapper around one reviewer dispatch; the triage process lives in this body."
---

Thin wrapper around a single `reviewer`-persona dispatch. The lifecycle skill
hands this skill a review-file list and an artifact path; this skill dispatches
the **`reviewer` persona** once — passing the triage process below as that run's
prompt — and returns the clustered, deduped, routed cluster list as
conversational markdown. There is no `triage` agent: `triage-feedback` is the
wrapper, the `reviewer` persona is the leaf (so the no-fan-out invariant holds —
the leaf does not spawn anything).

## Inputs

- `reviewFilePaths` — list of `rNN-{focus}.md` paths to triage (or the artifact
  directory, from which the leaf `Glob`s `r*.md`)
- `artifactPath` — the document the reviews are about (used only to confirm a
  literal contradiction one reviewer flagged; never to second-guess a finding)
- `iteration` — integer, threaded into the cluster-list header

## What this skill does

1. `Dispatch` one subagent that adopts the `reviewer` persona (it ships with the
   toolkit — dispatch it by name) and runs the **triage process** (below)
   against `reviewFilePaths` / `artifactPath`.
2. Receive the cluster list the leaf produces (the **cluster-list output
   template** below) and return it to the calling lifecycle skill as
   conversational markdown. **Do not persist it** — it is consumed inline.

`Dispatch` is carried solely for this single `reviewer` dispatch. The leaf does
not dispatch anything; cross-reviewer synthesis ends at the leaf.

---

## Triage process (the leaf's prompt)

You are running the triage pass through the `reviewer` persona's lens: a
scope-bound evaluation lens. You organize signal; you do not generate it. You do
not author findings of your own. You do not re-judge a reviewer's severity from
opinion — you correct a severity *only* when the finding cites a fact any reader
can verify is wrong from the artifact itself. Execute these steps in order; do
not skip ahead.

1. **Collect.** `Read` each `<reviewFilePath>` in full (or `Glob` the artifact
   directory for `r*.md` if given a directory). Per finding bullet, note: source
   file, severity (from the H3 it sits under — `### Blockers` / `### Majors` /
   `### Minors` / `### Nits`), focus (from the filename — `r02-architecture.md` →
   `architecture`), the artifact location it targets, verbatim text.
2. **Severity (per finding).** Read it from the H3 the bullet sits under. Do not
   re-judge — except: if the finding's *stated rationale* cites a fact that any
   reader can confirm is wrong from the artifact itself, you may correct the
   severity (rare; record that you did and why).
3. **Focus (per finding).** The focus token in the filename. Used in step 7 for
   decision-shape detection (per `d14`).
4. **Dedupe across reviewers.** Two findings are duplicates when they name the
   **same defect at the same location**, even if worded differently. Merge into
   one cluster member; record every reviewer's focus under "Surfaced by". On
   severity disagreement (one Major, one Minor), the merged member takes the
   **higher** severity. Never average.
5. **Cluster by topic.** Group findings (deduped or not) that concern the same
   decision, file region, contract, or design choice. Topic labels are short:
   "auth-flow API contract", "section 3 phrasing", "scope of harness X". A
   finding belongs to exactly one cluster.
6. **Severity-normalize per cluster.** Cluster severity = **max** of its members
   (`blocker > major > minor > nit`).
7. **Mark + split + route.** For each cluster:
   - **Ambiguity** (per `d11`). Unambiguous when every member cites a verifiable
     wrong fact, a direct contradiction with another section of the same
     artifact, a typo, a broken link, a formatting nit, or a mechanical style
     violation. Anything else ("this design might be better", "this is unclear",
     "consider X instead") is ambiguous.
   - **Blocking.** Blocking when the next iteration's reviewers will rediscover
     the issue because it concerns content the next loop re-reads. When unsure,
     mark blocking — being wrong here is recoverable; the next iteration re-raises
     it.
   - **Decision-shape detection** (per `d14`, v0.1 — keyed on focus name). Every
     finding from `r*-scope.md` is decision-shaped. Every `major`/`blocker`
     finding from `r*-architecture.md` is decision-shaped. Contextual focuses
     outside the baseline catalog default non-decision-shaped until classified.
   - **Cluster split.** When a topic-cluster mixes decision-shaped and
     non-decision-shaped members, split into two clusters with reciprocal "see
     also C{N}" annotations. The decision-shaped half routes to `lock-decisions`;
     the other half routes per the table.
   - **Security-focus severity filter** (per `d08`, applies only to the
     `security` focus): drop `nit`/`minor` security findings entirely (they do
     not appear in the output); `major`/`blocker` + unambiguous → `auto-act`;
     `major`/`blocker` + ambiguous → route to the captain (blocking,
     narrowed-options-brief). Apply this before the routing table for any
     `security`-focus cluster.
   - **Route** (after split, after the security filter):

     | Severity | Ambiguity   | Decision-shaped? | Route             |
     |----------|-------------|------------------|-------------------|
     | blocker  | any         | no               | `act`             |
     | major    | unambiguous | no               | `act`             |
     | major    | ambiguous   | no               | `process`         |
     | minor    | unambiguous | no               | `auto-act`        |
     | minor    | ambiguous   | no               | `process`         |
     | nit      | any         | no               | `defer`           |
     | any      | any         | yes              | `lock-decisions`  |

8. **Output.** Emit the cluster list using the template below. **Do not persist**
   — it is returned inline to the calling skill.

### Hard guardrails (the leaf honors these)

- **Never invent findings.** If no reviewer said it, it is not in the output.
- **Never re-judge severity from opinion.** Take the higher severity on
  disagreement; correct a severity only on a reader-verifiable factual error in
  the finding's own rationale.
- **Never drop a finding silently** — except the `d08` security filter, which is
  an explicit, named drop. Nits route to `defer`, not to /dev/null.
- **Never read the artifact to second-guess a finding.** The reviewers already
  read it. The only artifact reference allowed is to confirm a literal
  contradiction one reviewer flagged when needed for dedupe.
- **Never spawn subagents.** This leaf is the bottom of the dispatch tree.

---

## Cluster-list output template

(Formerly held in the `triage` agent; now lives here. The leaf renders this; the
wrapper returns it verbatim.)

```markdown
# Triage summary — iter {iteration}
**Artifact**: {artifactPath}
**Reviewer set**: {focus1}, {focus2}, ...
**Total findings**: {N} ({B} blocker / {M} major / {m} minor / {n} nit)

## Clusters

### C1 — {topic}
**Severity**: {blocker|major|minor|nit}
**Ambiguity**: {clear|ambiguous}
**Blocking**: {yes|no}
**Surfaced by**: {focus-a}, {focus-b}
**Members**:
- [r01-accuracy.md → {artifact location}] verbatim or paraphrased finding text
- [r03-dx.md → {artifact location}] verbatim or paraphrased finding text
**Route**: {act|auto-act|process|lock-decisions|defer}
**See also**: C{N}   (only when split)

### C2 — ...

## Routing summary
- `act`: {N}
- `auto-act`: {N}
- `process`: {N}
- `lock-decisions`: {N}
- `defer`: {N}
- Blocking clusters: {N} (must resolve before next iteration)
- Dropped (d08 security nit/minor filter): {N}
```

Per-cluster fields: `ClusterId` (`C{N}`, stable for this run only), `Topic`,
`Severity` (max across members), `Ambiguity` (`clear`|`ambiguous`), `Blocking`
(`yes`|`no`), `Surfaced by` (which focuses), `Members[]` (each: source
`rNN-{focus}.md` + the artifact location it targets + the normalized claim),
`Route` (`act`|`auto-act`|`process`|`lock-decisions`|`defer` per `d11`),
`See also` (only on split clusters).

## Worked example

`r01-accuracy.md` Major on the auth-flow return shape; `r03-dx.md` Minor on the
auth-flow parameter order; `r04-integration.md` Major on the auth-flow error
type. The three findings collapse to one cluster: topic "auth-flow contract",
severity Major (max), ambiguous (design judgments), blocking (auth-flow re-reads
next iteration), surfaced by `accuracy` + `dx` + `integration`, route `process`.
