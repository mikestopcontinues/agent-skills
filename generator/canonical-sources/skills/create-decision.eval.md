# Eval brief: create-decision skill

**Task**: T1B1.04

## Contract

Lightweight decision-capture singleton. Inputs: a kebab-case decision name,
the captain's answer body, an optional scope (`<project-id>` default,
`--global` for top-level), and an optional `supersedes: [dNN, ...]` list.
Output: one `<scope>/decisions/dNN-<name>.md` file written via the
scaffold CLI (`doc-create.sh decision …`, soon `yolo new decision …`),
populated with the canonical schema (`status`, `blocks`, `supersedes` in
frontmatter; `## Question / ## Context / ## Options / ## Recommendation /
## Decision` body). When `supersedes` is set, the named prior decisions in
the same scope flip from `status: active` to `status: archived` in the
same operation. Tools: `Read, Edit, Write, Glob, Grep, Bash`. Same
project-or-global fallback as `create-note` — does NOT invoke
`/launch-project`.

## Eval scenarios

Static eval — describes inputs and expected file states. No live dispatch.

### Scenario A — fresh decision in a project (no supersedes)

Inputs:
- name: `oauth-refresh-strategy`
- scope: project context loaded for `x000-yolo-project`
- supersedes: none
- answer body: 2-paragraph captain answer locking refresh strategy

Expected:
- New file at `docs/x000-yolo-project/decisions/d{next}-oauth-refresh-strategy.md`
  where `{next}` is one greater than the highest existing `dNN-` in that dir
- Frontmatter: `status: active`, `blocks: []`, `supersedes: []`
- All five body sections present; `## Decision` contains the captain's body
- No other decision file modified
- No `docs/decisions/` file created

### Scenario B — superseding a prior project decision

Inputs:
- name: `canonical-schema-format-revisited`
- scope: `x000-yolo-project` (loaded)
- supersedes: `[d05]`
- answer body: captain locks a revised approach

Expected:
- New file `docs/x000-yolo-project/decisions/d{next}-canonical-schema-format-revisited.md`
- New file's frontmatter: `status: active`, `supersedes: [d05]`
- `docs/x000-yolo-project/decisions/d05-canonical-schema-format.md` frontmatter
  flipped from `status: active` to `status: archived` — body untouched
- Both edits land as one logical operation (skill does not write the new
  decision and leave d05 active)
- Captain brief mentions d05 archived

### Scenario C — project context already loaded, scope inferred

Inputs:
- name: `validate-loop-iteration-cap`
- scope: not explicitly passed; project `x000-yolo-project` is the loaded context
- supersedes: none
- answer body: short captain answer

Expected:
- File lands at `docs/x000-yolo-project/decisions/d{next}-validate-loop-iteration-cap.md`
- Skill does NOT call `/launch-project` even though scope wasn't explicit
- Skill does NOT default to `docs/decisions/` — project context wins
- Frontmatter: `status: active`, supersedes empty

### Scenario D — top-level decision via `--global`

Inputs:
- name: `cross-project-doc-link-style`
- scope: `--global`
- supersedes: none
- answer body: cross-cutting captain answer affecting every project

Expected:
- File lands at `docs/decisions/d{next}-cross-project-doc-link-style.md`
  where `{next}` is one greater than the highest existing `dNN-` in
  `docs/decisions/` (independent of any project-scope numbering)
- No file created under any `docs/x*-*/decisions/`
- Frontmatter: `status: active`, `blocks: []`, `supersedes: []`
- Even if a project context happens to be loaded, `--global` overrides

## Pass criteria

1. **Path correctness** — every scenario lands the file at exactly the
   expected scope; project-vs-global never bleeds across scenarios.
2. **CLI-driven numbering** — skill never hand-picks `dNN`; the scaffold
   CLI assigns it; numbering is per-scope sequential.
3. **Schema fidelity** — every output has the canonical frontmatter
   (`status`, `blocks`, `supersedes`) and all five body sections.
4. **Supersedes atomicity** — Scenario B archives d05 in the same
   operation as writing the new decision; archived decision body is
   untouched; the new decision's `supersedes: [d05]` matches.
5. **No launch-project** — Scenario C never triggers `/launch-project`;
   missing-project-context falls back to asking the captain, not
   bootstrapping a new project.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Skill body authored from p01
  Ch4 contract and the project-organization decision schema. Supersedes
  mechanics (active → archived flip on prior, body untouched) encoded
  explicitly with the "no half-superseded state" stop condition. Project-
  or-global fallback mirrors create-note (no launch-project invocation).
  Four scenarios cover: fresh decision, superseding, implicit project
  scope, explicit `--global`. Pending live dispatch once the lifecycle
  smoke check at the end of Phase 1.B exercises lock-decisions →
  create-decision end-to-end.
