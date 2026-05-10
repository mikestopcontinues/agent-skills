# Eval brief: yolo new CLI

**Task**: T1C.01

## Contract

`yolo` is the v0.1 surface of the agent skills toolkit's CLI.
For Phase 1 it ships only the `new` subcommand, which scaffolds project /
spike / plan / chapter / review / decision / note artifacts under `docs/`
with monotonic per-scope numbering and emits a stable JSON envelope.

- **Default output**: JSON on stdout for success; JSON on stderr for errors.
- **`--human` flag** (anywhere in argv): pretty-prints to stdout / stderr.
- **Exit codes**: `0` on success; `1` on user error (collision, invalid-name,
  missing-project, missing-arg, invalid-kind); `2` on internal error
  (filesystem, permission, no git repo).
- **Schema version**: `schemaVersion: 1` on every envelope.

### JSON success envelope

```json
{
  "ok": true,
  "kind": "spike",
  "path": "docs/x999-eval-seed/s01-example-spike/",
  "filePath": "docs/x999-eval-seed/s01-example-spike/README.md",
  "number": 1,
  "schemaVersion": 1
}
```

`number` is `null` for kinds with no monotonic numbering (notes).

### JSON error envelope

```json
{
  "ok": false,
  "code": "collision",
  "message": "spike 'example-spike' already exists at docs/x999-eval-seed/s01-example-spike/",
  "schemaVersion": 1
}
```

Error codes: `collision | invalid-name | missing-project | missing-arg | invalid-kind`.

## Scratch fixture

The CLI calls `git rev-parse --show-toplevel` to anchor `docs/`, so the eval
runs inside a throwaway git repo at `/tmp/yolo-eval-test/` with this seed:

```
/tmp/yolo-eval-test/
  .git/
  docs/
    x999-eval-seed/
      README.md
      decisions/
      notes/
    decisions/
    notes/
```

Reset between runs:

```bash
SCRATCH=/tmp/yolo-eval-test
rm -rf "$SCRATCH" && mkdir -p "$SCRATCH" && cd "$SCRATCH"
git init -q && git config user.email eval@test.local && git config user.name Eval
mkdir -p docs/x999-eval-seed/{decisions,notes} docs/{decisions,notes}
echo "# seed" > docs/x999-eval-seed/README.md
git add . && git commit -q -m seed
```

## Eval inputs

YOLO points at `yolo` in the worktree. All commands run from
`/tmp/yolo-eval-test/` after the scratch reset above.

### 1. `yolo new project example-foo`

**Expected**: success; creates `docs/x{next}-example-foo/` with `README.md`,
`tasks.md`, `notes/`, `decisions/`. Numbering picks up after the seed's
`x999-eval-seed/`, so `next == 1000`.

**Actual JSON**:
```json
{"ok": true, "kind": "project", "path": "docs/x1000-example-foo/", "filePath": "docs/x1000-example-foo/README.md", "number": 1000, "schemaVersion": 1}
```
Exit: `0`. Filesystem: `docs/x1000-example-foo/{README.md, tasks.md, notes/, decisions/}` all present.

### 2. `yolo new spike x999-eval-seed example-spike`

**Expected**: creates `docs/x999-eval-seed/s01-example-spike/README.md`.

**Actual JSON**:
```json
{"ok": true, "kind": "spike", "path": "docs/x999-eval-seed/s01-example-spike/", "filePath": "docs/x999-eval-seed/s01-example-spike/README.md", "number": 1, "schemaVersion": 1}
```
Exit: `0`. README scaffolded with `# Example Spike` plus standard sections.

### 3. `yolo new chapter x999-eval-seed s01-example-spike intro`

**Expected**: creates `docs/x999-eval-seed/s01-example-spike/01-intro.md`.

**Actual JSON**:
```json
{"ok": true, "kind": "chapter", "path": "docs/x999-eval-seed/s01-example-spike/", "filePath": "docs/x999-eval-seed/s01-example-spike/01-intro.md", "number": 1, "schemaVersion": 1}
```
Exit: `0`.

### 4. `yolo new review x999-eval-seed s01-example-spike accuracy`

**Expected**: creates `docs/x999-eval-seed/s01-example-spike/r01-accuracy.md`.

**Actual JSON**:
```json
{"ok": true, "kind": "review", "path": "docs/x999-eval-seed/s01-example-spike/", "filePath": "docs/x999-eval-seed/s01-example-spike/r01-accuracy.md", "number": 1, "schemaVersion": 1}
```
Exit: `0`.

### 5. `yolo new decision x999-eval-seed example-decision`

**Expected**: creates `docs/x999-eval-seed/decisions/d01-example-decision.md`
with the standard decision frontmatter (`status: active`, `blocks: []`,
`supersedes: []`) and section headers.

