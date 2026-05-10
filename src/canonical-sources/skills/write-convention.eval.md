# Eval brief: write-convention skill

**Task**: T1B1.05

## Contract

Singleton skill. Inputs: `name` (kebab-case bare stem), `content` (markdown
body), optional `delete` flag. Output: file at `docs/conventions/<name>.md`
created, edited, or removed; `docs/AGENTS.md`'s convention list regenerated
between `<!-- conventions:start -->` and `<!-- conventions:end -->` from the
on-disk listing on every change. Refuses any input whose resolved path
escapes `docs/conventions/`. Tools: `Read, Edit, Write, Glob, Grep`. No
Bash. No Dispatch.

## Eval scenarios

Static eval — describes inputs, repo state, and expected post-conditions.
No live dispatch yet. Convention files and AGENTS.md exist as fixtures
only; the skill body is the unit under test.

### Scenario A — new convention file

Repo state: `docs/conventions/` contains `existing-rule.md`. `docs/AGENTS.md`
exists with the marker block; the list shows one bullet for `existing-rule`.

Input: `name: "new-rule"`, `content: "# New rule\n\nUse X over Y.\n"`.

Expected: `docs/conventions/new-rule.md` exists with the supplied body.
`docs/AGENTS.md` between markers contains two bullets, sorted
case-insensitively: `- [existing-rule](conventions/existing-rule.md)` and
`- [new-rule](conventions/new-rule.md)`. Nothing outside the marker region
changed.

### Scenario B — edit existing convention

Repo state: `docs/conventions/existing-rule.md` exists. AGENTS.md list
already lists it.

Input: `name: "existing-rule"`, `content: "# Existing rule (revised)\n\nUpdated guidance.\n"`.

Expected: `docs/conventions/existing-rule.md` body matches the new content.
AGENTS.md is byte-identical to its prior state — same single bullet, same
surrounding prose. Skill briefs the captain that the file was updated and
the AGENTS.md list was unchanged.

### Scenario C — delete a convention

Repo state: `docs/conventions/` contains `existing-rule.md` and
`stale-rule.md`. AGENTS.md lists both.

Input: `name: "stale-rule"`, `delete: true`.

Expected: `docs/conventions/stale-rule.md` is removed. AGENTS.md between
markers contains one bullet for `existing-rule` only. Captain briefing
notes the file removal and the bullet removal.

### Scenario D — refuse path traversal

Input: `name: "../other-path"` (or equivalently the literal string
`docs/conventions/../other-path.md` passed as `name`),
`content: "# Anything\n"`.

Expected: skill refuses with a clear boundary message naming the offending
input — e.g. `write-convention refused: '../other-path' is outside
docs/conventions/`. No file under `docs/conventions/` is created. No
file outside `docs/conventions/` is created. `docs/AGENTS.md` is
untouched. The skill must not normalize the `..` away and proceed.

## Pass criteria

1. **File outcomes match** — Scenarios A–C produce the exact file
   create/edit/delete described. Scenario D produces no file mutation
   anywhere on disk.
2. **AGENTS.md regenerate** — A and C produce the listed bullet sets,
   sorted case-insensitively, between the markers. B leaves AGENTS.md
   byte-identical.
3. **Outside-markers preservation** — In every passing scenario, all
   AGENTS.md content outside the marker region is byte-identical to the
   prior state.
4. **Refusal clarity** — Scenario D's refusal message names the offending
   input and the boundary. Silent rewrite or normalized-and-proceeded
   behavior is a failure.
5. **Tool discipline** — No Bash invocations. No Dispatch. Any reach
   outside `docs/conventions/` or `docs/AGENTS.md` is a failure.

## Iteration log

- **Iter 1** (2026-05-09): Authored skill body and four scenarios from
  p01 Ch4 contract. Path-traversal refusal encoded as input-time check
  on `name` (rejects `..`, `/`, `\`, leading `.`, empty). AGENTS.md
  regeneration encoded as full-region replace between markers with
  outside-region byte preservation; missing-file path creates a minimal
  stub; missing-marker path refuses rather than guessing insertion point.
  Pending live dispatch once the harness can drive the skill against a
  fixture worktree.
