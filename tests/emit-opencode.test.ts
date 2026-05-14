import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { loadCanonicalSources, type CanonicalSources } from '../generator/loadCanonicalSources.ts';
import { emitOpenCode } from '../generator/emit/opencode.ts';
import { aliasToolList } from '../generator/aliases/toolNames.ts';
import { parseFrontmatter } from '../generator/frontmatter.ts';

const PLUGIN_ROOT_TOKEN = '${CLAUDE_PLUGIN_ROOT}';
const SKILL_HOME_TOKEN = '__SKILL_HOME__';

/** Reverse the emit-time `__SKILL_HOME__` → `${CLAUDE_PLUGIN_ROOT}` substitution
 *  (cross-product convention; OpenCode behavior unverified for v0.1). */
function unsubSkillHome(text: string): string {
  return text.split(PLUGIN_ROOT_TOKEN).join(SKILL_HOME_TOKEN);
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs));
    else out.push(abs);
  }
  return out;
}

let sources: CanonicalSources;
let out: string;

beforeAll(async () => {
  sources = await loadCanonicalSources();
  out = mkdtempSync(join(tmpdir(), 'agent-skills-opencode-'));
  emitOpenCode(sources, out, { name: '@test/agent-skills', version: '0.0.0', description: 'test bundle' });
});

describe('emitOpenCode — package.json', () => {
  it('writes a well-formed package.json', () => {
    const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8')) as Record<string, unknown>;
    expect(pkg).toEqual({
      name: '@test/agent-skills',
      version: '0.0.0',
      description: 'test bundle',
      type: 'module',
      main: 'src/plugin.ts',
    });
  });
});

describe('emitOpenCode — skills round-trip', () => {
  it('emits one SKILL.md per canonical skill, parsing back to the canonical def', () => {
    const missing: string[] = [];
    for (const { skill, bodyPath, extras } of sources.skills) {
      const def = skill.def;
      const file = join(out, 'skills', def.name, 'SKILL.md');
      if (!existsSync(file)) {
        missing.push(file);
        continue;
      }
      const { fields, body } = parseFrontmatter(readFileSync(file, 'utf8'), file);
      expect(fields['name']).toBe(def.name);
      expect(fields['description']).toBe(def.description);
      // OpenCode skill frontmatter is name + description only — no `tools` line.
      expect(fields['tools'] ?? null).toBe(null);
      expect(unsubSkillHome(body)).toBe(readFileSync(bodyPath, 'utf8'));
      for (const [rel, abs] of extras.files) {
        expect(unsubSkillHome(readFileSync(join(out, 'skills', def.name, rel), 'utf8'))).toBe(readFileSync(abs, 'utf8'));
      }
    }
    expect(missing).toEqual([]);
  });

  it('emits exactly one skill dir per canonical skill', () => {
    expect(readdirSync(join(out, 'skills')).sort()).toEqual(sources.skills.map((s) => s.skill.def.name).sort());
  });
});

describe('emitOpenCode — agents round-trip', () => {
  it('emits one <name>.md per persona with mode/model/tools frontmatter and the prompt as body', () => {
    const missing: string[] = [];
    for (const { agent, promptPath } of sources.agents) {
      const def = agent.def;
      const file = join(out, 'agents', `${def.name}.md`);
      if (!existsSync(file)) {
        missing.push(file);
        continue;
      }
      const { fields, body } = parseFrontmatter(readFileSync(file, 'utf8'), file);
      expect(fields['mode']).toBe('subagent');
      expect(fields['model']).toBe(def.model);
      expect(fields['tools']).toBe(aliasToolList('opencode', def.tools).join(', '));
      expect(unsubSkillHome(body)).toBe(readFileSync(promptPath, 'utf8'));
    }
    expect(missing).toEqual([]);
  });

  it('emits exactly one .md per canonical agent', () => {
    expect(readdirSync(join(out, 'agents')).sort()).toEqual(sources.agents.map((a) => `${a.agent.def.name}.md`).sort());
  });
});

describe('emitOpenCode — hooks', () => {
  it('emits one hooks/<name>.sh per hook, byte-identical to the canonical handler', () => {
    for (const { hook, handlerPath } of sources.hooks) {
      const file = join(out, 'hooks', `${hook.def.name}.sh`);
      expect(readFileSync(file, 'utf8')).toBe(readFileSync(handlerPath, 'utf8'));
    }
  });

  it('generates src/plugin.ts mentioning every hook name', () => {
    const file = join(out, 'src', 'plugin.ts');
    expect(existsSync(file)).toBe(true);
    const text = readFileSync(file, 'utf8');
    const missing = sources.hooks.map((h) => h.hook.def.name).filter((name) => !text.includes(name));
    expect(missing).toEqual([]);
  });
});

describe('emitOpenCode — scripts', () => {
  it('ships yolo and doc-check-links.sh byte-identical', () => {
    for (const [name, abs] of sources.scripts) {
      expect(readFileSync(join(out, 'scripts', name), 'utf8')).toBe(readFileSync(abs, 'utf8'));
    }
  });
});

describe('emitOpenCode — project context', () => {
  it('emits docs/AGENTS.md with the canonical content', () => {
    const pc = sources.projectContext!;
    const file = join(out, 'docs', pc.def.harnessFilenames.opencode);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(pc.def.content);
  });
});

describe('emitOpenCode — no leftover placeholder', () => {
  it('no emitted file still contains the raw __SKILL_HOME__ token', () => {
    const offenders: string[] = [];
    for (const file of walkFiles(out)) {
      const rel = relative(out, file).split(sep).join('/');
      if (readFileSync(file, 'utf8').includes(SKILL_HOME_TOKEN)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

describe('emitOpenCode — generated TS plugin', () => {
  // T2B.20: the generated src/plugin.ts must be valid TypeScript. `node --check`
  // type-strips then syntax-checks, which also confirms it is erasable-syntax-
  // only (the repo's tsconfig setting) — i.e. it runs unmodified under Node.
  it('src/plugin.ts passes `node --check` (syntactically valid, type-strippable)', () => {
    const plugin = join(out, 'src', 'plugin.ts');
    expect(existsSync(plugin)).toBe(true);
    // Throws on a syntax / non-erasable-syntax error.
    execFileSync(process.execPath, ['--check', plugin], { stdio: ['pipe', 'pipe', 'pipe'] });
  });
});
