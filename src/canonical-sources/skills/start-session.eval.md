# Eval brief: start-session skill (refresh)

**Task**: T1B2.06

## Contract

Session orientation router at `.claude/skills/start-session/SKILL.md`. Detects
worktree state via `git rev-parse --show-toplevel`, identifies the active
project from cwd or worktree name (`docs/xNNN-<name>/`), summarizes recent
work from filesystem-derived state (rNN- files, recent commits), and suggests
the most likely next step. Reads tasks.md for captain-facing milestone summary
but **derives iteration state from rNN- file presence**, not tasks.md (per
d09). Never auto-executes the suggestion — waits for the captain to confirm.
Tools: `Read, Glob, Grep, Bash`. Bash for git inspection and worktree
detection; no writes; no Dispatch.

A successful run (a) detects worktree presence and surfaces the worktree name,
(b) identifies project context from cwd or worktree slug, (c) lists open
spike/plan dirs and reads the most recent rNN- file's body header for
iteration / focus, (d) distinguishes in-flight (recent commits) from stale
(no recent commits) worktrees, (e) suggests resume via the right lifecycle
skill (`/create-spike`, `/create-plan`) when an unfinished iteration exists,
(f) waits for captain direction before acting.

## Eval scenarios

Static evaluation — describe expected briefing shape per input; no live
captain dialogue required.

### Scenario A — master, no in-flight worktree

Input: cwd is repo root on master branch. No `.claude/worktrees/` entries
contain in-flight work. `docs/x000-yolo-project/` exists with a partially
checked tasks.md (some chapters done, some open).

Expected flow:
- `git rev-parse --show-toplevel` returns the main checkout path; not in a
  worktree.
- cwd is repo root — not inside a `docs/xNNN-` dir — so no project context
  derives from cwd alone. Skill reads `docs/AGENTS.md` (or falls back to
  `docs/CLAUDE.md`) and runs `git log --oneline -10` against master.
- Briefing names the docs root summary, the last 10 commits, and asks
  "what would you like to work on?"
- No `/create-spike` or `/create-plan` resume suggestion (no rNN- files in
  any open project).
- Skill exits without dispatching.

Failure mode this scenario guards: assuming a project is loaded just because
`docs/x000-yolo-project/` exists. Project context derives from cwd or
worktree name, not from disk presence.

### Scenario B — worktree with active validation (in-flight)

Input: cwd is `.claude/worktrees/worktree-p01-foundation-hooks/`. Inside
`docs/x000-yolo-project/s01-harness-conversion/` there are
`r01-architecture.md` and `r02-clarity.md` from iter 2 of ch3 validation
(expected batch size 4). Most recent commit is from earlier today and touches
project paths.

Expected flow:
- `git rev-parse --show-toplevel` returns a path containing
  `.claude/worktrees/`. Worktree name `worktree-p01-foundation-hooks` is
  surfaced.
- Project slug `x000-yolo-project` resolves from the worktree topic /
  active path. cwd is also inside the project dir.
- Skill reads README + tasks.md, runs `git log --oneline -10 -- docs/x000-yolo-project`.
- Skill lists open spike dirs; finds `s01-harness-conversion/` with two
  rNN- files. Reads the most recent (`r02-clarity.md`) header to identify
  `iter 2 — clarity reviewer`.
- Suggests: "Resuming /create-spike for ch3, iter 2 — 2 of 4 reviewers
  complete." Recent commit confirms in-flight (not stale).
- Skill waits for captain direction. No `/create-spike` invocation lands
  before captain confirms.

Failure mode this scenario guards: missing the worktree-name → project-slug
inference; defaulting to "no project loaded" while inside a `worktree-pNNN-`
directory; auto-dispatching `/create-spike` without confirmation.

### Scenario C — fresh repo, no project context

Input: cwd is the repo root. No `docs/xNNN-` projects exist (or only an
empty placeholder). No worktrees in flight. Recent git log is sparse
(initial commits only).

