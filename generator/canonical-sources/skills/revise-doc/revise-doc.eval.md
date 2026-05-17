# Eval brief: revise-doc skill

**Task**: T1B1.02

## Contract

Singleton act-pass driver. Inputs: an artifact path plus one or more `rNN-`
review file paths (or an inline finding list). Walks each finding, applies
the act-pass edits to the artifact, skips nits unless the captain opts in,
refuses to silently pick between genuinely contradicting findings, and
prints an applied / deferred / contradictions report to conversation. Tools:
`Read, Edit, Write, Glob, Grep` — no Bash, no Dispatch. Does not commit.

## Eval scenarios

Static eval. Synthesize the rNN- inputs and artifact inline; verify by
inspecting the post-run artifact diff and the printed summary.

### Scenario 1 — single rNN- with one major, concrete suggestion

**Input.** Artifact `docs/spikes/sNNN/03-channel.md`, section 4 contains the
sentence "Channels expose a `flush()` method that returns void." Single
review file:

- `r02-architecture.md` `### Majors`: "Section 4 says `flush()` returns
  void; the spike's section 7 contract typed it `Promise<FlushResult>`.
  Replace 'returns void' with 'returns Promise<FlushResult>'."

**Expected.** One `Edit` call replacing "returns void" with "returns
`Promise<FlushResult>`" in section 4. Summary shows 1 Applied, 0 Deferred,
0 Contradictions. No edits to other sections. Pass when the diff is exactly
the suggested replacement and the section 7 contract is unmodified
(reviewer did not name section 7).

### Scenario 2 — multiple rNN- files, overlapping findings

**Input.** Artifact `docs/plans/pNNN/05-auth.md` describes an OAuth callback
returning `{ token: string }`. Two review files cover the same defect:

- `r01-accuracy.md` `### Majors`: "Callback should return `{ accessToken,
  refreshToken }` per the OAuth profile in d07."
- `r03-architecture.md` `### Majors`: "Return shape `{ token }` is wrong —
  d07 mandates `{ accessToken, refreshToken }`."

A third review prescribes an **incompatible** alternative on the same line:

- `r04-dx.md` `### Majors`: "Callback should return `{ token, expiresAt }`
  to keep DX flat — refresh tokens belong elsewhere."

**Expected.** The two converging findings (`accuracy` + `architecture`) and
the contradicting `dx` finding all touch the same location. Skill detects
the contradiction across the three reviewers and **does not edit** the
return shape. Summary lists 0 Applied for that location, 1 Contradiction
citing all three reviewers and both proposed fixes. The artifact is
unchanged at the contested location. Pass when the artifact is not silently
edited toward either fix and both options appear under "Contradictions
surfaced". Adjacent unrelated findings (if any) still apply normally.

A second variant of this scenario tests the **non-contradicting overlap**
case: drop `r04-dx.md` and keep only `r01-accuracy.md` + `r03-architecture.md`.
Expected: one `Edit` lands the `{ accessToken, refreshToken }` shape, summary
lists 1 Applied with both reviewers under "Surfaced by", and dedupe prevents
the edit from being applied twice.

### Scenario 3 — rNN- with only nits (no act items)

**Input.** Artifact `docs/notes/some-note.md`. Single review file:

- `r05-clarity.md` `### Nits`:
  - "Section 2 trailing whitespace on line 14."
  - "Code fence in section 3 missing language tag."

No `### Blockers`, `### Majors`, or `### Minors` sections. `includeNits` is
not supplied (defaults to `false`).

**Expected.** No edits. Summary prints with empty `Applied` and
`Contradictions` sections; `Deferred` lists both nits with reason
`nit-no-opt-in`. Counts: Applied 0, Deferred 2, Contradictions 0. Clean
exit. Pass when the artifact is byte-identical pre/post run and the summary
is printed (not silently elided).

## Pass criteria

1. **Concrete major lands** — Scenario 1's edit applies exactly as suggested;
   no scope creep into adjacent sections.
2. **Overlap deduped** — Scenario 2 variant 2 produces one edit citing both
   reviewers, not two edits.
3. **Contradiction surfaced, not picked** — Scenario 2 main variant leaves
   the artifact unchanged at the contested location and lists all three
   reviewers + both fixes under "Contradictions surfaced". Silently picking
   either fix = fail.
4. **Nits skipped by default** — Scenario 3 produces zero edits and a
   non-empty `Deferred` section. Applying any nit without `includeNits=true`
   = fail.
5. **No commit** — none of the scenarios result in a git commit. The captain
   commits.

## Static eval

Read-only reasoning fixtures. No live dispatch yet; verify the skill body
against the synthesized inputs and the expected diffs / summaries.

## Iteration log

- **Iter 1** (2026-05-09): Initial draft. Three scenarios target the failure
  modes from p01 Ch4 lines 72–75: silent winner-picking on contradiction,
  applying out-of-scope nits, and scope creep beyond cited sections.
  Scenario 2 carries two variants (contradiction + non-contradicting
  overlap) so dedupe and refusal are both exercised against the same fixture.
