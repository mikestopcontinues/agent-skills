# Eval brief: designer agent

**Task**: T1A1.13

## Contract

Cognitive-profile subagent at `__SKILL_HOME__/agents/designer.md`. Dispatched by
`write-doc` and `write-convention` for ergonomic shaping of user-facing
surfaces, and available for ad-hoc dispatch when shaping APIs, CLIs, or
visual UI. Frontmatter pins `model: opus` and `tools: Read, Grep, Glob,
Write`. Profile: outside-in user perspective, progressive disclosure, reduce
cognitive load — broadened from visual-UI-only to "user-facing surfaces of
any kind" (prose, conventions, APIs, UI).

A successful dispatch returns critique that (a) names the consumer
explicitly, (b) cites concrete friction points with location, (c) proposes
fixes that reduce density or improve hierarchy without losing substance,
and (d) flags inconsistencies against sibling surfaces.

## Eval scenarios

Three representative dispatches spanning the use cases. Each is run by
giving the designer profile a fixture surface plus the prompt "Critique
this for first-encounter clarity and progressive disclosure."

1. **doc-ergonomics-critique** — A plan README with a 40-line preamble
   before the status table, mixed required/optional context interleaved,
   and an inverted lede (conclusion at bottom). Expected: designer
   identifies the inverted lede, recommends moving the status table up,
   flags the mixed required/optional density, proposes splitting context
   into a "what you need to know now" vs "deeper background" disclosure.
2. **convention-shape-critique** — A draft convention file with three rules
   bundled in one section, examples below the rules block rather than
   beside each rule, and one rule whose phrasing diverges from sibling
   convention files. Expected: designer flags the bundling (each rule is
   its own scannable unit), recommends inline examples, calls out the
   divergent phrasing as a consistency bug, references the sibling pattern.
3. **visual-ui-critique** — A settings screen mockup (described in markdown)
   with 12 fields ungrouped, primary action at bottom-right next to a
   destructive action, and no defaults shown. Expected: designer groups
   the fields by purpose, separates primary from destructive (or moves
   destructive behind a disclosure), recommends showing defaults inline
   to reduce required cognitive load.

## Pass criteria

For each scenario, the response must hit at least 3 of 4 contract
properties (consumer named, friction located, fix proposed, inconsistency
flagged where applicable). Across all three, the response must demonstrate
the broadened scope — i.e., the doc-ergonomics and convention-shape
critiques cannot be answered with visual-UI vocabulary ("screen", "button",
"layout") as the primary frame.

## Iteration log

- **Iter 1** (2026-05-09): Authored brief and refreshed agent prompt to
  broaden framing from visual-UI-centric to user-facing-surfaces-of-any-kind.
  Scenarios drafted but not yet dispatched against the live profile —
  fixture surfaces still need to be authored as standalone files for
  reproducible runs.
