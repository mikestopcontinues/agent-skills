# Review focus: depth

**Persona**: researcher
**Applies to**: documents

Evaluate the artifact for **research rigor**: did the author read source code
(not just abstractions), and are unverified claims marked? A depth finding is
any load-bearing claim about external software (library, framework, CLI, vendor
service, reference implementation) that lacks source-code provenance, OR any
speculative claim that should carry an `[UNVERIFIED]` marker but does not.
Source provenance means a `file:line` citation, a `.repos/<name>/path:line`
reference, a commit SHA, or — for external software — a version-pinned docs URL
paired with at least one source reference. A bare marketing URL is not
provenance.

## Signals to flag

For each load-bearing claim about external software:

1. **No source citation** — there is no `.repos/`, `file:line`, or commit-SHA
   citation; or only a docs URL appears with no version pin and no accompanying
   source citation.
2. **Unpinned version** — the version isn't pinned anywhere (chapter Sources
   block, prose, or a referenced `package.json`). An unpinned claim about
   library X is a depth gap.
3. **Skewed source coverage** — the artifact's Sources block lists multiple
   reference repos but findings are skewed to the well-known one while lesser
   repos are skipped.
4. **Unmarked speculation** — hedging phrases ("it seems", "probably", "I
   believe", "likely") not followed by verification and not marked
   `[UNVERIFIED]`.
5. **Unsourced recommendation** — a headline finding or recommendation with no
   source trail back to a primary source. Blocker-class.

## Verification recipe

Read the artifact end-to-end first. Then, for each load-bearing claim:

1. Is there a `.repos/`, `file:line`, or commit-SHA citation? If only a docs URL
   appears, is the version pinned and is there an accompanying source citation?
2. Is the version pinned somewhere (chapter Sources block, prose, or referenced
   `package.json`)?
3. Does the artifact list reference repos in its Sources block? Are findings
   distributed across them, or skewed to the well-known one?
4. Are hedging phrases followed by verification, or explicitly marked
   `[UNVERIFIED]`?
5. Trace each recommendation and headline finding back to a primary source.

Use `Read`/`Grep` on the artifact and adjacent chapters. Use `WebFetch` only to
spot-check whether a cited URL actually supports the claim — not to do the
author's research for them. You are auditing provenance, not rewriting the doc.

## What NOT to flag

- Subjective design preferences, API ergonomics, or architectural fit — `dx`,
  `architecture`, `scope`.
- Missing decisions or unresolved opens — `comprehensiveness`.
- Prose readability, formatting, structure — `clarity`.
- Factual errors where a source IS cited (the citation is wrong, not absent) —
  `accuracy`. Depth cares about provenance *presence*; accuracy cares about
  provenance *correctness*.
- "Could have included one more example" when the existing examples are
  well-sourced. Depth ≠ exhaustiveness.

## Worked examples

**SHOULD flag** (Major): "Codex CLI hooks fire before every tool invocation and
can block via exit code 2." No `.repos/codex-cli/` path, no version pin, no
`[UNVERIFIED]`. Claim is load-bearing for the rest of the chapter. Recommend
citing `.repos/codex-cli/<file>:<line>` or marking `[UNVERIFIED]`.

**SHOULD NOT flag**: "Per `.repos/codex-cli/core/config.schema.json:1842`,
`features.codex_hooks` defaults to `false`." Source-code provenance present,
`file:line` cited. Even if you disagree with the conclusion, that is an
`accuracy` concern at most.

## Severity notes

- **Blocker** — a headline finding or recommendation rests entirely on docs /
  marketing / a sub-agent summary with zero source-code verification.
- **Major** — a load-bearing claim is unverified and unmarked — no `file:line`,
  no `.repos/` reference, no `[UNVERIFIED]`.
- **Minor** — some source was read but corroborating cross-references were missed
  (e.g., one reference repo cited where the Sources block lists three).
- **Nit** — could have read one additional reference repo or one extra file for
  triangulation; existing citations already support the claim.
- Each finding: bold `file:line` location, one-sentence claim, one-or-two-
  sentence remediation pointing at the specific source the author should cite.
  Defer to d11 and the review-doc skill body for the general severity ladder.
