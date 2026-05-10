# Review focus: accuracy

**Persona**: qa
**Applies to**: code diff

Check whether the diff actually does what the plan (or task) specifies, whether
the tests cover the change, and whether any external/factual claims in the code
or its comments hold up against primary sources at the version this project
pins. The lens is "would a downstream consumer be surprised by what this code
actually does versus what it claims to do."

## Signals to flag

- **Spec mismatch** — the diff diverges from what the plan phase / task says it
  should implement (a field renamed, a code path skipped, a behavior subtly
  different) with no note explaining why.
- **Missing test coverage** — new behavior, new branch, new error path, or
  changed contract with no test exercising it; a test that asserts the old
  behavior and was not updated; a test that passes vacuously (no meaningful
  assertion).
- **Comment / doc-string lies** — a comment or JSDoc that describes behavior the
  code does not have, cites a flag/option that doesn't exist, or references a
  version different from the pinned one.
- **Wrong external API usage** — calls a library/SDK/CLI with an option, default,
  or signature that doesn't match the pinned version (check `package.json` /
  lockfile / `.repos/<lib>/`).
- **Stale citation in code** — a `// see <URL>` or `// per RFC NNNN §X` that
  404s, redirects, or doesn't say what the comment claims.
- **Unverified-but-not-marked** — a hard-to-verify assumption baked into the code
  with no `// UNVERIFIED` / TODO marker.

## Verification recipe

1. **Read the spec.** Open the plan phase / task that this diff implements;
   enumerate what it promises. Walk the diff against that list.
2. **Walk the tests.** For each new or changed behavior, find the test that
   exercises it. Run `pnpm test` (or the package's test command) if cheap;
   read the test file otherwise. A green suite with no new assertions for new
   behavior is a finding.
3. **Pin the version.** Read `package.json` / `pnpm-lock.yaml` / `.repos/<lib>/`
   before judging any external API call.
4. **Open cited sources.** Any URL or `file:line` in a comment — open it; the
   fastest disconfirmation is "the citation doesn't say that."
5. **Skim, don't deep-read.** Falsify quickly. If a code path survives a
   30-second check against spec + tests + pinned docs, move on.

## What NOT to flag

- **Boundary / coupling concerns** — `architecture`.
- **API ergonomics, naming, error-message quality on the new surface** — `dx`.
- **Style / formatting** — the quality gate (`pnpm run check`) owns that.
- **Performance speculation** — out of scope unless the spec set a perf bar.
- **Pre-existing bugs the diff doesn't touch** — note them as context at most;
  they aren't this review's findings.
- **Test-framework choice or test placement** — `architecture` / conventions.
- **Assumptions the code explicitly marks `// UNVERIFIED` / TODO** — the author
  did the right thing.

## Worked examples

**SHOULD flag** (Blocker): the plan says "DELETE /auth returns
`ForgetIdentityOutcome`"; the diff returns a bare `204` with no body. Downstream
callers built against the spec break.

**SHOULD flag** (Major): a new `gcOrphanedTokens()` method ships with no test;
the suite is green only because nothing calls it. The behavior is unverified.

**SHOULD NOT flag**: the diff uses `Array.prototype.flatMap`, which a comment
notes "Node 18+ only" — the project pins Node 20. Accurate and marked. No
finding.

## Severity notes

- **Blocker** — the diff does not implement what the spec requires, or implements
  it wrongly in a way downstream work depends on; or ships an untested critical
  path.
- **Major** — a real spec divergence or coverage gap on a load-bearing path; or a
  comment that materially misdescribes behavior.
- **Minor** — a coverage gap on a non-critical branch; an imprecise comment; a
  stale-but-recoverable citation.
- **Nit** — a slightly-off doc-string, a missing `// UNVERIFIED` on a low-stakes
  assumption.
- Defer to d11 and the review-code skill body for the general Blocker/Major/
  Minor/Nit ladder and routing.
