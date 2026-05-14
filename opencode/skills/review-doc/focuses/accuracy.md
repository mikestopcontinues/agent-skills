# Review focus: accuracy

**Persona**: qa
**Applies to**: documents

Check every external, factual, version-bound claim in the artifact against a
primary source — and flag claims that lack a citation, contradict their cited
source, or cite a version different from the one this project actually uses.
"External factual claim" means something outside the artifact's own design
intent: library/framework/SDK/CLI/cloud-service API surface, behavior,
defaults, flags, schemas, limits; standards / specs / RFCs; vendor docs
(context windows, pricing, rate limits); cross-references to source files used
as evidence (`file:line`); numeric facts presented as ground truth (release
dates, version numbers, benchmarks).

## Signals to flag

- **Unsourced claim** — a load-bearing factual claim with no citation anywhere
  in the document (check the Sources section and earlier paragraphs first).
- **Contradicted claim** — the cited source disagrees with the claim.
- **Version mismatch** — claim cites version A while the project pins version B
  (check `package.json` / lockfile / `.repos/<lib>/`).
- **Stale/wrong URL** — cited URL 404s, redirects to a different page, or points
  to a generic landing page when version-specific docs exist.
- **Misattributed source** — claim cites source X but the assertion is not
  actually in source X (skim the linked section to confirm).
- **Unverified-but-not-marked** — a claim that is hard to verify and the author
  neglected to mark `[UNVERIFIED]`.

## Verification recipe

1. **Pin the version.** Read `package.json`, `pnpm-lock.yaml`, or `.repos/<lib>/`
   to learn the version actually in use; compare to the version (if any) the
   claim cites.
2. **Read the cited source first.** If the artifact provides a URL or `file:line`,
   open it — the fastest disconfirmation is "the citation does not say what the
   artifact says it says."
3. **Verify against primary sources only.** External libraries: official docs at
   the pinned version via `WebFetch` against the version-specific URL (not
   `/latest/`). Repo source: `Read`/`Grep` the local clone. Specs: the published
   RFC text.
4. **Context7 only when versions match.** If Context7's returned version differs
   from the pinned one, fall through to `WebFetch`. Note the version in your
   finding.
5. **Skim, don't deep-read.** Falsify quickly. If a claim survives a 30-second
   primary-source check, move on.

## What NOT to flag

- **Subjective design opinions** ("this approach feels heavy", "the API is
  ergonomic") — `dx`, `architecture`, or `clarity`.
- **Scope concerns** ("this chapter is doing too much") — `scope`.
- **Coupling / boundary observations** — `architecture`.
- **Phrasing or readability issues** — `clarity`.
- **Missing follow-up tasks or unanswered open questions** — `comprehensiveness`.
- **Claims about the artifact's own internal logic** ("section 3 contradicts
  section 5") — `clarity` handles internal contradictions; you handle
  external-source contradictions only.
- **Claims explicitly marked `[UNVERIFIED]`** — the author has done the right
  thing. You may spot-verify if cheap and report the resolution as a courtesy,
  not a finding.
- **Common knowledge** — if a senior engineer would accept the claim without
  checking, it is not load-bearing factual.
- **Claims you could not verify** — when `WebFetch` fails or the doc page is
  gone, say "I did not verify this"; do not assert a claim is wrong because you
  could not check it.

## Worked examples

**SHOULD flag** (Blocker): the artifact asserts a CLI flag exists that does not,
or asserts a schema field the code does not accept, or cites a deprecated API as
current. Downstream work built on this claim fails.

**SHOULD flag** (Major): a load-bearing claim (an architecture decision, a
capability-matrix cell, a headline finding) is unsourced or version-mismatched.

**SHOULD NOT flag**: an aside or parenthetical that states "the SDK probably
caches this" and is already marked `[UNVERIFIED]`. The author did the right
thing.

## Severity notes

- **Blocker** — claim is wrong in a way that, if acted on downstream, breaks
  things.
- **Major** — claim is unsourced or version-mismatched in a load-bearing
  position; should be fixed or marked `[UNVERIFIED]` before publication.
- **Minor** — claim is unsourced or imprecise in a non-load-bearing position
  (an aside, an example, a parenthetical).
- **Nit** — broken-but-recoverable URLs, version stated as "1.x" when "1.4.6" is
  known, missing inline link to a source named in prose.
- Defer to d11 and the review-doc skill body for the general Blocker/Major/
  Minor/Nit ladder and routing.
