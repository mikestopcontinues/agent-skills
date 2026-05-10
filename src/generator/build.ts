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
import { emitCodexFromPackage } from './emit/codex.ts';
import { emitOpenCodeFromPackage } from './emit/opencode.ts';

const repoRoot = resolve(import.meta.dirname, '../..');
const bundlesRoot = resolve(repoRoot, 'dist/bundles');
const only = process.argv[2];

const sources = await loadCanonicalSources();
const counts = `${sources.skills.length} skills, ${sources.agents.length} agents, ${sources.hooks.length} hooks`;

if (!only || only === 'claude-code') {
  const out = resolve(bundlesRoot, 'claude-code');
  emitClaudeCodeFromPackage(sources, out);
  console.log(`build: claude-code → ${out} (${counts})`);
}

if (!only || only === 'codex') {
  const out = resolve(bundlesRoot, 'codex');
  emitCodexFromPackage(sources, out);
  console.log(`build: codex → ${out} (${counts})`);
}

if (!only || only === 'opencode') {
  const out = resolve(bundlesRoot, 'opencode');
  emitOpenCodeFromPackage(sources, out);
  console.log(`build: opencode → ${out} (${counts})`);
}
