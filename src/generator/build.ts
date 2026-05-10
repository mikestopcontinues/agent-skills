/**
 * Build entrypoint — load the canonical sources and emit the per-harness
 * bundles to `dist/bundles/`.
 *
 * Run: `pnpm build` (or `node src/generator/build.ts`).
 * Optional arg: a single harness id to limit the build (`claude-code`).
 */
import { resolve } from 'node:path';
import { loadCanonicalSources } from './loadCanonicalSources.ts';
import { emitClaudeCodeFromPackage } from './emit/claudeCode.ts';

const repoRoot = resolve(import.meta.dirname, '../..');
const bundlesRoot = resolve(repoRoot, 'dist/bundles');
const only = process.argv[2];

const sources = await loadCanonicalSources();

if (!only || only === 'claude-code') {
  const out = resolve(bundlesRoot, 'claude-code');
  emitClaudeCodeFromPackage(sources, out);
  console.log(`build: claude-code → ${out} (${sources.skills.length} skills, ${sources.agents.length} agents, ${sources.hooks.length} hooks)`);
}

// emitCodex / emitOpenCode land next.
