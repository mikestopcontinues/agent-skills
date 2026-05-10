import { describe, expect, it, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCanonicalSources, type CanonicalSources } from '../src/generator/loadCanonicalSources.ts';
import { emitClaudeCode } from '../src/generator/emit/claudeCode.ts';
import { parseFrontmatter } from '../src/generator/frontmatter.ts';

const PLUGIN_ROOT_TOKEN = '${CLAUDE_PLUGIN_ROOT}';

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
      // Body and extras are emitted verbatim.
      expect(body).toBe(readFileSync(bodyPath, 'utf8'));
      for (const [rel, abs] of extras.files) {
        expect(readFileSync(join(out, 'skills', def.name, rel), 'utf8')).toBe(readFileSync(abs, 'utf8'));
      }
    }
  });

  it('ships review-doc/review-code with co-located persona prompts (every persona)', () => {
    for (const skillName of ['review-doc', 'review-code']) {
      for (const { agent, promptPath } of sources.agents) {
        const file = join(out, 'skills', skillName, 'personas', `${agent.def.name}.md`);
        expect(existsSync(file)).toBe(true);
        expect(readFileSync(file, 'utf8')).toBe(readFileSync(promptPath, 'utf8'));
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
      expect(body).toBe(readFileSync(promptPath, 'utf8'));
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

  it('hooks.json uses the { hooks: { <Event>: [ { matcher, hooks } ] } } shape, referencing every hook', () => {
    const parsed = JSON.parse(readFileSync(join(out, 'hooks', 'hooks.json'), 'utf8')) as {
      hooks: Record<string, Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>>;
    };
    expect(typeof parsed.hooks).toBe('object');
    const referenced = new Set<string>();
    const badType: string[] = [];
    const badPrefix: string[] = [];
    for (const blocks of Object.values(parsed.hooks)) {
      for (const block of blocks) {
        for (const entry of block.hooks) {
          if (entry.type !== 'command') badType.push(entry.command);
          if (!entry.command.startsWith(`${PLUGIN_ROOT_TOKEN}/hooks/`) || !entry.command.endsWith('.sh')) {
            badPrefix.push(entry.command);
          }
          referenced.add(entry.command.replace(`${PLUGIN_ROOT_TOKEN}/hooks/`, '').replace(/\.sh$/, ''));
        }
      }
    }
    expect(badType).toEqual([]);
    expect(badPrefix).toEqual([]);
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
