---
name: start-session
description: "Session orientation — detect worktree state, identify the active project (xNNN-), summarize where work was left off, and suggest the most likely next step. Invoked at the start of every new conversation; waits for captain direction before acting."
tools: Read, Glob, Grep, Bash
---

Session orientation router. Detects whether the captain is in a worktree or on
master, identifies the active project (if any), summarizes recent work from
filesystem-derived state, and suggests the most likely next step. Never
auto-executes the suggestion — waits for the captain to confirm direction.

State derives from the filesystem (rNN- files, dNN- files, recent commits, git
worktree path) per the resumption rule: tasks.md is captain-facing milestone
tracking, not the source of truth for iteration state.

## When to Use

- At the beginning of every new conversation
- When the captain asks "where were we?" / "what's the state?" / "orient me"
- When another skill needs project context loaded but none is set

## When NOT to Use

- Captain wants to design / stress-test something → `/grill-me`
- Captain wants to write a doc → `/write-doc`
- Captain wants to apply review feedback → `/revise-doc`

## Process

### 1. Detect Worktree State

Run `git rev-parse --show-toplevel`. Compare the path against
`.claude/worktrees/`:

- Path contains `.claude/worktrees/<name>` → captain is in a worktree. Read the
  worktree directory name; by convention it starts with `worktree-` and often
  encodes the active plan (`worktree-pNNN-<topic>`) or topic.
- Otherwise → captain is on the main checkout. Orient against master state.

Worktree presence is a strong signal that work is in flight. Surface the
worktree name in the briefing even when no project context is loaded.

### 2. Identify Project Context

Inspect cwd against the project layout:

- cwd inside `docs/xNNN-<name>/` → that project is active. Set `<project>` to
  that directory.
- Worktree name encodes a project slug that resolves to a `docs/xNNN-<name>/`
  directory → that project is active.
- Otherwise → no project context loaded.

### 3. Orient — No Project Loaded

When no project is active:

- Read `docs/AGENTS.md` if it exists; otherwise fall back to `docs/CLAUDE.md`.
  Summarize the docs root in one or two sentences.
- Run `git log --oneline -10` (scoped to the current branch) to capture recent
  activity.
- Brief the captain and ask "what would you like to work on?"

Skip to step 5.

### 4. Orient — Project Loaded

When `<project>` is set:

- Read `<project>/README.md` and `<project>/tasks.md` for the captain-facing
  summary (last known milestone, scope, success criteria).
- Run `git log --oneline -10 -- <project>` to capture recent commits scoped to
  the project.
- List open spike and plan directories under `<project>/` (typically
  `<project>/sNN-*/` and `<project>/pNN-*/`). For each open dir, run
  `ls <dir>/r*.md 2>/dev/null` to list any rNN- review files.
- For the most recent rNN- file across all open dirs (highest `NN`, latest
  mtime as tiebreaker): read the file's body header to identify the iteration
  number and reviewer focus (e.g., `iter 2 — architecture reviewer`).
- Cross-reference the rNN- file count against the iteration's expected
  reviewer batch size to estimate progress (e.g., `2 of 4 reviewers complete`).

### 5. Detect Stale or In-Flight Work

Two signals shape the next-step suggestion:

- **In-flight iteration** — rNN- files exist for an unfinished iteration AND
  recent commits (within the last day or two) touch the project. Always
  suggest resume per the lifecycle skill that owns the artifact (e.g.,
  `/create-spike` for spike chapters, `/create-plan` for plan chapters).
  Phrase explicitly: "Resuming /create-spike for ch3, iter 2 — 2 of 4
  reviewers complete." The captain can decline ("no, let's restart" /
  "archive that and start over").
- **Stale worktree** — rNN- files exist but the most recent commit is days
  old or the worktree name no longer matches active priorities. Surface the
  staleness explicitly ("rNN- files from 2026-04-22, no commits since — resume
  or abandon?") and let the captain decide. Do not silently suggest resume
  on a stale tree.

### 6. Brief the Captain

Concise status update (5–10 lines max):

- Worktree state (worktree name if applicable, or "main checkout")
- Project context (project slug, or "no project loaded")
- Where we left off (last commit + iteration state if mid-validation)
- Open issues / decisions pending (if any rNN- files surface them)
- Suggested next step — one primary suggestion, optionally one or two
  alternatives. Use the lifecycle-skill name when the suggestion is a
  resume (`/create-spike`, `/create-plan`, etc.).

### 7. Wait for Direction

Do not auto-execute the suggestion. Even when the next step is unambiguous
(e.g., resuming an iteration mid-batch), the captain confirms before any
work begins.

## Hard rules

- **Never auto-execute the suggestion.** This skill orients and proposes;
  the captain dispatches.
- **Filesystem is the source of truth for iteration state.** Do not infer
  from tasks.md what reviewer batch is in flight; read the rNN- files.
- **Surface stale signals explicitly.** rNN- files with no recent commits are
  a captain-facing decision (resume vs abandon), not a default-resume.
- **Detect worktrees.** A worktree path is a strong work-in-flight signal;
  defaulting to "no project loaded" because cwd isn't in `docs/xNNN-` while
  inside a `worktree-pNNN-` directory is a miss.
- **Keep the briefing short.** The captain has context; the briefing is a
  refresh, not a recap.
