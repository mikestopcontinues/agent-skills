
Workhorse for all doc work — covers both new-doc authoring and edits to
existing docs. Used by lifecycle skills (`/create-spike`, `/create-plan`,
`/archive-project`) for chapter authoring and condensed READMEs, and by the
captain for ad-hoc work.

## When to Use

- Authoring a new chapter inside an existing spike or plan directory
- Editing a section of an existing doc (typo, refresh, restructure)
- Adding or correcting frontmatter on a doc that needs it
- Reorganizing a long chapter into sub-sections (preserve content)
- Any direct write or edit under `docs/` that isn't part of a review/revise cycle

## When NOT to Use

- **Reviewing** a doc → `/review-doc`
- **Applying review findings** to a doc → `/revise-doc`
- **Capturing a locked decision** → `/create-decision`
- **Authoring a convention file** → `/write-convention`
- **Starting a research lifecycle** → `/create-spike`
- **Starting a plan/spec lifecycle** → `/create-plan`

## Delegation Rule (hard)

**Never bypass the scaffold for new prefixed top-level docs.** Files of these
shapes MUST be created via the `yolo new` CLI:

| New file shape | Scaffold |
|----------------|----------|
| `docs/spikes/sNNN-<name>/README.md` | `yolo new spike <project> <name>` |
| `docs/plans/pNNN-<name>/README.md` | `yolo new plan <project> <name>` |
| `docs/notes/<name>.md` (top-level note) | `yolo new note --global <name>` |

The CLI assigns the next free number, places the file at the canonical
path, seeds frontmatter, and emits a JSON envelope whose `filePath` field
names the created file. Picking numbers manually or writing the file
directly via `Write` is forbidden — the `pre-write-doc` hook will block
it. Project-scope notes use `yolo new note <project-slug> <name>` instead
of `--global`.

**Direct write/edit is correct for**:

- Sub-files inside an existing prefixed directory
  (`docs/plans/p018-.../04-foo.md`, `docs/spikes/sNNN-.../README.md` updates)
- Existing notes (`docs/notes/<existing>.md`)
- Convention files (but prefer `/write-convention` so the AGENTS.md index
  stays in sync)
- Files inside a project subtree (`docs/<project>/...`) where the
  containing directory already exists

If the scaffold would fit but doesn't (new doc type, new project subtree),
escalate to the captain rather than improvising a path.

## Process

### 1. Read context

Read the target file if it exists. Read the surrounding directory's `README.md`
or parent index so the new content fits the local conventions. For a new
chapter, read the sibling chapters to match tone, depth, and section shape.

### 2. Scaffold or open

- New prefixed top-level doc → run the scaffold script (above)
- Otherwise → open the file with `Read` first; create with `Write` only when
  the directory already exists and the file does not

### 3. Write or edit

Match the project's doc conventions (`docs/CLAUDE.md`):

- **Soft cap ~500 lines per file**; split into chapters past that
- **One topic per file**
- **Frontmatter** (when the doc type uses it) — preserve existing fields,
  add only fields the type's schema declares; never invent fields
- **Diagrams** in Mermaid; for syntax help invoke `/mermaid-diagrams`
- **Types in docs** as TypeScript `type`/`interface`, not Valibot, unless
  the section is specifically about Valibot

Restructures preserve content verbatim where possible. Reorganization is not
license to rewrite.

### 4. Link discipline (per d06)

Cross-references are **file-level only** — no `#anchor` fragments.

- Right: `[Ch3](03-foundation-validate-loop.md)`
- Wrong: `[Ch3 §2](03-foundation-validate-loop.md#approach)`

If a target section is hard to find without an anchor, the target file is
too long and should be split — that's the d06 contract.

Use relative paths between sibling files. For cross-directory references,
use repo-relative paths from `docs/`.

### 5. Validate

- If cross-references changed, run `doc-check-links.sh`
- Re-read the edited file end-to-end before handing back

### 6. Brief the captain

State what was created or changed, the path, and any deferred follow-ups
(e.g., index entries that may need updating in a sibling skill's scope).

## Guidelines

- **Use `git mv`** for renames and relocations (the `pre-bash-doc` hook
  enforces this) — never `Write` a new path then `rm` the old
- **No project-name churn in identifiers** — see root `CLAUDE.md`'s
  no-project-name-in-code rule; it applies here too
- **If the edit grows beyond a targeted change**, consider whether it
  warrants `/revise-doc` (review-driven), `/create-spike` (new research),
  or `/create-plan` (new spec) instead