Expected flow:
- `git rev-parse --show-toplevel` returns the main checkout; not in a
  worktree.
- No project context derives from cwd (no `docs/xNNN-` ancestor) or worktree.
- Skill reads `docs/AGENTS.md` if present, otherwise `docs/CLAUDE.md`,
  summarizes the docs root in one or two sentences, and runs
  `git log --oneline -10`.
- Briefing names the empty / fresh state, surfaces the docs-root one-liner,
  and asks "what would you like to work on? (no project loaded)".
- Skill exits without suggesting a resume.

Failure mode this scenario guards: the skill inventing a project context
from the docs root contents, or refusing to brief because there's no project.

### Scenario D — stale worktree with old rNN- files

Input: cwd is `.claude/worktrees/worktree-p015-defunct/`. Inside the
worktree, `docs/x000-yolo-project/s01-harness-conversion/` has
`r01-architecture.md` from 2026-04-22. No commits in the worktree since
2026-04-23. Today is 2026-05-09 (16 days stale).

Expected flow:
- `git rev-parse --show-toplevel` returns the worktree path; worktree name
  `worktree-p015-defunct` surfaced.
- Project slug resolves to `x000-yolo-project`. Skill reads README +
  tasks.md, runs `git log --oneline -10 -- docs/x000-yolo-project`.
- Skill lists open spike dirs; finds `s01-harness-conversion/` with one
  rNN- file. Reads the file header to identify iteration / focus.
- Cross-references rNN- file mtime (2026-04-22) and most recent commit
  date (2026-04-23) against today (2026-05-09). Detects staleness.
- Briefing surfaces the staleness explicitly: "rNN- files from 2026-04-22,
  no commits since — resume or abandon?" Does NOT default to suggesting
  resume.
- Skill waits for captain direction.

Failure mode this scenario guards: silent default-to-resume on a stale
tree the captain has abandoned. Stale signals must be a captain-facing
decision.

## Pass criteria

For each scenario, the skill must:

1. **Detect worktree state** — `git rev-parse --show-toplevel` is checked
   first; worktree path detection (presence of `.claude/worktrees/` in
   path) drives the worktree-name surface in the briefing. Skipping this
   = fail.
2. **Identify project context from cwd OR worktree name** — both sources
   considered; not just cwd. A worktree like `worktree-p01-foundation-hooks`
   while cwd is at the worktree root must still resolve a project slug
   when one is encoded. Defaulting to "no project loaded" inside a clearly
   labeled worktree = fail.
3. **Read filesystem for iteration state** — rNN- files are listed and the
   most recent file's header is read to identify iteration / focus. Reading
   tasks.md instead = fail (per d09).
4. **Surface staleness explicitly when relevant** — Scenario D's rNN- files
   from days ago + no recent commits must produce a "resume or abandon?"
   prompt, not a default-resume suggestion. Silent default-resume = fail.
5. **Suggest resume via the lifecycle skill** — Scenario B's in-flight
   iteration produces a suggestion naming `/create-spike` (or `/create-plan`
   for plan chapters) with the iteration / batch context. Generic "want to
   keep going?" without the skill name = fail.
6. **Never auto-execute** — across all scenarios, the skill briefs and
   stops; no `/create-spike`, `/create-plan`, `/write-doc`, or any other
   slash-skill invocation lands before the captain confirms direction.
   Auto-execution = fail.
7. **Briefing is concise** — 5–10 lines for the captain-facing summary.
   Multi-paragraph dumps = fail.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Skill body refreshed from p01
  Ch5:215-261 with worktree detection, xNNN- project structure, rNN-
  file inspection per d09 (filesystem-derived resumption). Four scenarios
  cover master / in-flight worktree / fresh repo / stale worktree —
  matching Ch5's eval matrix. Pending live evaluation against real
  worktree states once Phase 1.D lands docs/AGENTS.md (until then the
  skill falls back to docs/CLAUDE.md).
