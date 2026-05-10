
Lightweight decision capture. Writes one `dNN-<name>.md` to a project's
`decisions/` directory (or top-level `docs/decisions/` with `--global`),
using the schema from the project-organization spike. Used by
`/lock-decisions`, by `/grill-me` after the captain locks an answer, or
invoked directly.

## When to Use

- Captain has locked an answer to a cross-cutting question and wants it persisted
- `/lock-decisions` routes a finding to lock with the captain's chosen answer
- `/grill-me` exits with a captain-locked branch
- A new decision supersedes a prior one (the prior one is archived in the same operation)

## When NOT to Use

- Capturing exploratory context or open questions — use `/create-note`
- Editing the body of an existing decision — use `/edit-doc` (and remember
  archived decisions are append-only; create a superseding decision instead)
- Reviewing/grilling a question — use `/grill-me` or `/lock-decisions` first;
  call `create-decision` only after the captain has actually locked an answer

## Inputs

- **name** (required) — kebab-case slug, e.g. `oauth-refresh-strategy`
- **answer body** (required) — the captain's answer text; populates `## Decision`
- **scope** — `<project-id>` (default: the project context already loaded), or
  `--global` for top-level `docs/decisions/`
- **supersedes** (optional) — list of prior decision IDs (e.g. `[d05]`) within
  the same scope that this decision replaces

## Process

### 1. Resolve scope

- If the captain passes `--global` → scope is top-level `docs/decisions/`
- Otherwise, if a project context is loaded (e.g. `docs/x000-yolo-project/`)
  → scope is `<project>/decisions/`
- If neither holds, ask the captain which scope. Do **not** invoke
  `/launch-project` — same fallback discipline as `/create-note`

### 2. Scaffold the file

Delegate numbering to the CLI (per-scope sequential — project-scope numbers
do not collide with global-scope numbers; the same `dNN` may exist in both):

```bash
.claude/scripts/yolo new decision <project|--global> <name>
```

The CLI emits a JSON envelope on stdout. Parse `filePath` to learn where
the decision landed:

```bash
result=$(.claude/scripts/yolo new decision "$scope" "$name")
file_path=$(printf '%s' "$result" | jq -r '.filePath')
```

Example resolved paths: `docs/x000-yolo-project/decisions/d14-<name>.md`
(project scope) or `docs/decisions/d04-<name>.md` (`--global`). Never
pick the number manually. On non-zero exit, surface the JSON `message`
field (on stderr) verbatim — the most common failure is `collision`
when a decision with the same `<name>` already exists in that scope.

### 3. Populate the schema

Edit the scaffolded file to match the canonical decision schema:

```markdown
---
status: active
blocks: []
supersedes: []
---

## Question

<one or two sentences naming what is being decided>

## Context

<why this needs deciding; cite spike chapters / prior decisions by relative path>

## Options

- **A. <name>.** <description, trade-offs>
- **B. ...**

## Recommendation

<pre-decision recommendation, if any — may be the captain's own>

## Decision

<the captain's answer body, verbatim or lightly cleaned>
```

Frontmatter rules:

- `status` is `active` for every newly-written decision (never `archived` at birth)
- `blocks` lists other decisions in the same scope that are blocked by this one (rare)
- `supersedes` lists prior dNN ids in the same scope (e.g. `[d05]`); empty array if none

If `## Options` / `## Recommendation` are not meaningful (e.g., a single-option
decision the captain dictated), keep the heading and write a one-line note
(`(single option — captain dictated)`). Do not drop the section.

### 4. Apply supersedes mechanics

If `supersedes: [dNN, ...]` is set, in the same logical operation:

1. Find each named prior decision in the same scope
   (`<scope>/decisions/dNN-*.md` — glob by id prefix)
2. Edit each prior decision's frontmatter: flip `status: active` → `status: archived`
3. Do **not** edit the prior decision's body (archived decisions are
   append-only per the project-organization rules)
4. If a named prior decision is already `archived`, leave it; do not error,
   but mention it in the captain brief

A new decision and its prior(s)' status flip land together. If you cannot
edit a prior (file missing, scope mismatch), stop and surface the problem;
do not write a half-superseded state.

### 5. Brief the captain

Report: scope, new path, prior decisions archived (if any), and the one-line
question. Keep it terse.

## Guidelines

- **Numbering is per scope, by the CLI** — never hand-pick `dNN`
- **Project decisions stay in the project**; only `archive-project` promotes
  them to top-level
- **No anchors in cross-references** — link by relative path only (per d06)
- **Never flip an archived decision back to `active`** — write a new
  superseding decision instead
