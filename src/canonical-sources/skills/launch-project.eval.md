# Eval brief: launch-project skill

**Task**: T1B2.05

## Contract

L5 router skill at `.claude/skills/launch-project/SKILL.md`. Materializes
or loads a project context as precondition for lifecycle skills
(`/create-spike`, `/create-plan`, `/execute-plan`, `/archive-project`)
and the `/yolo-project` orchestrator. Inputs: cwd (implicit) and an
optional prompt-named project (`xNNN-name` or descriptive). Resolves
the target project via cwd-first, then prompt-name precedence. For an
existing project: reads `README.md`, `tasks.md`, `decisions/`, `notes/`;
returns metadata. For a new project (name supplied, dir absent):
scaffolds the canonical layout (preferred via `yolo new project <name>`
once the CLI lands; current fallback is `Bash` + `Write`). Refuses with
a stable shape when no project is determinable; the calling skill is
responsible for the (one-shot) retry. Does NOT write a filesystem
marker — idempotency lives in the calling skill's memory; on session
resume, derived from cwd alone (per the filesystem-derived-state rule).
Tools: `Read, Edit, Write, Glob, Grep, Bash`. No `Dispatch` (loader,
not orchestrator).

## Eval scenarios

Static eval — describes the input cwd / prompt and expected loader
behavior. No live captain dialogue required.

### Scenario A — cwd inside an existing project

Inputs:
- cwd: `<repo>/docs/x000-yolo-project/notes/`
- prompt: empty (the calling lifecycle skill called `/launch-project`
  with no explicit name)

Expected:
- Detection step resolves to `x000-yolo-project` via cwd, not prompt
- Reads `docs/x000-yolo-project/README.md`,
  `docs/x000-yolo-project/tasks.md`
- Lists `decisions/d*.md` (14 entries at present), reads each
- Lists `notes/*.md` and `s*-*/`, `p*-*/` subdirs
- Returns metadata block:
  - `path: docs/x000-yolo-project`
  - `name: yolo-project`
  - `id: x000-yolo-project`
  - `status: active`
  - `created: false`
  - `openSpikes: [s01-harness-conversion]`
  - `openPlans: []` (the p01 plan lives under `docs/plans/`, not
    `x000-yolo-project/`)
  - `decisionCount: 14`
  - `noteCount` matches `ls docs/x000-yolo-project/notes/ | wc -l`
- No prompts to the captain. No writes. No filesystem marker.

Failure modes this scenario guards:
- Resolving from prompt instead of cwd when both are present (cwd wins)
- Reading only README and skipping tasks.md / decisions/

### Scenario B — prompt naming a non-existent project

Inputs:
- cwd: `<repo>` (repo root, not inside any `docs/xNNN-`)
- prompt: `/launch-project oauth-refresh-loop`

Expected:
- Detection step finds no cwd match; falls through to prompt
- Globs `docs/x*-*oauth-refresh-loop*/`; zero hits
- Treats as new-project request; scaffolds:
  - Computes next `xNNN-` (currently `x001` if x000 is the only existing
    project)
  - `mkdir -p docs/x001-oauth-refresh-loop/{decisions,notes}`
  - Writes minimal `README.md` with `status: active` frontmatter and the
    five canonical headings (`## One-liner`, `## Why`, `## In Scope`,
    `## Out of Scope`, `## Success Criteria`) with blank bodies
  - Writes minimal `tasks.md` with `# Tasks` and the three section
    headings (`## Spike`, `## Plan`, `## Execution`)
- Loads the just-scaffolded project as if existing
- Returns metadata with `created: true`, `openSpikes: []`,
  `openPlans: []`, `decisionCount: 0`, `noteCount: 0`
- (Future) Once `yolo new project <name>` lands, the scaffold path
  switches to the CLI; the eval flips to verifying the CLI invocation
  rather than the manual mkdir/Write fallback.

Failure modes this scenario guards:
- Auto-creating on a descriptive name that *does* match an existing
  project (must load, not scaffold)
- Picking a non-sequential `xNNN-` (must be max + 1)
- Forgetting the `decisions/` or `notes/` subdir
- Writing tasks.md with placeholder rows (must be empty body)

### Scenario C — no cwd context, no prompt name

Inputs:
- cwd: `<repo>` (repo root)
- prompt: `/launch-project` (no name)

Expected:
- Detection step finds no cwd match and no prompt name
- Returns refusal block:
  - `{ refused: true, reason: "no-project-determinable", details: "cwd is repo root; prompt names no project" }`
- No scaffolding. No reads beyond the cwd / `git rev-parse` probe. No
  prompts to the captain (refusal goes to the calling skill, which
  owns the captain dialogue).

