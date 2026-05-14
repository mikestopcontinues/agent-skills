# Review focus: clarity

**Persona**: doc-writer
**Applies to**: documents

Assess whether a **future captain who has no context** can read the artifact
cold and understand what it says, why it exists, and what it decides. Imagine
the captain returns in six months with no surrounding context: no recent
conversation, no memory of why a chapter was written, no familiarity with
project-internal terms coined yesterday. Every finding must answer: "what would
trip up that future reader?" You do not assess whether the content is correct,
complete, well-architected, or aligned with project values — those belong to
other focuses.

## Signals to flag

- **Undefined acronyms / jargon / project-internal terms** used before their
  first-reference definition, with no surrounding gloss.
- **Pronouns or references with ambiguous antecedents** ("it", "this", "that
  approach") where a re-reader cannot tell which noun is meant.
- **Buried lede** — the section's most important point sits at the bottom while
  preamble dominates the top.
- **Overlong paragraphs or sentences** carrying so many clauses that the reader
  loses the thread.
- **Inconsistent terminology** — the same concept under multiple names within
  one artifact, or different concepts under the same name.
- **Missing "what is this and why does it exist" framing** — the artifact starts
  in the middle without orienting the reader.
- **Out-of-order narrative** — effect described before cause, conclusion before
  the question, decision before the context that motivates it.
- **Internal contradictions** — section 3 says one thing, section 5 says the
  opposite, with no reconciliation.

## Verification recipe

- Read the artifact cold, in order, as the context-free future captain would.
- Track every first-use of an acronym or coined term; confirm it is glossed or
  linked at first appearance.
- For each load-bearing "it"/"this"/"that", confirm the antecedent is
  unambiguous within the same sentence or the one before.
- Check the artifact's opening: does it state what this is and why it exists
  before diving into detail?
- Scan section headers against their contents — does a section promising one
  shape deliver another?

## What NOT to flag

- **Decisions or facts you disagree with** — `architecture`, `accuracy`, `scope`.
- **Missing content** — `comprehensiveness`. If the prose is clear about what it
  covers, the omission is not a clarity finding.
- **Length per se** — a long, well-structured chapter is fine if every line
  earns its place. Flag the overload, not the word count.
- **Captain style preferences as nits** unless they are project conventions
  documented in `docs/CLAUDE.md` or root `CLAUDE.md`.
- **Code-quality concerns** — naming, type design, comment density inside fenced
  code blocks. Other reviewers handle code.

## Worked examples

**SHOULD flag** (Major): a chapter introduces "the FTRR loop" in section 3 with
no expansion, no link, no surrounding gloss. A future captain reads "FTRR" and
has no anchor. Undefined load-bearing acronym.

**SHOULD NOT flag**: a 40-line paragraph in a decision note walks through three
trade-offs in sequence, each clearly named with explicit "trade-off A: …",
"trade-off B: …" anchors. The paragraph is long but the structure carries the
reader through. Length alone is not a defect when the structure earns it.

## Severity notes

- **Blocker** — the artifact is unintelligible cold; structural confusion loses
  meaning a future captain would need to recover from source spikes.
- **Major** — significant ambiguity that forces re-reading: pronoun without
  antecedent, undefined load-bearing jargon, mixed-up tense, structural
  misalignment between sections promising one shape and delivering another.
- **Minor** — a single unclear sentence, an awkward phrasing, a paragraph that
  runs longer than it should.
- **Nit** — stylistic improvement only: word choice, sentence length, a smoother
  transition.
- Defer to d11 and the review-doc skill body for the general severity ladder and
  routing (`nit`/`minor` non-blocking, `major`/`blocker` block the next
  iteration).
