# Eval brief: create-note skill (refresh)

**Task**: T1B1.03

## Contract

Singleton skill. Creates a living note at the right path: `<project>/notes/<kebab>.md`
when project context is loaded, or `docs/notes/<kebab>.md` otherwise. Resolves
scope from cwd / prompt only — never invokes `/launch-project`. Normalizes the
note name to kebab-case. Delegates file creation to the scaffold CLI
(`yolo note <name>` today; `yolo new note <scope> <name>`
once the CLI lands). No number assignment — notes are unprefixed. Tools:
`Read, Edit, Write, Glob, Grep, Bash`.

## Eval scenarios

Static eval — describes inputs (cwd, prompt, name) and the expected file path
plus key behaviors. No live skill dispatch yet.

### Scenario A — active project context

**Inputs**:

- cwd: `docs/x000-yolo-project/` (or any descendant, e.g.
  `docs/x000-yolo-project/s01-harness-conversion/`)
- captain prompt: "capture a note on outbox ownership"
- name: `outbox-ownership`

**Expected output**:

- File created at `docs/x000-yolo-project/notes/outbox-ownership.md`
- Skill resolves scope as **project** (cwd matches `docs/xNNN-<name>/`)
- No `/launch-project` invocation
- Scaffold CLI called once with the normalized name
- Brief to captain names the project path

**Failure modes**: lands at `docs/notes/...` (ignored project context); invokes
`/launch-project`; creates nested directory under `notes/`; assigns a numeric
prefix.

### Scenario B — no project context loaded

**Inputs**:

- cwd: repo root (`/Users/.../openspike/`)
- captain prompt: "note the codex / claude-code symlink convention"
- name: `harness-symlink-convention`

**Expected output**:

- File created at `docs/notes/harness-symlink-convention.md`
- Skill resolves scope as **global** (cwd not inside any `docs/xNNN-` project,
  prompt names no existing project)
- No `/launch-project` invocation — falls back to global cleanly
- Scaffold CLI called once with the normalized name
- Brief to captain names the global path

**Failure modes**: invokes `/launch-project` to materialize a project; refuses
because no project is active; lands the file in the wrong directory.

### Scenario C — name with spaces and special characters

**Inputs**:

- cwd: repo root
- captain prompt: "note the OAuth / PKCE handshake quirks"
- name as supplied: `OAuth / PKCE Handshake Quirks!`

**Expected output**:

- Filename normalized to `oauth-pkce-handshake-quirks.md`
- File created at `docs/notes/oauth-pkce-handshake-quirks.md`
- Normalization applied before the CLI call (so the brief and filename agree)
- Punctuation stripped, runs of `-` collapsed, no leading or trailing `-`
- No double-dash anywhere in the final filename

**Failure modes**: filename keeps spaces or `/` (invalid path); double-dashes
from un-collapsed runs; mixed case retained; the CLI is called with a name
that mismatches what the brief reports back.

## Pass criteria

1. **Path resolution** — Scenarios A and B place the file at the project path
   and global path respectively. Misplaced file = fail.
2. **No launch-project** — none of the three scenarios invokes
   `/launch-project`. Any such invocation = fail (the skill must remain
   independent per Ch4).
3. **Kebab-case normalization** — Scenario C's final filename matches
   `^[a-z0-9]+(-[a-z0-9]+)*\.md$`. Any uppercase letter, space, special
   character, or doubled `-` = fail.
4. **CLI delegation** — every scenario calls the scaffold CLI exactly once.
   Direct file Writes that bypass the CLI = fail (the pre-write-doc hook
   would also block them).
5. **Captain brief** — every scenario ends with a one-line brief naming the
   final file path and scope (project name or "global"). Missing brief = fail.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Skill body refreshed from p01 Ch4
  contract: scope resolution from cwd / prompt with global fallback (no
  `/launch-project`), explicit kebab-case normalization, scaffold CLI
  delegation phrased as "use the scaffold CLI" so it survives the
  `doc-create.sh` → `yolo new note` rename. Three scenarios cover project
  scope, global fallback, and name normalization. Pending live dispatch once
  the foundation hooks land in this worktree's branch.
