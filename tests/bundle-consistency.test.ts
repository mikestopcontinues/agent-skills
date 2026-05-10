import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCanonicalSources } from '../src/generator/loadCanonicalSources.ts';
import { emitClaudeCode } from '../src/generator/emit/claudeCode.ts';

/**
 * "Would the built Claude Code bundle actually work in a repo?" — internal
 * coherence: every `${CLAUDE_PLUGIN_ROOT}/...` reference in a skill body /
 * agent prompt / hooks.json resolves to a file that ships in the bundle (so
 * when the harness sets CLAUDE_PLUGIN_ROOT to the bundle root, it resolves),
 * the manifests are well-formed, the shipped scripts are executable, and the
 * hook scripts run without crashing on a benign input.
 */
let bundle: string;

beforeAll(async () => {
  const sources = await loadCanonicalSources();
  bundle = mkdtempSync(join(tmpdir(), 'as-bundle-'));
  emitClaudeCode(sources, bundle, { name: '@test/agent-skills', version: '0.0.0', description: 'test bundle' });
});

const PLUGIN_ROOT_REF = /\$\{CLAUDE_PLUGIN_ROOT\}((?:\/[A-Za-z0-9._{}-]+)+)/g;

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

describe('CC bundle — plugin-root references resolve within the bundle', () => {
  it('every ${CLAUDE_PLUGIN_ROOT}/<path> in the bundle points at a file the bundle ships', () => {
    const missing: string[] = [];
    for (const file of walkFiles(bundle)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(PLUGIN_ROOT_REF)) {
        // Skip references that contain a `{placeholder}` segment (e.g.
        // `${CLAUDE_PLUGIN_ROOT}/skills/review-doc/focuses/{focus}.md`) — those
        // are templated at use time; check the parent directory exists instead.
        const refPath = m[1]!.replace(/^\//, '');
        const hasPlaceholder = /\{[^}]+\}/.test(refPath);
        const target = hasPlaceholder ? refPath.replace(/\/[^/]*\{[^}]+\}[^/]*$/, '') : refPath;
        const abs = join(bundle, target);
        if (!existsSync(abs)) missing.push(`${file.replace(bundle, '<bundle>')}: ${m[0]} → ${target}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the focus-brief directory each review skill references actually ships its briefs', () => {
    // review-doc → 8 briefs, review-code → 3 briefs (per d15).
    expect(readdirSync(join(bundle, 'skills', 'review-doc', 'focuses')).sort()).toEqual(
      ['accuracy.md', 'architecture.md', 'clarity.md', 'comprehensiveness.md', 'depth.md', 'dx.md', 'integration.md', 'scope.md'],
    );
    expect(readdirSync(join(bundle, 'skills', 'review-code', 'focuses')).sort()).toEqual(['accuracy.md', 'architecture.md', 'dx.md']);
  });
});

describe('CC bundle — manifests + scripts', () => {
  it('plugin.json and hooks/hooks.json are well-formed JSON', () => {
    const manifest = JSON.parse(readFileSync(join(bundle, '.claude-plugin', 'plugin.json'), 'utf8')) as Record<string, unknown>;
    expect(typeof manifest['name']).toBe('string');
    expect(typeof manifest['version']).toBe('string');
    const hooksJson = JSON.parse(readFileSync(join(bundle, 'hooks', 'hooks.json'), 'utf8')) as Record<string, unknown>;
    expect(Object.keys(hooksJson).length).toBeGreaterThan(0);
  });

  it('shipped scripts are executable', () => {
    const offenders: string[] = [];
    for (const name of readdirSync(join(bundle, 'scripts'))) {
      if ((statSync(join(bundle, 'scripts', name)).mode & 0o111) === 0) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });
});

describe('CC bundle — hook scripts run cleanly on a benign input', () => {
  it('each hook script exits 0 for a non-matching tool input (no spurious deny)', () => {
    // A non-commit Bash command + a non-doc Write — should match nothing, so
    // every hook is a no-op exit 0. (Feeding a `git commit` input would make
    // pre-commit-gate.sh recursively run `pnpm run check` — avoid that.)
    const benignBash = JSON.stringify({ tool_input: { command: 'ls -la' } });
    const benignWrite = JSON.stringify({ tool_input: { file_path: '/tmp/some-source.ts', content: 'x' } });
    const env = { ...process.env, CLAUDE_PLUGIN_ROOT: bundle, CLAUDE_PROJECT_DIR: bundle };
    const failures: string[] = [];
    for (const name of readdirSync(join(bundle, 'hooks')).filter((f) => f.endsWith('.sh'))) {
      const input = name.includes('write-doc') || name.includes('worktree-path') ? benignWrite : benignBash;
      try {
        execFileSync('bash', [join(bundle, 'hooks', name)], { input, env, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err) {
        failures.push(`${name}: ${(err as Error).message}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
