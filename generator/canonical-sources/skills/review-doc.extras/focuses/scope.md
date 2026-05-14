# Review focus: scope

**Persona**: reviewer
**Applies to**: documents

Evaluate whether the artifact stays inside its stated charter and whether
out-of-scope work is explicitly named as deferred. A scope finding is
**anchored to the artifact's own charter** — the README's opening paragraph,
problem statement, status table, and (for chapters) the chapter purpose line. If
the artifact does not state a charter, that is itself a Blocker.

## Signals to flag

- **Scope creep** — a task / chapter / phase item that does not serve the
  charter; a side-quest folded into a commitment.
- **Unbundled refactor** — work beyond the contract the charter implies (e.g., a
  bug-fix plan that also rewires an unrelated subsystem).
- **Missing deferral note** — adjacent work mentioned in passing, in a decisions
  tally, or in a chapter that is neither in scope nor named in an "Out of Scope"
  / "Deferred" section.
- **Too narrow** — the charter implies dependencies or follow-ups that aren't
  named (e.g., "this changes the wire format" with no migration discussion).
- **No charter at all** — the artifact never states what problem it solves.

## Verification recipe

1. Read the artifact's README first. Extract its stated purpose: what problem it
   solves, what packages/modules it touches, what it explicitly defers. For a
   chapter, read the parent README's status table to find the chapter's slot,
   then read the chapter's "Purpose" or opening section.
2. Walk the task / chapter / phase list. For each item, ask: "Does this item
   serve the charter?" Items that don't are scope-creep candidates.
3. Walk the public-surface or decisions tally (where present). For each new
   symbol or decision, confirm it traces back to the problem statement.
4. Check for an explicit "Out of Scope" / "Deferred" section. When the artifact
   mentions adjacent work, that work must either be in scope or named in the
   deferred list — not both, not neither.
5. Check the inverse: is the artifact too narrow? If the charter implies
   dependencies or follow-ups that aren't named, flag the gap.

## What NOT to flag

- Necessary detail to make the in-scope work succeed. A migration step inside an
  OAuth refactor is in scope even if it touches a sibling module — the charter
  implies it.
- Architecture decisions inside the scope — `architecture`.
- Decisions documented as "we considered X and explicitly deferred to plan Y" —
  that is the correct shape; do not re-litigate the deferral.
- Subjective preferences about what *should* be in scope when the captain's
  intent is clear. The charter binds you, not your taste.
- Cross-cutting accuracy / clarity / DX concerns. Stay in your lens.

## Worked examples

**SHOULD flag** (Major): a plan titled "Fix `clientSecret` refresh bug in OAuth"
whose task list also rewires the entire token-storage encryption envelope. The
encryption rewire isn't required by the bug fix and isn't named in the charter.
"Ch04 introduces an AAD-bound encryption envelope rewrite that is not implied by
the stated bug fix and is not enumerated in the README's predecessor/scope
rationale. Extract to a follow-up plan or expand the README charter."

**SHOULD flag** (Minor): a plan that adds a `OAuthLifecycle.gcOrphanedTokens()`
method, mentions in passing that "a future Web-UI Disconnect button could call
this", but doesn't list the Web-UI change in an Out-of-Scope section. "Add a row
to the Out of Scope table so the deferral is discoverable."

**SHOULD NOT flag**: a chapter that includes a migration step touching a sibling
module because the charter ("standardize OAuth across providers") implies it.
Necessary detail.

## Severity notes

- **Blocker** — the artifact has expanded so far beyond its stated charter that
  you cannot evaluate it as a coherent unit; or the original problem is no longer
  addressed by the in-scope work; or no charter is stated at all.
- **Major** — significant out-of-scope content: multiple side-quests,
  hypothetical features folded into commitments, refactors beyond the contract,
  or missing acknowledgment of work that was clearly considered and deferred.
- **Minor** — localized scope creep: one helper that belongs in a future plan,
  one nice-to-have folded into a chapter, or a missing follow-up note for a
  single explicit deferral.
- **Nit** — small adjacent topics raised in passing without commitment (no
  action implied, but the reader may wonder).
- Every finding cites the artifact location (`<file>:<heading>` or
  `<file>:<line-range>`) and references the charter clause it violates or the
  deferral it omits. Defer to d11 and the review-doc skill body for the general
  severity ladder.
