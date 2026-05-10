
Archive a project. Condenses one `docs/xNNN-<name>/` to a single archived
README that summarizes what was done, what decisions were made, and what
follow-up was surfaced. Promoted decisions move to top-level
`docs/decisions/`; promoted follow-up moves to `docs/notes/`. Inbound
cross-references across `docs/` are rewritten. The condensed README is
validated via single-pass `/validate-doc` **before** any source content
is deleted. Archive lands as one atomic git commit; recovery is `git
revert` of that commit.

## When to Use

- Captain explicitly requests archive of a project (`/archive-project xNNN-name`)
- Captain has decided the project's work is done and the workspace is
  ready to be condensed

## When NOT to Use

- Project is still in flight (active spike, in-progress plan, open
  decisions) — finish the work first
- Captain wants to delete a project outright with no historical record —
  `git rm` and a normal commit; `archive-project` produces a condensed
  README, not a removal
- Re-running on an already-archived project — archive is irreversible
  via this skill; restart by `git revert` first

## Inputs

- **project** (required) — the project id (`xNNN-name`) or an absolute
  path to its directory under `docs/`. The project must exist and must
  not already be `status: archived`.

## Tools

`Read, Edit, Write, Glob, Grep, Bash, Dispatch`

## Hard rules

- **Never delete source content before step 6 validation passes and the
  captain confirms** (the corrected step ordering — the prior body
  skeleton inverted these and is the documented bug this skill fixes).
- **Promotion requires per-decision captain approval.** Walk decisions
  one at a time; do not batch-promote, do not infer "looks important".
- **Atomic commit only.** Every artifact this skill touches lands in
  one git commit at the end. If any step fails, leave the working tree
  dirty and surface the failure — do not partial-commit.
- **No anchors in rewritten links** (per the project-organization
  decision on file-level cross-references). All rewritten links are
  file-level only.

## Process

### 1. Pre-flight: link check

Run the link-checking pre-commit script:

```bash
doc-check-links.sh
```

If the script exits non-zero, abort the whole archive operation and
surface the broken-link list to the captain. No destructive (or even
non-destructive) work runs until the link graph is clean. Re-invoke
the skill after the captain has fixed the broken refs.

### 2. Promote important long-term decisions

Walk `<project>/decisions/d*.md`, oldest to newest. For each decision:

1. Read the file. Summarize: question, decision, scope (project-internal
   vs cross-cutting).
2. Brief the captain with the summary. Ask: **promote to top-level
   `docs/decisions/`, or summarize-only into the condensed README?**
3. If promote: invoke `/create-decision --global <name>` style flow
   (or directly scaffold via `yolo new decision
   --global <name>`). The promoted file gets the next-available
   top-level `dNN-` and **preserves the original-name slug**
   (e.g., `x000-yolo-project/decisions/d03-canonical-format.md` →
   `docs/decisions/d12-canonical-format.md` if `d11` was the latest).
   Copy the body verbatim; preserve the frontmatter `status` and any
   `supersedes`. Do not edit the body during promotion.
4. Record in the in-memory promotion mapping table:
   `<old-path> → <new-path>` for promoted, `<old-path> → README#summary`
   for summarize-only.

The mapping table feeds steps 4 (rewrite) and 5 (README composition).

Example mapping table shape:

| Original path | New path |
|---|---|
| `docs/xNNN-foo/decisions/d01-bar.md` | `docs/decisions/d12-bar.md` |
| `docs/xNNN-foo/decisions/d02-baz.md` | (summarized in README) |

### 3. Move follow-up work

Walk `<project>/notes/*.md` and `<project>/tasks.md` unchecked rows.
For each item:

1. Brief the captain with the item's text and origin.
2. Ask: **move to `docs/notes/<topic>.md`, or drop as no-longer-relevant?**
3. If move: scaffold via `yolo new note --global
   <name>` and write the item's body. If multiple project notes belong
   together, ask the captain whether to consolidate into one
   `docs/notes/<topic>.md` or keep separate.
4. Append to the same promotion mapping table from step 2:
   `<old-path> → <new-path>` for moved, `<old-path> → (dropped)` for
   no-longer-relevant.

### 4. Rewrite cross-references

Scope: every Markdown file under `docs/`. Specifically:

- `docs/conventions/` — convention files
- `docs/decisions/` — top-level decisions
- `docs/notes/` — top-level notes
- Every other `docs/xNNN-*/` project (their READMEs, tasks, decisions,
  notes, spike/plan chapters)

For each file, scan for two reference shapes:

1. **Markdown link syntax**: `](<path>)` where `<path>` matches an
   entry in the promotion mapping table's "old path" column.
2. **Frontmatter `source:` fields**: top-of-file YAML frontmatter
   keys named `source:` whose value matches an "old path" entry.

Rewrite each match per the mapping table. **Do not match bare path
mentions in prose** (e.g., a paragraph mentioning
"see `xNNN-foo/decisions/d01-bar.md` for context" without link
syntax) — those are commentary, not links, and rewriting them would
corrupt prose.

