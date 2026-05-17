# agent-skills

The harness-neutral engineering toolkit. One TypeScript authoring surface;
per-harness bundle emit (Claude Code, Codex, OpenCode).

## Identity

This repo *produces* the toolkit. Consumers (openspike and others) *install*
it. Keep that boundary clean: nothing here depends on a consumer; consumers
depend only on the emitted bundles.

## Canonical-sources discipline

- **One file per artifact** under `generator/canonical-sources/{skills,agents,hooks}/`.
  Each exports a single `define*(...)` call as a named `export` the generator
  discovers by glob. The filesystem is the registry — adding an artifact means
  adding a file; there is no import list to update.
- **The `define*` factories validate at module load.** TypeScript catches shape
  errors at compile time (`alignSchema` keeps each type and its Valibot schema
  in sync); the schema catches anything dynamic when the module loads. A
  malformed canonical source fails fast.
- **Bodies live in sidecars.** A skill's markdown body, an agent's prompt, a
  hook's bash handler — each is a sibling file (`<name>.md`, `<name>.sh`)
  loaded via `loadText(import.meta.url, '<name>.md')` in the corresponding
  `define*` call. Authoring the body is text editing, not TypeScript editing.
- **Canonical keys are camelCase.** Frontmatter dialects (kebab-case for
  Claude Code / Codex) are an emit-time concern; the generator transforms.

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

- The originating plan: `openspike/docs/x000-yolo-project/p01-agent-skills-toolkit/`
  (chapters 8–11 cover this repo). Historical — captures the design rationale.
- The decision that agents are personas (not task-bots):
  `openspike/docs/x000-yolo-project/decisions/d15-agents-are-personas-not-task-bots.md`.
- `CONTRIBUTING.md` — how to add or modify a skill / agent / hook end-to-end.
