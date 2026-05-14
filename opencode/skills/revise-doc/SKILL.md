---
name: revise-doc
description: "Apply act-pass changes to a document from rNN- review files (or an inline finding list). Walks each finding, edits the artifact, surfaces genuine contradictions, and reports applied vs deferred. Singleton; no Dispatch."
---

Act-pass driver during validate-loop iteration. Given an artifact and one or
more `rNN-{focus}.md` review files, walk the findings and apply the edits.
Triage routes `act` / `auto-act` clusters here; the lifecycle skill passes
the cluster's member findings (via the source `rNN-` files or an inline list).

## Inputs

- **`artifactPath`** — the document to revise (the same file the reviewers read)
- **`reviewFilePaths`** — one or more `rNN-{focus}.md` paths whose findings drive the edits
- **OR `inlineFindings`** — a finding list passed directly (used when the lifecycle skill has already extracted clusters from triage output)
- **`includeNits`** — optional boolean; default `false`. Nits are skipped unless the captain explicitly opts in (per d11 — nits route to `defer`, not `act`)

Either `reviewFilePaths` or `inlineFindings` must be supplied.

## Process

1. **Collect findings.** Read each `reviewFilePath` in full. The canonical
   reviewer template uses an H2 `## Findings` section containing four H3
   subsections (`### Blockers`, `### Majors`, `### Minors`, `### Nits`) that
   group bullets by severity. Per bullet record: source file, severity (from
   the H3 header), location in the artifact, verbatim claim, and any suggested
   fix the reviewer wrote. If `inlineFindings` was supplied, use that list
   directly.
2. **Filter by severity.** Keep `Blockers` and `Majors` always. Keep `Minors`
   when they carry a concrete suggestion (the auto-act subset). Drop `Nits`
   unless `includeNits=true`. Record dropped findings — they appear in the
   final report as `deferred`.
3. **Read the artifact** once. Do not re-read between edits unless an edit
   invalidates earlier line references (then re-read and continue).
4. **Group by location.** Findings that touch the same file region cluster
   together so a single edit can satisfy multiple reviewers.
5. **Per group, classify the edit:**
   - **Concrete and unambiguous** — the finding names the wrong text and the
     right text. Apply via `Edit`.
   - **Concrete with two reviewers agreeing** — same defect, same fix.
     Apply via `Edit`; record both reviewers under "Surfaced by" in the report.
   - **Concrete with two reviewers contradicting** — same defect, different
     fixes. **Do not pick.** Mark `contradiction` and surface to the captain
     (see "Contradictions" below).
   - **Concrete but out of scope** — finding references a section the
     `artifactPath` does not contain. Mark `out-of-scope` and skip.
   - **Vague** — finding names a problem with no concrete fix and routed to
     `act` anyway (rare; usually triage routes these to `process`). Apply
     the most defensible edit if obvious; otherwise mark `needs-process`
     and surface to the captain.
6. **Apply edits one at a time.** After each edit, advance to the next group.
   Do not batch unrelated edits into a single `Edit` call.
7. **Track results.** For every finding: `applied` | `deferred` (nit, no opt-
   in) | `contradiction` (surfaced) | `out-of-scope` | `needs-process`.
8. **Report.** Print a summary to conversation (schema below). Do not write
   a file. Do not commit — the captain commits.

## Contradictions

When two findings on the same location prescribe incompatible fixes, refuse
to silently pick a winner. Surface both to the captain in the report:

```markdown
### Contradiction at {artifact}:{location}
- [{rNN-focus.md}] suggests: {fix A}
- [{rNN-focus.md}] suggests: {fix B}
Action: deferred pending captain decision.
```

Continue with remaining non-contradicting findings; do not abort the run.
A contradiction does not propagate — neighboring groups still apply normally.

## Output schema

Print to conversation. No file written.

```markdown
# revise-doc summary — {artifact basename}

## Applied
- [{rNN-focus.md}] {severity} at {location}: {one-line summary of edit}
  - Surfaced by: {reviewer set}

## Deferred
- [{rNN-focus.md}] {severity} at {location}: {claim}
  - Reason: {nit-no-opt-in | out-of-scope | needs-process}

## Contradictions surfaced
- {location}: {short label}
  - {rNN-focus.md} → {fix A}
  - {rNN-focus.md} → {fix B}

## Counts
- Applied: N
- Deferred: N
- Contradictions: N
```

When every finding is `Nits` and `includeNits=false`, the run is a clean
no-op: print the summary with empty `Applied` / `Contradictions` sections
and a populated `Deferred` section listing each nit with reason
`nit-no-opt-in`. Exit cleanly.

## Hard guardrails

- **Never silently pick** between two contradicting findings. Surface both.
- **Never edit sections the findings did not reference.** Scope creep is a
  failure mode — if the reviewer cited section 3, do not also rewrite
  section 5 because it "looks similar".
- **Never apply nits** without `includeNits=true`. Per d11, nits route to
  `defer`. Captain opts in explicitly.
- **Never invent a finding.** If no review bullet covers a problem you
  notice while reading the artifact, leave it alone — that is the next
  iteration's reviewers' job.
- **Never commit.** The captain commits and merges.
- **Never spawn subagents.** Singleton.

## Cross-cutting

- New docs use `${CLAUDE_PLUGIN_ROOT}/scripts/yolo new` (the pre-write-doc hook enforces
  this); revise-doc only edits existing docs, so this rarely applies.
- Cross-references between docs use relative paths without anchors (per d06).
