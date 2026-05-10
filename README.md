# @mikestopcontinues/agent-skills

A harness-neutral engineering toolkit — skills, agents, and hooks authored once
in TypeScript, emitted as native plugin bundles for Claude Code, Codex, and
OpenCode.

> **Status:** v0.1 in progress. The canonical TS sources are being transcribed
> from the toolkit's incubation home (`openspike/.claude/`, tag
> `phase1-baseline-2026-05-10`). The generator and per-harness bundles land
> next. See `openspike/docs/x000-yolo-project/p01-agent-skills-toolkit/` for the
> plan.

## What's in here

| Path | Purpose |
|------|---------|
| `src/canonical-sources/` | The authoring surface — `defineSkill` / `defineAgent` / `defineHook` / `defineProjectContext` calls, one file per artifact. The filesystem is the registry. |
| `src/factories/` | The `define*` factories + their `alignSchema`'d types and Valibot schemas. |
| `src/generator/` | Loads the canonical sources and emits per-harness bundles. |
| `src/yolo/` | The `yolo` bash CLI, shipped verbatim in every bundle. |
| `tests/snapshots/phase1-baseline/` | A frozen copy of the Phase 1 `.claude/` end-state; the Claude Code emit is diffed against it. |

## Runtime

Node ≥ 24 (native TypeScript type-stripping — `.ts` files run directly, no
build step for the sources). pnpm for dependency management. The "build" is
running the generator, which emits bundles to `dist/bundles/`.

```bash
pnpm install
pnpm run check     # tsc --noEmit + eslint + vitest
pnpm run build     # run the generator → dist/bundles/{claude-code,codex,opencode}/
```

## Install (per harness)

_Not yet published._ Once v0.1 stabilizes:

- **Claude Code** — `/plugin install mikestopcontinues/agent-skills`
- **Codex** — Codex plugin install
- **OpenCode** — add to `opencode.json` + `bun install`
