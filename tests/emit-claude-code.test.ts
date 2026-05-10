import { describe, expect, it, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCanonicalSources, type CanonicalSources } from '../src/generator/loadCanonicalSources.ts';
import { emitClaudeCode } from '../src/generator/emit/claudeCode.ts';
import { parseFrontmatter } from '../src/generator/frontmatter.ts';

const PLUGIN_ROOT_TOKEN = '${CLAUDE_PLUGIN_ROOT}';
const SKILL_HOME_TOKEN = '__SKILL_HOME__';

/** Reverse the emit-time `__SKILL_HOME__` → `${CLAUDE_PLUGIN_ROOT}` substitution. */
function unsubSkillHome(text: string): string {
  return text.split(PLUGIN_ROOT_TOKEN).join(SKILL_HOME_TOKEN);
}

let sources: CanonicalSources;
let out: string;

beforeAll(async () => {
  sources = await loadCanonicalSources();
  out = mkdtempSync(join(tmpdir(), 'agent-skills-cc-'));
  emitClaudeCode(sources, out, { name: '@test/agent-skills', version: '0.0.0', description: 'test bundle' });
});

describe('emitClaudeCode — plugin manifest', () => {
  it('writes a well-formed plugin.json', () => {
    const manifest = JSON.parse(readFileSync(join(out, '.claude-plugin', 'plugin.json'), 'utf8')) as Record<string, unknown>;
    expect(manifest).toEqual({ name: '@test/agent-skills', version: '0.0.0', description: 'test bundle' });
  });
});

describe('emitClaudeCode — skills round-trip', () => {
  it('emits one SKILL.md per canonical skill, parsing back to the canonical def', () => {
    for (const { skill, bodyPath, extras } of sources.skills) {
      const def = skill.def;
      const file = join(out, 'skills', def.name, 'SKILL.md');
      expect(existsSync(file)).toBe(true);
      const { fields, body } = parseFrontmatter(readFileSync(file, 'utf8'), file);
      expect(fields['name']).toBe(def.name);
      expect(fields['description']).toBe(def.description);
      // claude-code tool aliasing is identity; absent canonical tools → no `tools:` line.
      expect(fields['tools'] ?? null).toBe(def.tools ? def.tools.join(', ') : null);
      // Body round-trips byte-exact once the toolkit-home substitution is reversed.
      expect(unsubSkillHome(body)).toBe(readFileSync(bodyPath, 'utf8'));
      // Extra shipped files round-trip byte-exact (after the same reverse-sub).
      for (const [rel, abs] of extras.files) {
        const emitted = readFileSync(join(out, 'skills', def.name, rel), 'utf8');
        expect(unsubSkillHome(emitted)).toBe(readFileSync(abs, 'utf8'));
      }
    }
  });
});

describe('emitClaudeCode — agents round-trip', () => {
  it('emits one <name>.md per persona, parsing back to the canonical def', () => {
    for (const { agent, promptPath } of sources.agents) {
      const def = agent.def;
      const file = join(out, 'agents', `${def.name}.md`);
      expect(existsSync(file)).toBe(true);
      const { fields, body } = parseFrontmatter(readFileSync(file, 'utf8'), file);
      expect(fields['name']).toBe(def.name);
      expect(fields['description']).toBe(def.description);
      expect(fields['model']).toBe(def.model);
      expect(fields['tools']).toBe(def.tools.join(', '));
      expect(unsubSkillHome(body)).toBe(readFileSync(promptPath, 'utf8'));
    }
  });
});

describe('emitClaudeCode — hooks', () => {
  it('emits one <name>.sh per hook, byte-identical to the canonical handler', () => {
    for (const { hook, handlerPath } of sources.hooks) {
      const file = join(out, 'hooks', `${hook.def.name}.sh`);
      expect(readFileSync(file, 'utf8')).toBe(readFileSync(handlerPath, 'utf8'));
    }
  });

  it('hooks.json references every hook with a plugin-root path, grouped by (event, matcher)', () => {
    const hooksJson = JSON.parse(readFileSync(join(out, 'hooks', 'hooks.json'), 'utf8')) as Record<
      string,
      Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>
    >;
    const referenced = new Set<string>();
    for (const blocks of Object.values(hooksJson)) {
      for (const block of blocks) {
        for (const entry of block.hooks) {
          expect(entry.type).toBe('command');
          expect(entry.command.startsWith(`${PLUGIN_ROOT_TOKEN}/hooks/`)).toBe(true);
          expect(entry.command.endsWith('.sh')).toBe(true);
          referenced.add(entry.command.replace(`${PLUGIN_ROOT_TOKEN}/hooks/`, '').replace(/\.sh$/, ''));
        }
      }
    }
    expect([...referenced].sort()).toEqual(sources.hooks.map((h) => h.hook.def.name).sort());
  });
});

describe('emitClaudeCode — scripts', () => {
  it('ships yolo and doc-check-links.sh byte-identical', () => {
    for (const [name, abs] of sources.scripts) {
      expect(readFileSync(join(out, 'scripts', name), 'utf8')).toBe(readFileSync(abs, 'utf8'));
    }
  });
});

describe('emitClaudeCode — project context', () => {
  it('emits docs/CLAUDE.md with the canonical content', () => {
    const pc = sources.projectContext!;
    const file = join(out, 'docs', pc.def.harnessFilenames.claudeCode);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(pc.def.content);
  });
});

// The repo-checked-in build (`pnpm build`) lives under dist/ (gitignored) — not
// asserted here; this suite emits to a temp dir so it's hermetic.
describe('emitClaudeCode — no leftover placeholder', () => {
  it('no emitted file still contains the raw __SKILL_HOME__ token', () => {
    const offenders: string[] = [];
    for (const { skill } of sources.skills) {
      const file = join(out, 'skills', skill.def.name, 'SKILL.md');
      if (readFileSync(file, 'utf8').includes(SKILL_HOME_TOKEN)) offenders.push(file);
    }
    for (const { agent } of sources.agents) {
      const file = join(out, 'agents', `${agent.def.name}.md`);
      if (readFileSync(file, 'utf8').includes(SKILL_HOME_TOKEN)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
