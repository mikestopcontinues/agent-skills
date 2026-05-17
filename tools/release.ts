/**
 * Bump `package.json#version`, rebuild bundles, and stage the result.
 *
 * Why: CC's `plugin update <name>` is a no-op when the version field hasn't
 * changed. The pre-1.0 policy (see CONTRIBUTING.md "Versioning policy") is to
 * bump on every commit that changes plugin-loaded content, so consumers'
 * `claude plugin update` actually picks up the change.
 *
 * Usage:
 *   pnpm run release           # patch (0.1.N → 0.1.N+1)
 *   pnpm run release patch
 *   pnpm run release minor     # 0.1.N → 0.2.0
 *   pnpm run release major     # 0.1.N → 1.0.0 (use sparingly pre-1.0)
 *
 * Effect:
 *   1. Bumps package.json#version
 *   2. Runs `pnpm build` to regenerate bundles + marketplace files
 *   3. Stages package.json + bundle dirs for you
 *
 * Leaves you to write the commit message — release is a manual signal.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const pkgPath = resolve(repoRoot, 'package.json');

type BumpKind = 'patch' | 'minor' | 'major';

function fail(message: string): never {
  console.error(`release: ${message}`);
  process.exit(1);
}

const kind = (process.argv[2] ?? 'patch') as BumpKind;
if (kind !== 'patch' && kind !== 'minor' && kind !== 'major') {
  fail(`unknown bump kind '${kind}' — expected patch | minor | major`);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string; [k: string]: unknown };
const match = pkg.version.match(/^(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/);
if (!match) fail(`version ${pkg.version} is not parseable as semver MAJOR.MINOR.PATCH`);
const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]);

const next =
  kind === 'major' ? `${major + 1}.0.0` :
  kind === 'minor' ? `${major}.${minor + 1}.0` :
  `${major}.${minor}.${patch + 1}`;

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`release: package.json version ${match[0]} → ${next}`);

execFileSync('node', ['generator/build.ts'], { cwd: repoRoot, stdio: 'inherit' });

execFileSync('git', ['add', 'package.json', 'claude/', 'codex/', 'opencode/', '.claude-plugin/', '.agents/'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
console.log(`release: staged package.json + regenerated bundles. Write your commit message and commit.`);
