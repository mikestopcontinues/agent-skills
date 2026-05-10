# Eval brief: write-doc skill

**Task**: T1B1.01

## Contract

Workhorse singleton skill — covers new-doc authoring AND edits to existing
docs under `docs/`. Inputs: `artifactPath` (existing or new), `directive`
(write content / edit a section / refactor / add frontmatter).
Tools: `Read, Edit, Write, Glob, Grep, WebFetch, WebSearch` — no `Bash`,
no `Dispatch` (singleton). Hard rule: never bypass the scaffold script for
new prefixed top-level docs (`sNNN-`, `pNNN-`, top-level notes); delegate
to `yolo` (or `yolo new` once it lands). Output
must follow doc conventions (`docs/CLAUDE.md`, frontmatter schema for the
type, file-level links per d06, soft cap ~500 lines).

## Eval inputs

Four inputs cover the full surface: structured new-content authoring,
targeted edit, frontmatter-only touch-up, and content-preserving
restructure. All inputs are static — describe expected behavior; no
dispatch.

1. **Author a new chapter from a spike outline** — `directive=write`,
   `artifactPath=docs/spikes/sNNN-existing/05-new-chapter.md` where the
   spike directory and earlier chapters already exist. Captain provides
   an outline (purpose, sources, three main sections, handoffs).
   **Expected**: opens sibling chapters to match tone/shape; writes the
   new file directly with `Write` (the directory exists; no scaffold
   needed for sub-chapters); produces a multi-section structured doc
   with `## Purpose`, `## Sources`, three main sections, `## Handoffs`;
   cross-refs to sibling chapters use file-level links
   (`[Ch3](03-foundation.md)`, never `#anchor`); stays within the soft
   cap; returns the file path. The skill MUST NOT invoke `doc-create.sh`
   here — sub-chapters do not go through the scaffold.

2. **Edit a single section of an existing chapter** —
   `directive=edit`, `artifactPath=docs/plans/pNNN-existing/04-foo.md`,
   directive identifies one `## Subsection` to update.
   **Expected**: reads the full file first; uses `Edit` (not `Write`)
   scoped to the named section; preserves all other content verbatim;
   does not touch frontmatter unless directive says so; does not
   reorganize neighboring sections; does not introduce `#anchor`
   references in any cross-ref it touches. Returns the file path and a
   one-line diff summary. If the section's content changed enough that
   sibling cross-refs may have shifted, recommends running
   `doc-check-links.sh`.

3. **Add a frontmatter field to a doc that lacks it** —
   `directive=add-frontmatter`,
   `artifactPath=docs/x000-yolo-project/decisions/dNN-existing.md`,
   the existing decision lacks the `blocks: []` field that the type's
   schema declares.
   **Expected**: reads the file; uses `Edit` to insert the missing
   field at the canonical position in the frontmatter block (per the
   decision schema in p01 Ch3); preserves all other fields and field
   order; does not invent new fields; does not modify the body.
   Returns the file path. If the doc has no frontmatter block at all
   when the type requires one, adds the full block.

4. **Reorganize a long chapter into sub-sections (preserve content)** —
   `directive=refactor`, `artifactPath=docs/spikes/sNNN-existing/03-long.md`
   (currently flat sections, ~600 lines, over soft cap), captain
   directive is to introduce a two-level structure under existing
   `##` headings without dropping any prose.
   **Expected**: reads the full file; produces an `Edit` (or sequence
   of `Edit`s) that adds `###` sub-headings around existing prose
   blocks; every sentence of the original prose appears in the
   restructured version; no content is paraphrased away; cross-refs to
   the file from siblings remain valid (no `#anchor` fragments existed
   to break under d06); recommends running `doc-check-links.sh` after.
   If the restructure would require splitting into multiple files
   (file remains over soft cap even after sub-sectioning), the skill
   surfaces that as a follow-up rather than auto-splitting.

## Pass criteria

- Each input lands the expected file/edit at the expected path. No
  out-of-scope file is touched.
- New prefixed top-level docs (sNNN-, pNNN-, top-level notes) are
  always created via `doc-create.sh`; the skill never `Write`s those
  paths directly. Inputs above test the negative case (sub-chapters,
  existing files) — the positive case is exercised by the lifecycle
  skills' eval briefs.
- No cross-reference uses `#anchor` fragments. Existing anchors in
  unrelated sections of edited files are not introduced; if any
  pre-existing `#anchor` appears in touched lines, the skill flags it.
- Frontmatter changes preserve existing fields; no field invented
  outside the type's schema; field order matches the type template.
- For input 4, prose preservation is verifiable by line-diffing the
  original against the restructured version with `###` headings
  removed — every original line still appears.
- The `pre-write-doc` hook does not block any eval input (input 1
  writes inside an existing scaffolded directory; inputs 2–4 edit
  existing files).

## Static eval rationale

Static brief — describes expected behavior without live invocation.
The skill produces it because: the body's delegation rule explicitly
gates `Write` on existing-directory + non-prefixed-top-level
preconditions, so input 1 (sub-chapter) flows to direct `Write` while
input 2–4 (existing files) flow to `Edit`; the link-discipline section
hard-codes d06 file-level-only references, blocking the most common
failure mode (anchor fragments); the frontmatter guidance pins
"preserve existing fields, add only schema-declared fields" so input 3
cannot drift; the restructure guidance ("preserve content verbatim
where possible") pins input 4. Live eval lands when `/create-plan`
first dispatches `write-doc` for chapter authoring in Phase 2.

## Iteration log

- **Iter 1** (2026-05-09): Initial author from existing
  `edit-doc/SKILL.md` body, broadened to cover new-doc cases per
  p01 Ch4. `edit-doc` deletion deferred to captain's merge commit.
