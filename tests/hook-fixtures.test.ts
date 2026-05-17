/**
 * Per-hook fixture runner — pipes each `<hook>.test/<case>.json` fixture
 * through the canonical `<hook>.sh` handler and asserts the outcome named
 * in `<hook>.test/expected.json`.
 *
 * Fixtures use `__PROJECT_ROOT__` as a stand-in for `$CLAUDE_PROJECT_DIR`;
 * the runner substitutes that token with a per-test tmp directory before
 * piping to the hook. Optional `_setup` blocks in `expected.json` populate
 * the tmp dir with required filesystem state (existing files for overwrite
 * cases, `.claude/worktrees/<name>/` dirs for worktree-aware hooks).
 *
 * Hooks whose behavior depends on dynamic git state (branch-aware) are
 * not yet covered here — they need a per-fixture `git init` setup hook
 * that's outside this runner's current scope. Tracked in CONTRIBUTING.md.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const HOOKS_DIR = resolve(import.meta.dirname, '../generator/canonical-sources/hooks');
const PROJECT_ROOT_TOKEN = '__PROJECT_ROOT__';

interface ExpectedOutcome {
  /** When true, hook must emit a JSON deny payload; when false (or omitted),
   *  hook must not emit any deny output (passthrough). */
  deny?: boolean;
  /** Substring (case-sensitive) that must appear in `permissionDecisionReason`
   *  when `deny: true`. */
  reasonContains?: string;
  /** Files (relative to the tmp project root) to create before piping. Used
   *  for fixtures that test the "file already exists, overwrite is fine"
   *  passthrough branch. */
  createFiles?: string[];
  /** Subdirs (relative to the tmp project root) to create. Used for
   *  worktree-aware hooks that check for `.claude/worktrees/<name>/`. */
  createDirs?: string[];
}

interface ExpectedMap {
  [fixtureName: string]: ExpectedOutcome;
}

/** Normalized outcome shape — `actual` and `want` versions match on green. */
interface OutcomeReport {
  exitCode: number;
  decision: 'deny' | 'passthrough';
  reasonHit: boolean;
}

interface SpawnResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function describeExpected(outcome: ExpectedOutcome): OutcomeReport {
  return {
    exitCode: 0,
    decision: outcome.deny ? 'deny' : 'passthrough',
    reasonHit: outcome.deny ? Boolean(outcome.reasonContains) : true,
  };
}

function describeOutcome(result: SpawnResult, outcome: ExpectedOutcome): OutcomeReport {
  const stdout = result.stdout.trim();
  if (!outcome.deny) {
    return { exitCode: result.status ?? -1, decision: stdout === '' ? 'passthrough' : 'deny', reasonHit: true };
  }
  let parsed: { hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string } };
  try {
    parsed = JSON.parse(stdout) as typeof parsed;
  } catch {
    return { exitCode: result.status ?? -1, decision: 'passthrough', reasonHit: false };
  }
  const decision = parsed.hookSpecificOutput?.permissionDecision === 'deny' ? 'deny' : 'passthrough';
  const reason = parsed.hookSpecificOutput?.permissionDecisionReason ?? '';
  const reasonHit = outcome.reasonContains ? reason.includes(outcome.reasonContains) : true;
  return { exitCode: result.status ?? -1, decision, reasonHit };
}

/** Hooks with a sibling `expected.json` — listed explicitly so a missing
 *  expectations file fails loudly instead of silently skipping the hook. */
const COVERED_HOOKS = ['pre-write-doc', 'verify-worktree-path'] as const;

for (const hookName of COVERED_HOOKS) {
  describe(`hook ${hookName}`, () => {
    const hookDir = join(HOOKS_DIR, hookName);
    const hookScript = join(hookDir, `${hookName}.sh`);
    const fixtureDir = join(hookDir, `${hookName}.test`);
    const expectedPath = join(fixtureDir, 'expected.json');
    const expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as ExpectedMap;
    const fixtures = readdirSync(fixtureDir).filter((f) => f.endsWith('.json') && f !== 'expected.json');

    it('expected.json covers every fixture (no orphans, no extras)', () => {
      const fixtureNames = fixtures.map((f) => f.replace(/\.json$/, '')).sort();
      const expectedNames = Object.keys(expected).sort();
      expect(expectedNames).toEqual(fixtureNames);
    });

    let projectRoot: string;
    beforeEach(() => {
      projectRoot = mkdtempSync(join(tmpdir(), `hook-fixture-${hookName}-`));
    });
    afterEach(() => {
      rmSync(projectRoot, { recursive: true, force: true });
    });

    it.each(fixtures.map((f) => [f.replace(/\.json$/, ''), f] as const))('%s', (fixtureName, fixtureFile) => {
      const outcome = expected[fixtureName];
      if (!outcome) throw new Error(`no expected outcome for ${fixtureName} — add it to expected.json`);
      // Pre-create any files / dirs the fixture depends on.
      for (const rel of outcome.createFiles ?? []) {
        const abs = join(projectRoot, rel);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, '');
      }
      for (const rel of outcome.createDirs ?? []) {
        mkdirSync(join(projectRoot, rel), { recursive: true });
      }

      const rawFixture = readFileSync(join(fixtureDir, fixtureFile), 'utf8');
      const input = rawFixture.split(PROJECT_ROOT_TOKEN).join(projectRoot);
      const result = spawnSync('bash', [hookScript], {
        input,
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: projectRoot },
      });

      const actual = describeOutcome(result, outcome);
      const want = describeExpected(outcome);
      expect(actual).toEqual(want);
    });
  });
}