The calling skill (e.g., `/yolo-project`) is then responsible for
asking the captain for a project name and re-invoking `/launch-project`
once with the answer. The retry budget is one — if the second
invocation also refuses, the calling skill returns to the captain
rather than looping further. (`launch-project` itself does not
enforce the bound; it returns a stable refusal shape so the calling
skill can detect and stop.)

Failure modes this scenario guards:
- Auto-creating a "default" project (e.g., always falling back to
  `x000-yolo-project`) on ambiguous input — forbidden
- Prompting the captain inline (loader, not router — refusal must be
  returned to the calling skill)
- Returning a non-stable refusal shape that the calling skill can't
  parse to enforce the one-shot retry bound

### Scenario D — repeated invocation in same conversation

Inputs (sequence within a single conversation):
1. First call: cwd `<repo>/docs/x000-yolo-project/`, prompt empty →
   Scenario A behavior; metadata returned with `created: false`
2. Second call (later in same conversation): same cwd, prompt empty →
   the calling skill (e.g., `/create-spike`) re-invokes
   `/launch-project` as a precondition for a new chapter

Expected:
- Second call performs the **same work** as the first: re-reads README,
  tasks.md, decisions/, notes/; returns the same metadata block (or
  updated counts if files have changed in the interim)
- No filesystem marker is checked, written, or consulted
- No "no-op" short-circuit lives inside `launch-project`

Idempotency in this conversation lives in the calling skill — it may
remember the prior load and skip the second `/launch-project` call
entirely if it knows nothing has changed. That short-circuit is the
calling skill's concern, not `launch-project`'s. On session resume
(new conversation), the cwd-derived re-read is the correct behavior.

Failure modes this scenario guards:
- Writing a filesystem marker (`~/.agents/state/active-project` or
  similar) to enforce idempotency — forbidden per the captain's
  decision; aligns with the filesystem-derived-state rule
- Adding a no-op detection inside `launch-project` (e.g., checking
  whether the conversation has loaded this project before) —
  short-circuiting is the calling skill's job, not `launch-project`'s
- Refusing on the second call because some "already loaded" guard
  fires (must re-load cleanly every invocation)

## Pass criteria

1. **cwd-first resolution** — when cwd is inside an existing project,
   that project resolves regardless of prompt content. Resolving from
   prompt while cwd points at a different project = fail.
2. **Loads all canonical files** — for an existing project, the
   metadata reflects README + tasks.md + decisions/ + notes/ + open
   spikes/plans inventory. Skipping any of these = fail.
3. **Scaffolds the canonical layout for new projects** — `decisions/`
   and `notes/` exist; README has the five canonical headings;
   tasks.md has the three section headings; both files have empty
   bodies (no placeholder rows). Missing subdirs or stub content =
   fail.
4. **Refusal on no-project-determinable** — Scenario C returns the
   refusal shape, does not auto-create, does not prompt the captain
   inline. Auto-creation or inline prompting = fail.
5. **No filesystem marker** — no file is written under `~/.agents/`,
   `.claude/state/`, or any equivalent path. The skill does not check
   for or consult any such marker. Writing or consulting one = fail.
6. **Re-load on repeat invocation** — Scenario D's second call
   re-reads project files and returns metadata; does not short-circuit
   internally. Returning a "no-op, already loaded" without re-reading
   = fail.
7. **Stable refusal shape** — refusal block carries `refused: true`,
   a `reason` from the documented enum (`no-project-determinable` |
   `ambiguous-descriptive-name`), and a short `details` string. Free-
   form refusal text the calling skill can't parse = fail.
8. **No tasks.md writes from launch-project** — even on scaffold,
   `tasks.md` is seeded once and never updated by this skill again.
   Lifecycle skills own `tasks.md` updates. Any subsequent edit from
   `launch-project` = fail.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Skill body authored from
  Ch5's body skeleton (`docs/x000-yolo-project/p01-agent-skills-toolkit/05-lifecycle-and-routers.md:178-213`)
  with the captain's idempotency decision applied (no filesystem
  marker; re-derive from cwd on session resume). The earlier spike
  Ch4 wording (`~/.agents/state/active-project` marker) is explicitly
  rejected in the body's hard-rules section. Scaffold step documents
  both the preferred future path (`yolo new project <name>` once the
  CLI lands in Phase 1.C) and the current Bash + Write fallback.
  Four eval scenarios per Ch5: cwd inside existing / prompt naming
  non-existent / no cwd context + no prompt / repeated invocation.
  Pending live exercise once `/yolo-project` and at least one
  lifecycle skill consume the loader end-to-end.
