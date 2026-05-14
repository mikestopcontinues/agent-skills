---
name: launch-project
description: "Materialize or load a project context as precondition for lifecycle skills. Resolves the target project from cwd or an explicit name in the prompt; loads README, tasks.md, decisions/, notes/ for an existing project; scaffolds a new project skeleton if the resolved name doesn't exist. Refuses (with one bounded retry) when no project is determinable. Returns project metadata to the calling skill."
tools: Read, Edit, Write, Glob, Grep, Bash
---

Project-context loader. Lifecycle skills (`/create-spike`, `/create-plan`,
`/execute-plan`, `/archive-project`) and the top-level `/yolo-project` router
invoke `launch-project` as a precondition. The skill resolves the target
project from the agent's cwd or an explicit name in the prompt, loads (or
scaffolds) the project's canonical files, and returns metadata. It does not
write a filesystem marker — idempotency is the calling skill's concern, and
on session resume the project is re-derived from cwd alone (per the
filesystem-derived-state rule).

## When to Use

- A lifecycle skill needs project context loaded before authoring chapters,
  walking decisions, or executing phases
- The router (`/yolo-project`) is about to dispatch a project-bound intent
  and needs to ensure context is materialized first
- The captain invokes `/launch-project <name>` directly to bring a project
  into focus

## When NOT to Use

- The intent is harness-wide (`/start-session`, ad-hoc `/write-code` against
  arbitrary repo files) — these do not require project context
- A project context is already loaded in the current conversation **and** the
  calling skill has already short-circuited — re-invoking is harmless but
  wastes a turn (this skill is cheap, not free)
- Writing a decision file at top-level scope (`/create-decision --global`) —
  no project context needed

## Inputs

- **prompt-named project** (optional) — `xNNN-name` form (e.g.
  `x000-yolo-project`) or descriptive name (e.g. `the auth project`)
- **cwd** (implicit) — the agent's working directory; used as the primary
  resolution signal

If neither input resolves to a project, the skill refuses (see Refusal mode
below).

## Process

### 1. Detect target project

In order of precedence:

1. **cwd inside an existing project**: run `git rev-parse --show-toplevel`
   to anchor the repo root. Compute the cwd-relative path. If cwd is under
   `docs/xNNN-name/` (or any descendant), resolve to that project. The
   `xNNN-` prefix is the discriminator — three-digit number, lowercase
   kebab.
2. **Prompt names a project**: if the captain's prompt contains an
   `xNNN-name` token or a descriptive name (`the auth project`,
   `yolo project`), match it against `docs/x*/` directory names.
   - Exact `xNNN-name` match → that project
   - Descriptive match → glob `docs/x*-*name*/`; if exactly one hit,
     resolve; if zero hits, treat as a new project name (proceed to
     scaffold step); if multiple hits, refuse with the candidate list and
     let the calling skill ask the captain to disambiguate
3. **Neither**: refuse (see Refusal mode).

### 2. Scaffold or load

- **Resolved to an existing project** (`docs/xNNN-name/` exists):
  - Read `README.md` (the charter)
  - Read `tasks.md` (the operational checklist)
  - List `decisions/d*.md` and read each (frontmatter + body)
  - List `notes/*.md` and surface filenames; read on demand
  - List `s*-*/` and `p*-*/` subdirectories; surface their `README.md` paths
  - Set project context: path, name, status (from README frontmatter when
    present), open spike/plan inventory
- **Resolved to a new project** (name supplied, directory does not exist):
  - Invoke `${CLAUDE_PLUGIN_ROOT}/scripts/yolo new project <name>` — the CLI assigns the next free
    `xNNN-` and seeds the canonical layout (`README.md` charter with
    `status: active` frontmatter and `## One-liner` / `## Why` /
    `## In Scope` / `## Out of Scope` / `## Success Criteria` headings;
    `tasks.md` with `## Spike` / `## Plan` / `## Execution` headings;
    empty `decisions/` and `notes/`)
  - After scaffold, load as if existing

### 3. Return metadata

Return to the calling skill (in conversation, not via a file):

- `path` — repo-relative path to the project root (e.g.
  `docs/x000-yolo-project`)
- `name` — the project name component (e.g. `yolo-project`)
- `id` — the prefixed slug (e.g. `x000-yolo-project`)
- `status` — `active` | `archived` (from README frontmatter; default `active`)
- `created` — `true` if this invocation scaffolded a new project, else
  `false`
- `openSpikes` — list of `sNN-` directory names with active `README.md`
- `openPlans` — list of `pNN-` directory names with active `README.md`
- `decisionCount` — number of `dNN-` files in `decisions/`
- `noteCount` — number of files in `notes/`

The calling skill is responsible for deciding what to do with the metadata.
`launch-project` does not advance the workflow, prompt the captain, or
write task entries.

## Refusal mode

If step 1 yields nothing (cwd is not inside any `docs/xNNN-`, prompt does
not name a project, and no descriptive match resolves), refuse with a
short structured error to the calling skill:

```
{ refused: true, reason: "no-project-determinable", details: "<short>" }
```

The calling skill (typically `/yolo-project` or a lifecycle skill) is
expected to:

1. Ask the captain for the project name
2. Re-invoke `/launch-project` once with the captain's answer

The retry budget is **one**. If the second invocation also refuses, the
calling skill must return the refusal to the captain rather than looping
further.

## Hard rules

- **Never auto-create on ambiguous input.** A descriptive name that
  matches multiple existing projects is a refusal, not a guess. A blank
  prompt with no cwd context is a refusal, not a "default to x000".
- **Refusal-loop is bounded to one retry.** This skill does not enforce
  the bound (the calling skill does), but it must return a stable
  refusal shape so the calling skill can detect and stop.
- **No filesystem marker.** Do not write `~/.agents/state/active-project`
  or any equivalent. Idempotency lives in calling-skill memory; on
  session resume, project context is re-derived from cwd alone. Aligns
  with the filesystem-derived-state rule.
- **No tasks.md writes.** Loading a project is read-only against
  `tasks.md`. Updates to `tasks.md` are owned by the lifecycle skill
  performing the work, not by `launch-project`.
- **Re-reading is cheap, not free.** `launch-project` does not
  short-circuit on its own — every invocation re-reads the project's
  canonical files. The calling orchestrator is the right place to
  short-circuit (it remembers the prior load within a single
  conversation). On session resume across conversations, the cwd-derived
  re-read is correct behavior.
- **No prompts to the captain.** `launch-project` is a loader, not a
  router. If something is ambiguous, refuse and return; let the calling
  skill prompt.

## Output schema

Returned to the calling skill (conversational JSON-shaped block, not a
file):

```
{
  path: "docs/x000-yolo-project",
  name: "yolo-project",
  id: "x000-yolo-project",
  status: "active",
  created: false,
  openSpikes: ["s01-harness-conversion"],
  openPlans: [],
  decisionCount: 14,
  noteCount: 6
}
```

For a refusal:

```
{ refused: true, reason: "no-project-determinable", details: "cwd is repo root; prompt names no project" }
```

Refusal reasons are exactly one of:

- `no-project-determinable` — neither cwd nor prompt resolved
- `ambiguous-descriptive-name` — descriptive name matched multiple
  existing projects; `details` lists the candidates
