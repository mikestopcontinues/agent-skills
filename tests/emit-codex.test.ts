import { describe, expect, it, beforeAll } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { loadCanonicalSources, type CanonicalSources } from '../src/generator/loadCanonicalSources.ts';
import { emitCodex } from '../src/generator/emit/codex.ts';
import { parseFrontmatter } from '../src/generator/frontmatter.ts';

const PLUGIN_ROOT_TOKEN = '${CODEX_PLUGIN_ROOT}';
const SKILL_HOME_TOKEN = '__SKILL_HOME__';

/** Reverse the emit-time `__SKILL_HOME__` → `${CODEX_PLUGIN_ROOT}` substitution. */
function unsubSkillHome(text: string): string {
  return text.split(PLUGIN_ROOT_TOKEN).join(SKILL_HOME_TOKEN);
}

/** Reverse TOML basic-string escaping (`\\`, `\"`, `\n`, `\t`) — the emitter only
 *  produces those four escapes in `developer_instructions`. */
function unescapeTomlBasic(text: string): string {
  return text.replace(/\\(\\|"|n|t)/g, (_m, ch: string) => {
    if (ch === 'n') return '\n';
    if (ch === 't') return '\t';
    return ch;
  });
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
  out = mkdtempSync(join(tmpdir(), 'agent-skills-codex-'));
  emitCodex(sources, out, { name: '@test/agent-skills', version: '0.0.0', description: 'test bundle' });
});

describe('emitCodex — plugin manifest', () => {
  it('writes a well-formed plugin.json', () => {
    const manifest = JSON.parse(readFileSync(join(out, '.codex-plugin', 'plugin.json'), 'utf8')) as Record<string, unknown>;
    expect(manifest).toEqual({ name: '@test/agent-skills', version: '0.0.0', description: 'test bundle' });
  });
});

describe('emitCodex — skills round-trip', () => {
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
      // Codex skill frontmatter is name + description only — no `tools` line.
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

describe('emitCodex — agents round-trip', () => {
  it('emits one <role>.toml per persona with description / developer_instructions / model', () => {
    const missing: string[] = [];
    for (const { agent, promptPath } of sources.agents) {
      const def = agent.def;
      const file = join(out, 'agents', `${def.name}.toml`);
      if (!existsSync(file)) {
        missing.push(file);
        continue;
      }
      const toml = readFileSync(file, 'utf8');
      expect(toml.startsWith(`description = ${JSON.stringify(def.description)}\n`)).toBe(true);
      expect(toml.includes('developer_instructions = """')).toBe(true);
      expect(toml.includes(`model = "${def.model ?? 'opus'}"`)).toBe(true);
      expect(toml.includes('tools = [')).toBe(true);
      // The persona prompt round-trips: the `"""..."""` block minus the leading
      // newline TOML strips, with basic-string escaping reversed.
      const start = toml.indexOf('"""\n') + 4;
      const end = toml.indexOf('"""\n', start);
      const prompt = unsubSkillHome(unescapeTomlBasic(toml.slice(start, end)));
      expect(prompt).toBe(readFileSync(promptPath, 'utf8'));
    }
    expect(missing).toEqual([]);
  });

  it('emits exactly one .toml per canonical agent', () => {
    expect(readdirSync(join(out, 'agents')).sort()).toEqual(sources.agents.map((a) => `${a.agent.def.name}.toml`).sort());
  });
});

describe('emitCodex — hooks', () => {
  it('emits one hooks/<name>.sh per hook, byte-identical to the canonical handler', () => {
    for (const { hook, handlerPath } of sources.hooks) {
      const file = join(out, 'hooks', `${hook.def.name}.sh`);
      expect(readFileSync(file, 'utf8')).toBe(readFileSync(handlerPath, 'utf8'));
    }
  });

  it('hooks.json uses the { hooks: { <Event>: [ { matcher, hooks } ] } } shape, referencing every hook', () => {
    const parsed = JSON.parse(readFileSync(join(out, 'hooks.json'), 'utf8')) as {
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

  it('emits zero `notify` entries anywhere in the Codex bundle (per d12)', () => {
    const offenders: string[] = [];
    for (const file of walkFiles(out)) {
      if (readFileSync(file, 'utf8').includes('notify')) offenders.push(relative(out, file));
    }
    expect(offenders).toEqual([]);
  });
});

describe('emitCodex — scripts', () => {
  it('ships yolo and doc-check-links.sh byte-identical', () => {
    for (const [name, abs] of sources.scripts) {
      expect(readFileSync(join(out, 'scripts', name), 'utf8')).toBe(readFileSync(abs, 'utf8'));
    }
  });
});

describe('emitCodex — project context', () => {
  it('emits docs/AGENTS.md with the canonical content', () => {
    const pc = sources.projectContext!;
    const file = join(out, 'docs', pc.def.harnessFilenames.codex);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(pc.def.content);
  });
});

describe('emitCodex — no leftover placeholder', () => {
  it('no emitted file still contains the raw __SKILL_HOME__ token', () => {
    const offenders: string[] = [];
    for (const file of walkFiles(out)) {
      const rel = relative(out, file).split(sep).join('/');
      if (readFileSync(file, 'utf8').includes(SKILL_HOME_TOKEN)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
