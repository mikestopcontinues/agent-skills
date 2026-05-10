# agent-skills

The harness-neutral engineering toolkit. One TypeScript authoring surface;
per-harness bundle emit (Claude Code, Codex, OpenCode).

## Identity

This repo *produces* the toolkit. Consumers (openspike and others) *install*
it. Keep that boundary clean: nothing here depends on a consumer; consumers
depend only on the emitted bundles.

## Canonical-sources discipline

- **One file per artifact** under `src/canonical-sources/{skills,agents,hooks}/`.
  Each exports a single `define*(...)` call as a named `export` the generator
  discovers by glob. The filesystem is the registry — adding an artifact means
  adding a file; there is no import list to update.
- **The `define*` factories validate at module load.** TypeScript catches shape
  errors at compile time (`alignSchema` keeps each type and its Valibot schema
  in sync); the schema catches anything dynamic when the module loads. A
  malformed canonical source fails fast.
- **Bodies are transcribed verbatim.** A skill's markdown body, an agent's
  prompt, a hook's bash handler — these are lifted byte-for-byte from the Phase 1
  `.claude/` source. The snapshot test (`tests/snapshots/phase1-baseline/`)
  fails on drift.
- **Canonical keys are camelCase.** Frontmatter dialects (kebab-case for
  Claude Code / Codex) are an emit-time concern; the generator transforms.

## Snapshot-test contract

`tests/snapshots/phase1-baseline/` is a literal copy of the openspike `.claude/`
tree at tag `phase1-baseline-2026-05-10` (see `SOURCE.md` there for the SHA).
`pnpm run sync-baseline` refreshes it from that tag. The Claude Code emitter's
output is diffed against this copy: skill bodies / agent prompts / hook handlers
must match byte-exact; frontmatter ordering, quoting, and trailing newlines are
normalized before diff (see `tests/snapshot-normalize.ts`). No normalization is
ever applied to the byte-exact fields.

## Repo conventions

- pnpm; Node ≥ 24 (native `.ts` execution — write `.ts` extensions in relative
  imports); TypeScript strict, `erasableSyntaxOnly` (no enums, no `namespace`,
  no parameter properties — only erasable syntax, so the sources run unmodified
  under Node).
- ESLint flat config; `pnpm run check` (type + lint + test) is the commit gate.
- Tests colocated (`<file>.test.ts`) or under `tests/`.
- `valibot` for runtime validation; a local `alignSchema` (vendored from
  openspike) for compile-time type↔schema sync.
- Commit discipline: many small commits, each leaving the repo green; messages
  explain "why".

## More

- The plan: `openspike/docs/x000-yolo-project/p01-agent-skills-toolkit/`
  (chapters 8–11 cover this repo).
- The decision that agents are personas (not task-bots):
  `openspike/docs/x000-yolo-project/decisions/d15-agents-are-personas-not-task-bots.md`.