**Actual JSON**:
```json
{"ok": true, "kind": "decision", "path": "docs/x999-eval-seed/decisions/", "filePath": "docs/x999-eval-seed/decisions/d01-example-decision.md", "number": 1, "schemaVersion": 1}
```
Exit: `0`.

### 6. `yolo new decision --global cross-cutting`

**Expected**: creates `docs/decisions/d01-cross-cutting.md`. The `--global`
scope routes to the repo-root `docs/decisions/`, independent of any project
numbering.

**Actual JSON**:
```json
{"ok": true, "kind": "decision", "path": "docs/decisions/", "filePath": "docs/decisions/d01-cross-cutting.md", "number": 1, "schemaVersion": 1}
```
Exit: `0`.

### 7. `yolo new note x999-eval-seed working-thoughts`

**Expected**: creates `docs/x999-eval-seed/notes/working-thoughts.md`
(no number — notes are flat files keyed by name).

**Actual JSON**:
```json
{"ok": true, "kind": "note", "path": "docs/x999-eval-seed/notes/", "filePath": "docs/x999-eval-seed/notes/working-thoughts.md", "number": null, "schemaVersion": 1}
```
Exit: `0`. Note: `number` is `null` for the notes kind.

### 8. `yolo new note --global open-question`

**Expected**: creates `docs/notes/open-question.md`.

**Actual JSON**:
```json
{"ok": true, "kind": "note", "path": "docs/notes/", "filePath": "docs/notes/open-question.md", "number": null, "schemaVersion": 1}
```
Exit: `0`.

### 9. `yolo new spike x999-eval-seed example-spike` (collision after #2)

**Expected**: fails with structured `collision` error; does NOT auto-increment
to `s02-example-spike` (would silently mask duplicate work).

**Actual JSON** (on stderr):
```json
{"ok": false, "code": "collision", "message": "spike 'example-spike' already exists at docs/x999-eval-seed/s01-example-spike/", "schemaVersion": 1}
```
Exit: `1`.

### 10. `yolo new --human spike x999-eval-seed example-spike-2`

**Expected**: human-readable output instead of JSON; same fs effect as a
normal spike create.

**Actual stdout**:
```
Created docs/x999-eval-seed/s02-example-spike-2/README.md (kind=spike, number=2)
  path: docs/x999-eval-seed/s02-example-spike-2/
```
Exit: `0`.

## Pass criteria

100% match across all 10 inputs:

- JSON envelope shape (success: `ok|kind|path|filePath|number|schemaVersion`;
  error: `ok|code|message|schemaVersion`).
- Exit codes (`0` for success, `1` for the user-error inputs).
- Filesystem state matches expected paths.
- `--human` flag bypasses JSON for both success and error paths.
- Collision detection refuses duplicate `<name>` regardless of whether the
  number would auto-advance.

## Iteration log

### Iter 1 (2026-05-09)

Authored CLI from scratch lifting the existing `doc-create.sh` normalization
+ numbering logic. First pass through the 10 inputs surfaced one defect:

- **Input 9 failed**: collision detection only checked the would-be path
  (`s02-example-spike`), not the existing `s01-example-spike`. Because the
  `next_numbered_dir` helper auto-advances past the highest existing number,
  re-running with the same name silently allocated a fresh slot instead of
  flagging the duplicate.

**Fix**: added `find_existing_dir_by_name` /
`find_existing_file_by_name` / `find_existing_chapter_by_name` helpers that
glob the parent for any entry whose `-<name>.md` (or `-<name>/`) tail matches,
regardless of leading number. Each `cmd_new_*` calls the appropriate finder
before allocating a new number; if a match exists it emits a `collision`
error. `cmd_new_note` already collided correctly (notes have no number, so
existing-path check sufficed) and didn't need the extra helper.

Re-ran all 10: all pass. Spot-checked extra branches (missing-project,
invalid-kind, missing-arg, invalid-name, name-only project resolution,
ambiguous project resolution) — all return the spec's structured error codes
on stderr with exit `1`. Success exit `0`. Internal-error path (exit `2`)
unreachable in normal scratch use; `git rev-parse` failure is the only
guarded branch.

### Coverage gaps / known follow-ups

- **Ambiguous project resolution** uses the `missing-project` code (the spec
  enumerates only `collision|invalid-name|missing-project|missing-arg|invalid-kind`,
  so re-using the closest match). The error message names every candidate
  match so callers can disambiguate. If a future iteration wants a distinct
  code (e.g., `ambiguous-project`), bump the schema version and add it.
- **Windows**: out of scope per the plan; bash + `find` + GNU-ish sed
  expressions assume a POSIX-ish shell. Documented in the toolkit README
  pivot, not here.
- **`schemaVersion` bump**: the script hard-codes `SCHEMA_VERSION=1`. Any
  envelope shape change (new field, renamed field, new error code) requires a
  bump here and a coordinated wrapper-integration check across calling
  skills.
