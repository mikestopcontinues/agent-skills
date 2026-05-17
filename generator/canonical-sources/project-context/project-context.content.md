# Docs Directory

How to navigate and maintain the `docs/` directory under this toolkit's
conventions. Skills read this file to understand the project's documentation
shape; the captain reads it to find things.

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `xNNN-<project>/` | Load-bearing project directories — own their lifecycle, hold spikes / plans / decisions / notes scoped to that project |
| `notes/` | Cross-project notes on unresolved decisions and working knowledge |
| `decisions/` | Cross-project decisions (rare; usually promoted from archived projects) |
| `conventions/` | Project conventions, one rule per file |

Projects are the unit of work. Spikes (`sNN-`) and plans (`pNN-`) live
**inside** a project; their numbers are project-scoped (2-digit, restart per
project). Reviews (`rNN-`) colocate with the doc they review. Decisions
(`dNN-`) live in `<project>/decisions/` (project-scoped) or top-level
`docs/decisions/` (cross-project). The conventions index is in
[`AGENTS.md`](AGENTS.md).

## Key Resources

- **Conventions index**: [`AGENTS.md`](AGENTS.md) — canonical entry point
- **Toolkit skills**: verb-noun workflow skills installed by this toolkit
- **`yolo` CLI**: scaffolds projects, spikes, plans, chapters, reviews,
  decisions, and notes — and assigns the next free number

## Doc Scripts

All new docs are scaffolded with the `yolo` CLI — hooks enforce this, so a
direct `Write` of a new doc file is blocked.

```bash
yolo new project <name>                       # Scaffold a project
yolo new spike <project> <name>               # Scaffold a spike inside a project
yolo new plan <project> <name>                # Scaffold a plan inside a project
yolo new note <project|--global> <name>       # Scaffold a note
yolo new decision <project|--global> <name>   # Scaffold a decision
yolo new chapter <project> <spike-or-plan> <name>   # Scaffold a chapter
yolo new review <project> <spike-or-plan> <focus>   # Scaffold a review
doc-check-links.sh                            # Find broken cross-references
```

**Always use `yolo new`** — it assigns numbers and prevents collisions.
Project numbers are 3-digit and globally unique under `docs/`. Spike, plan,
review, and decision numbers are 2-digit and scoped to the containing
project. Cross-project decisions number independently under
`docs/decisions/`. Default output is JSON (skill bodies parse `filePath`);
pass `--human` for readable output during manual debugging.

## Finding Things

1. Check [`AGENTS.md`](AGENTS.md) for the convention index
2. Browse `docs/xNNN-<project>/` for active project work
3. Browse `docs/notes/` for cross-project notes

## Writing Docs

- **One topic per file**. If a doc grows beyond ~250 lines, split it into a
  subdirectory with a `README.md`
- **Soft cap**: ~500 lines per file. Split into multiple chapters if it gets
  much longer
- **Use relative links** between docs for cross-references
- **Use `yolo new`** to scaffold new docs
- **Numbering**: `yolo new` auto-assigns. Never manually pick a number. Notes
  and conventions are not numbered.
- **Prefixes**: `xNNN-` projects (3-digit, global), `sNN-` spikes / `pNN-`
  plans / `rNN-` reviews / `dNN-` decisions (2-digit, project-scoped). Notes
  and conventions use descriptive kebab-case filenames with no prefix.
- **Diagrams**: Use Mermaid for diagrams (it renders natively in GitHub and
  most markdown viewers).
- **Types in docs**: When showing schemas to explain types, prefer TypeScript
  `interface`/`type` syntax with JSDoc or inline comments for constraints.

### Skill Workflows

Each skill is self-contained — invoke it directly for the workflow you need.

- **`/write-code`** — frames all code work (plan execution, bug fixes,
  refactoring) with worktree isolation, incremental commits, and quality gates

**Lifecycle skills** (own their full sequence including review, revision):

- **`/create-spike`** — research lifecycle (5 reviews minimum)
- **`/create-plan`** — plan creation lifecycle (5 reviews minimum)
- **`/create-note`** — living note for unresolved decisions and working knowledge
- **`/create-decision`** — capture a locked decision as a numbered `dNN-` file
- **`/archive-project`** — condense a project to a single archived `README.md`
- **`/execute-plan`** — per-phase plan execution with per-phase validation

**Single-action skills**: `write-doc`, `review-doc`, `revise-doc`,
`triage-feedback`, `process-feedback`, `validate-doc`, `validate-code`,
`review-code`, `lock-decisions`, `write-convention`, `grill-me`,
`launch-project`, `yolo-project`, `start-session`.

### Session Start

At the beginning of each session, invoke the `start-session` skill.

## Project Format (`xNNN-<project>/`)

Each project is a numbered directory with the `xNNN-` prefix. Projects are
the unit of work — they own their lifecycle, scope, spikes/plans, and
decisions. Lifecycle is brief (a few weeks at most), then archives via
`/archive-project`.

```text
xNNN-project-name/
  README.md                 # Charter (one-liner, status, scope, success criteria)
  tasks.md                  # Operational checklist
  decisions/
    d01-name.md             # Project-scoped decisions
  notes/
    findings-foo.md         # Project-internal working artifacts
  sNN-research-spike/       # 0+ spikes
    README.md               # Spike index
    01-chapter.md
    02-chapter.md
    r01-accuracy.md         # Reviews
    r02-architecture.md
  pNN-tech-spec/            # 0+ plans
    README.md               # Plan index
    01-phase.md
    02-phase.md
    r01-architecture.md
```

## Spike Format (`xNNN-<project>/sNN-<topic>/`)

```text
sNN-topic-name/
  README.md              # Overview, core questions, scope
  01-subtopic.md         # Numbered content files
  02-subtopic.md
  ...
  NN-recommendations.md  # Final recommendations (last numbered chapter)
  r01-accuracy.md        # Reviews (5 minimum across the validate-loop)
  r02-architecture.md
```

## Plan Format (`xNNN-<project>/pNN-<plan>/`)

```text
pNN-plan-name/
  README.md              # Spec overview, status table
  01-subtopic.md         # Numbered detail files
  02-subtopic.md
  ...
  rNN-review.md          # Review file(s) (5 minimum)
```

The README.md should include a status table with phases and completion
state, a package layout (if applicable), a design-values alignment check,
and links to source research.

## Note Format (`notes/`)

Notes are flat files — no subdirectories, no numbered chapters, no mandatory
reviews. Each note is a single markdown file with descriptive kebab-case
naming. Project-internal notes live under `<project>/notes/`; cross-project
notes live at `docs/notes/`. Notes are **living documents** — updated over
time. When a note grows beyond ~500 lines or becomes a research question,
promote it to a spike.

## Decision Format (`<project>/decisions/`, `docs/decisions/`)

Decisions are numbered files with the `dNN-` prefix. Frontmatter is minimal
and stable: `status` (`active | archived`), `blocks` (list of `dNN` refs
that depend on this), `supersedes` (list of `dNN` refs replaced).
Authorship and timestamps come from git.

## Review Files

Review files use the `rNN-{focus}.md` naming convention and live alongside
the doc they review. Standard focuses: `accuracy`, `architecture`, `depth`,
`dx`, plus a fifth (`scope`, `comprehensiveness`, `security`, …). Both
spikes and plans require **5 reviews minimum**.
