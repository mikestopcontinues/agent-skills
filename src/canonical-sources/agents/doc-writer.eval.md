# Eval brief: doc-writer agent

**Task**: T1A1.11

## Contract

Cognitive-profile subagent for prose-heavy doc generation and shaping.
Dispatched by lifecycle skills (`create-spike`, `create-plan`, `create-note`,
`edit-doc`, `revise-doc`) and the future `write-doc` body. Reader-first:
prioritizes structural coherence, naming consistency, link integrity, and
information at the right level (summaries in indexes, detail in leaves).
Read/Grep/Glob/Write only — no shell, no edits to source code. Defers
commit-time link validation to the `pre-bash-doc` hook but is expected to
self-verify mid-work and route new docs through `doc-create.sh` (the
`pre-write-doc` hook will block raw scaffolding).

## Eval scenarios

1. **Restructure a draft chapter** — Given a 600-line spike chapter with
   buried sections and inconsistent heading depth, return a restructured
   version with a clear skeleton, surfaced lede, and explicit cross-refs to
   sibling chapters. Expected: outline change explained up front; no content
   loss; section numbering matches the spike's existing convention; any
   broken refs to renamed sections updated.

2. **Author a new note** — Given the prompt "capture the open decision about
   X for the Y plan", return a note authored via `doc-create.sh note <slug>`
   (acknowledged in the response, not assumed) with a title that names the
   decision, a "Status: open" line, a "Context" section, and a candidate-
   options list. Expected: refuses to hand-write the file directly; flags
   that the scaffold script is the entry point; body fits the living-note
   shape from `docs/CLAUDE.md`.

3. **Reconcile naming drift across a plan** — Given a plan README that uses
   three different terms for the same concept across chapters, return a
   single canonical term with a one-line rationale and the per-file diff
   plan. Expected: identifies all occurrence sites via Grep before
   proposing; chooses the term that reads cleanest in body prose, not the
   one that's most common; flags any external doc that would also need to
   update.

## Pass criteria

- Output preserves the spike/plan/note format from `docs/CLAUDE.md`
  (prefixes, numbering, review-file conventions) without prompting.
- Cross-refs use relative paths and resolve.
- Honors the doc-creation hook contract: never proposes a raw `Write` to a
  new `spikes/`/`plans/`/`notes/` path; routes through `doc-create.sh`.
- Naming/structure proposals carry a one-line "why this reads better"
  justification — not just a swap.
- No commits, no Bash, no edits outside `docs/`.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass after prompt tightening. Drift
  removed: replaced the unconditional `doc-check-links.sh` instruction with
  a self-verify-mid-work clause that defers commit-time enforcement to
  `pre-bash-doc`; added explicit `doc-create.sh` scaffolding rule to align
  with `pre-write-doc`; sharpened the navigability priority from a vague
  "three steps" heuristic to the index/leaf/cross-ref split; added "prose-
  heavy generation" to focus areas to lock in spike intent. No live
  dispatch yet — scenarios captured for first real use.
