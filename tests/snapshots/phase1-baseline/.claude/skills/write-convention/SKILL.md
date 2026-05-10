---
name: write-convention
description: "Author, edit, or delete a convention file under docs/conventions/ and keep docs/AGENTS.md's convention list in sync. Use when adding or changing a project convention (style or process rule). Refuses any path outside docs/conventions/."
---

Dedicated authoring for files under `docs/conventions/`. One convention per
file. Keeps `docs/AGENTS.md`'s convention list regenerated from the on-disk
listing on every change. Distinct from `write-doc` — narrower scope, stricter
path discipline, owns the AGENTS.md marker region.

## Inputs

- `name` — convention file name (kebab-case, no extension, no path separators)
- `content` — full markdown body to write (omit when deleting)
- `delete` — optional flag; when set, removes the file instead of writing it

## Tools

`Read, Edit, Write, Glob, Grep`. No Bash. No Dispatch.

## Path Resolution and Refusal

The target path is **always** `docs/conventions/<name>.md`. Compute it from
the input `name` alone — never accept a caller-supplied path.

Refuse and exit with a clear error when:

1. `name` contains `/`, `\`, or `..`
2. `name` starts with `.` or is empty
3. The resolved target, after normalization, does not have the prefix
   `docs/conventions/` followed by a single `<name>.md` segment
4. The caller supplied a full path (e.g. `docs/conventions/../other-path.md`)
   instead of a bare name — treat the literal string as `name`, observe the
   `..` or `/`, and refuse on rule 1

The refusal message must name the offending input and state the boundary —
e.g. `write-convention refused: 'docs/conventions/../other-path.md' is
outside docs/conventions/`. Never silently rewrite or normalize away a
traversal attempt.

## Process

Execute in order. Do not skip ahead.

### 1. Validate

Apply the path-resolution rules above. On any violation, refuse with the
boundary message and stop. No file is touched.

### 2. Apply the change

- **Create or overwrite**: write `content` to `docs/conventions/<name>.md`.
  Preserve any frontmatter the caller included; do not invent fields.
- **Edit**: when the file already exists and the caller passes partial
  content, prefer `Edit` over `Write` so unrelated regions are preserved.
  When the caller passes a full body, `Write` is fine.
- **Delete** (when `delete` is set): remove the file. If the file does not
  exist, report it and continue to step 3 — AGENTS.md still gets regenerated
  so a stale entry is dropped.

### 3. Regenerate the AGENTS.md convention list

The convention list in `docs/AGENTS.md` lives between two HTML-comment
markers:

```text
<!-- conventions:start -->
- [foo](conventions/foo.md)
- [bar](conventions/bar.md)
<!-- conventions:end -->
```

Steps:

1. **Locate** `docs/AGENTS.md`. If it does not exist, create it with this
   minimal stub and proceed:

   ```text
   # Agent Conventions

   Conventions live under `docs/conventions/`. Each file covers one rule.

   <!-- conventions:start -->
   <!-- conventions:end -->
   ```

2. **Scan** `docs/conventions/*.md` via `Glob`. Sort the matches
   case-insensitively by file name. Derive each entry's link text from the
   file stem.

3. **Regenerate** the region between `<!-- conventions:start -->` and
   `<!-- conventions:end -->`. Replace the entire span — markers retained,
   inner lines fully replaced — with one bullet per file:
   `- [<stem>](conventions/<stem>.md)`. When the directory is empty, the
   region between markers is empty (no bullets, no placeholder text).

4. **Preserve everything outside the markers untouched.** Any heading,
   prose, or other section the captain has added stays byte-for-byte
   identical. If the start marker is missing, refuse with a clear error
   ("AGENTS.md exists but lacks `<!-- conventions:start -->`") rather than
   guessing where to insert.

### 4. Brief the captain

Report what changed: the file path written, edited, or removed; whether
AGENTS.md was created or updated; the resulting bullet count.

## Guidelines

- **One topic per file.** Conventions are short and focused. If a draft
  spans multiple rules, split before writing.
- **No anchors.** Cross-references inside convention bodies use file paths
  only — never `path/to/file.md#section`. Link to a sibling file instead.
- **Do not edit AGENTS.md outside the marker region.** That space belongs
  to the captain.
- **Do not modify files outside `docs/conventions/` or `docs/AGENTS.md`.**
  Other doc edits belong in `write-doc`.
- **Do not number convention files.** They are unprefixed kebab-case, like
  notes.
