import * as v from 'valibot';
import { alignSchema } from './valibot.ts';

/**
 * The per-harness filename each harness reads its repo-level context from.
 * Claude Code → `CLAUDE.md`; Codex and OpenCode → `AGENTS.md`. The generator
 * emits the same `content` to whichever filename(s) the harness expects.
 */
export interface ProjectContextHarnessFilenames {
  claudeCode: 'CLAUDE.md';
  codex: 'AGENTS.md';
  opencode: 'AGENTS.md';
}

/**
 * The repo-root context template the toolkit ships for consumers to install
 * into their `docs/`. A singleton — one project-context per toolkit.
 */
export interface ProjectContextDef {
  name: 'docs-root-context';
  description: string;
  /** The markdown template body — transcribed verbatim from the Phase 1 source. */
  content: string;
  harnessFilenames: ProjectContextHarnessFilenames;
}

export const ProjectContextDefSchema = alignSchema<ProjectContextDef>()(
  v.object({
    name: v.literal('docs-root-context'),
    description: v.pipe(v.string(), v.minLength(1)),
    content: v.pipe(v.string(), v.minLength(1)),
    harnessFilenames: v.object({
      claudeCode: v.literal('CLAUDE.md'),
      codex: v.literal('AGENTS.md'),
      opencode: v.literal('AGENTS.md'),
    }),
  }),
);