Build an "orphan" report: any reference whose path begins with the
project's prefix (`docs/xNNN-name/`) but matches no mapping entry.
Surface the orphan list to the captain before proceeding to step 5.
The captain decides per orphan: rewrite to the condensed README,
rewrite to a different target, or leave as-is.

### 5. Stage the condensed README

Write `docs/<project>/README.md` (overwriting the existing
project README) with this structure:

```markdown
---
status: archived
---

# <project name>

<one-paragraph summary of what the project did>

## Decisions

<promotion mapping table from steps 2 & 3>

### Decisions promoted to docs/decisions/

- [<name>](../decisions/dNN-<name>.md) — <one-line summary>
- ...

### Decisions summarized here (not promoted)

- **<question>** — <captain's answer, one or two sentences>
- ...

## Follow-up

### Moved to docs/notes/

- [<topic>](../notes/<topic>.md) — <one-line summary>
- ...

### Dropped as no-longer-relevant

- <item> — <why dropped>
- ...

## History

Full chapter content lives in git history. The project directory
formerly contained: <enumerate spike/plan dirs and their chapter count>.
```

**Critical**: at the end of step 5 the working tree contains the
new condensed README **plus** all the original source files
(`tasks.md`, `decisions/`, `notes/`, spike/plan directories). The
captain will validate the condensed README against those originals
in step 6. **Do not delete anything yet.**

### 6. Validate the staged README

Invoke `/validate-doc` against the staged condensed README:

- artifact path: `docs/<project>/README.md`
- focus list: `[comprehensiveness, clarity]` (the archive-project
  baseline; lifecycle skills may extend per project — e.g., add
  `accuracy` if cross-cutting decisions were promoted)
- iteration: 1
- review directory: `docs/<project>/`

Wait for `/validate-doc` to return its summary. For each rNN- file
the dispatcher landed:

1. Triage findings via `/triage-feedback`.
2. Per cluster routed to **act**: invoke `/revise-doc` on the
   condensed README to apply the fix.
3. Per cluster routed to **surface**: present to the captain as a
   blocking question. Wait for captain direction.
4. Per cluster routed to **lock-decisions**: invoke `/lock-decisions`
   for the captain to lock; new decisions land in
   `docs/decisions/` (not the project — the project is archiving).

This is a **single-pass** validate-loop (per the lifecycle-and-routers
spec): one round of validate-doc, apply act-items, surface
remaining to the captain. There is no iteration-2; if the captain
rejects the condensed README, the captain resolves by direct edit
or by re-invoking the skill after fixing the upstream issue.

After step 6 completes, ask the captain: **proceed with deletion?**
Wait for explicit confirmation. **No deletion happens until the
captain says yes.**

### 7. Delete source content

Only after step 6 passes and the captain confirms:

```bash
rm <project>/tasks.md
rm -rf <project>/decisions/
rm -rf <project>/notes/
rm -rf <project>/sNN-*/  # every spike directory
rm -rf <project>/pNN-*/  # every plan directory
```

The condensed README from step 5 is the only file remaining in
`<project>/`. All other content is recoverable via git history.

### 8. Set archived frontmatter

The condensed README's frontmatter was already written as
`status: archived` in step 5. Verify it is still set; if a step-6
revision accidentally removed it, restore it. The condensed
README's `status: archived` is the canonical signal that the
project is archived.

### 9. Atomic git commit

Stage every file the operation touched:

- The condensed README (`docs/<project>/README.md`)
- Every promoted decision (`docs/decisions/dNN-<name>.md`)
- Every moved note (`docs/notes/<name>.md`)
- Every cross-reference rewrite across `docs/`
- Every source deletion (`<project>/tasks.md`, `decisions/`,
  `notes/`, spike/plan dirs)

Verify `git status` shows no untracked or unstaged changes
related to the archive (other staged work the captain had in
flight is the captain's concern; surface it, do not auto-stage).

Commit with a message of the shape:

```
docs(archive): condense xNNN-<name> to archived README

Promoted N decisions, moved M follow-ups, rewrote K inbound refs.

Co-Authored-By: <agent>
```

Brief the captain with: condensed README path, promoted decision
count and paths, moved note count and paths, rewritten reference
count, the commit SHA. Recovery, if needed: `git revert <SHA>`.

## Failure modes to avoid

- **Deleting source content before validation passes** — the corrected
  step order in this body is the explicit fix. Step 7 must follow
  step 6's captain confirmation.
- **Auto-promoting decisions** — every promotion requires per-decision
  captain approval. Batched "promote all important-looking ones" is
  forbidden.
- **Missing inbound references from `docs/conventions/` or
  `docs/decisions/`** — step 4's scope explicitly includes those
  directories. A common bug is to scan only sibling projects and miss
  the convention/decision cross-references.
- **Rewriting bare prose mentions** — step 4 matches link syntax and
  frontmatter `source:` only. A paragraph mentioning a path is
  commentary, not a link.
- **Non-atomic commit** — leaving uncommitted changes after step 9
  defeats the recovery story. Verify `git status` is clean for the
  archive scope before reporting success.
- **Re-running on already-archived project** — check the project
  README's frontmatter at step 0; if `status: archived`, refuse and
  tell the captain to `git revert` first.
