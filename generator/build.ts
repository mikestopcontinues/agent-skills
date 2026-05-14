/**
 * Build entrypoint — load the canonical sources and emit the per-harness
 * bundles (`claude/`, `codex/`, `opencode/`) and both top-level marketplace
 * manifests (`.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`)
 * at the repo root. The committed bundle dirs are the multi-marketplace
 * deliverable — pointing any of `claude plugin marketplace add`,
 * `codex plugin marketplace add`, or `npx skills add` at the repo root just
 * works.
 *
 * Run: `pnpm build` (or `node generator/build.ts`).
 * Optional arg: a single harness id to limit the per-harness emit
 * (`claude` | `codex` | `opencode`). Marketplace files are always (re)written.
 */
import { resolve } from 'node:path';
import { loadCanonicalSources } from './loadCanonicalSources.ts';
import { emitClaudeCodeFromPackage } from './emit/claudeCode.ts';
import { emitCodexFromPackage } from './emit/codex.ts';
import { emitOpenCodeFromPackage } from './emit/opencode.ts';
import { emitMarketplacesFromPackage } from './emit/marketplaces.ts';

const repoRoot = resolve(import.meta.dirname, '..');
const only = process.argv[2];

const sources = await loadCanonicalSources();
const counts = `${sources.skills.length} skills, ${sources.agents.length} agents, ${sources.hooks.length} hooks`;

if (!only || only === 'claude') {
  const out = resolve(repoRoot, 'claude');
  emitClaudeCodeFromPackage(sources, out);
  console.log(`build: claude → ${out} (${counts})`);
}

if (!only || only === 'codex') {
  const out = resolve(repoRoot, 'codex');
  emitCodexFromPackage(sources, out);
  console.log(`build: codex → ${out} (${counts})`);
}

if (!only || only === 'opencode') {
  const out = resolve(repoRoot, 'opencode');
  emitOpenCodeFromPackage(sources, out);
  console.log(`build: opencode → ${out} (${counts})`);
}

// Marketplace manifests are derived from `sources.skills`, so they must stay in
// sync with whatever was just (re)emitted into `claude/` / `codex/`. Always
// rewrite both, regardless of the per-harness filter.
const marketplaces = emitMarketplacesFromPackage(sources, repoRoot);
for (const file of marketplaces) console.log(`build: marketplace → ${file}`);
