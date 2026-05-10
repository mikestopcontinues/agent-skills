/**
 * Pull the Phase 1 `.claude/` baseline from the openspike repo into
 * `tests/snapshots/phase1-baseline/.claude/`.
 *
 * Reads the tag from `tests/snapshots/phase1-baseline/SOURCE.md`. The source
 * repo defaults to a sibling directory (`../openspike` relative to this repo);
 * override with the `OPENSPIKE_REPO` env var.
 *
 * Run: `pnpm run sync-baseline` (or `node scripts/sync-baseline.ts`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const baselineDir = resolve(repoRoot, 'tests/snapshots/phase1-baseline');
const sourceMdPath = resolve(baselineDir, 'SOURCE.md');

function fail(message: string): never {
  console.error(`sync-baseline: ${message}`);
  process.exit(1);
}

if (!existsSync(sourceMdPath)) {
  fail(`missing ${sourceMdPath}`);
}

const sourceMd = readFileSync(sourceMdPath, 'utf8');
const tagMatch = sourceMd.match(/\|\s*Tag\s*\|\s*`([^`]+)`\s*\|/);
if (!tagMatch?.[1]) {
  fail('could not find the `| Tag | `<tag>` |` row in SOURCE.md');
}
const tag = tagMatch[1];

const openspikeRepo = process.env['OPENSPIKE_REPO'] ?? resolve(repoRoot, '../openspike');
if (!existsSync(resolve(openspikeRepo, '.git'))) {
  fail(`source repo not found at ${openspikeRepo} (set OPENSPIKE_REPO to override)`);
}

// Verify the tag exists.
try {
  execFileSync('git', ['-C', openspikeRepo, 'rev-parse', '--verify', `${tag}^{commit}`], {
    stdio: 'pipe',
  });
} catch {
  fail(`tag '${tag}' not found in ${openspikeRepo}`);
}

// Replace the .claude/ copy.
const claudeDest = resolve(baselineDir, '.claude');
rmSync(claudeDest, { recursive: true, force: true });
mkdirSync(baselineDir, { recursive: true });

const tarball = execFileSync('git', ['-C', openspikeRepo, 'archive', '--format=tar', tag, '.claude'], {
  maxBuffer: 64 * 1024 * 1024,
});
execFileSync('tar', ['-x', '-C', baselineDir], { input: tarball });

const sha = execFileSync('git', ['-C', openspikeRepo, 'rev-parse', '--short', tag], {
  encoding: 'utf8',
}).trim();

console.log(`sync-baseline: pulled ${openspikeRepo}@${tag} (${sha}) .claude/ → ${claudeDest}`);
