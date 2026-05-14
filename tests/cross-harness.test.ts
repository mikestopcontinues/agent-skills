import { describe, expect, it, beforeAll } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCanonicalSources, type CanonicalSources } from '../generator/loadCanonicalSources.ts';
import { emitClaudeCode } from '../generator/emit/claudeCode.ts';
import { emitCodex } from '../generator/emit/codex.ts';
import { emitOpenCode } from '../generator/emit/opencode.ts';
import { parseFrontmatter } from '../generator/frontmatter.ts';
import { aliasToolList, deAliasToolName } from '../generator/aliases/toolNames.ts';
import type { HarnessId } from '../generator/factories/types/harnessId.ts';

const META = { name: '@test/agent-skills', version: '0.0.0', description: 'test bundle' };

/** Leaf review subagents — never carry the Dispatch tool (per d15; only
 *  triage-feedback dispatches). The emitted `tools` line (where present) must
 *  not include `Dispatch` in any harness. */
const LEAF_SUBAGENT_SKILLS = new Set(['review-doc', 'review-code', 'process-feedback']);

let sources: CanonicalSources;
const dirs: Record<HarnessId, string> = { 'claude-code': '', codex: '', opencode: '' };

beforeAll(async () => {
  sources = await loadCanonicalSources();
  dirs['claude-code'] = mkdtempSync(join(tmpdir(), 'as-cc-'));
  dirs['codex'] = mkdtempSync(join(tmpdir(), 'as-codex-'));
  dirs['opencode'] = mkdtempSync(join(tmpdir(), 'as-opencode-'));
  emitClaudeCode(sources, dirs['claude-code'], META);
  emitCodex(sources, dirs['codex'], META);
  emitOpenCode(sources, dirs['opencode'], META);
});

const harnesses: HarnessId[] = ['claude-code', 'codex', 'opencode'];

function skillDirNames(harness: HarnessId): string[] {
  return readdirSync(join(dirs[harness], 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function readSkillFrontmatter(harness: HarnessId, name: string): Record<string, string> {
  const file = join(dirs[harness], 'skills', name, 'SKILL.md');
  return parseFrontmatter(readFileSync(file, 'utf8'), file).fields;
}

describe('cross-harness — counts', () => {
  it('every harness emits exactly loadCanonicalSources().skills.length skills', () => {
    for (const h of harnesses) expect(skillDirNames(h).length).toBe(sources.skills.length);
  });

  it('every harness emits exactly the agent count', () => {
    const expected = sources.agents.length;
    expect(readdirSync(join(dirs['claude-code'], 'agents')).length).toBe(expected);
    expect(readdirSync(join(dirs['codex'], 'agents')).length).toBe(expected);
    expect(readdirSync(join(dirs['opencode'], 'agents')).length).toBe(expected);
  });

  it('every harness ships every hook bash script', () => {
    const expected = sources.hooks.map((h) => `${h.hook.def.name}.sh`).sort();
    for (const h of harnesses) {
      expect(
        readdirSync(join(dirs[h], 'hooks'))
          .filter((f) => f.endsWith('.sh'))
          .sort(),
      ).toEqual(expected);
    }
  });

  it('every shipped hook handler has the executable bit set in every harness', () => {
    const offenders: string[] = [];
    for (const h of harnesses) {
      for (const name of readdirSync(join(dirs[h], 'hooks')).filter((f) => f.endsWith('.sh'))) {
        if ((statSync(join(dirs[h], 'hooks', name)).mode & 0o111) === 0) offenders.push(`${h}/${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('cross-harness — skill identity', () => {
  it('skill names match across all three emits and the canonical set', () => {
    const canonical = sources.skills.map((s) => s.skill.def.name).sort();
    for (const h of harnesses) expect(skillDirNames(h)).toEqual(canonical);
  });

  it('every skill carries its canonical description, verbatim, in all three emits', () => {
    const mismatches: string[] = [];
    for (const { skill } of sources.skills) {
      for (const h of harnesses) {
        const fm = readSkillFrontmatter(h, skill.def.name);
        if (fm['name'] !== skill.def.name) mismatches.push(`${h}/${skill.def.name}: name`);
        if (fm['description'] !== skill.def.description) mismatches.push(`${h}/${skill.def.name}: description`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe('cross-harness — tool aliasing', () => {
  it('Claude Code skill tools de-alias to the canonical list (and only CC carries skill tools)', () => {
    const mismatches: string[] = [];
    for (const { skill } of sources.skills) {
      const ccFm = readSkillFrontmatter('claude-code', skill.def.name);
      const deAliased = 'tools' in ccFm ? ccFm['tools']!.split(',').map((t) => deAliasToolName('claude-code', t.trim())) : null;
      const expected = skill.def.tools ?? null;
      if (JSON.stringify(deAliased) !== JSON.stringify(expected)) {
        mismatches.push(`claude-code/${skill.def.name}: tools ${JSON.stringify(deAliased)} != ${JSON.stringify(expected)}`);
      }
      // Codex / OpenCode skill frontmatter carries no tools line (per Ch9).
      if ('tools' in readSkillFrontmatter('codex', skill.def.name)) mismatches.push(`codex/${skill.def.name}: unexpected tools line`);
    }
    expect(mismatches).toEqual([]);
  });

  it('agent tools are aliased per harness (Dispatch → spawn / task)', () => {
    for (const { agent } of sources.agents) {
      const cc = parseFrontmatter(readFileSync(join(dirs['claude-code'], 'agents', `${agent.def.name}.md`), 'utf8'), 'cc').fields;
      expect(cc['tools']!.split(',').map((t) => t.trim())).toEqual(aliasToolList('claude-code', agent.def.tools));
    }
  });
});

describe('cross-harness — Dispatch invariant', () => {
  it('leaf review subagents never carry Dispatch in any harness emit', () => {
    const offenders: string[] = [];
    for (const name of LEAF_SUBAGENT_SKILLS) {
      for (const h of harnesses) {
        const fm = readSkillFrontmatter(h, name);
        const tools = (fm['tools'] ?? '').split(',').map((t) => t.trim());
        if (tools.includes('Dispatch') || tools.includes('spawn') || tools.includes('task')) {
          offenders.push(`${h}/${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('cross-harness — shipped scripts', () => {
  it('yolo and doc-check-links.sh are in every bundle, byte-identical, executable', () => {
    const missing: string[] = [];
    for (const h of harnesses) {
      for (const [name, abs] of sources.scripts) {
        const file = join(dirs[h], 'scripts', name);
        if (!existsSync(file)) {
          missing.push(`${h}/scripts/${name}`);
          continue;
        }
        if (readFileSync(file, 'utf8') !== readFileSync(abs, 'utf8')) missing.push(`${h}/scripts/${name} (content)`);
        if ((statSync(file).mode & 0o111) === 0) missing.push(`${h}/scripts/${name} (not executable)`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('cross-harness — Codex has no notify hooks', () => {
  it('zero occurrences of "notify" in the Codex bundle (per d12)', () => {
    function walk(dir: string, acc: string[]): string[] {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (readFileSync(p, 'utf8').includes('notify')) acc.push(p);
      }
      return acc;
    }
    expect(walk(dirs['codex'], [])).toEqual([]);
  });
});

describe('cross-harness — project-context dual emit', () => {
  it('emits the same content to docs/CLAUDE.md (CC) and docs/AGENTS.md (Codex, OpenCode)', () => {
    const pc = sources.projectContext!;
    const cc = readFileSync(join(dirs['claude-code'], 'docs', pc.def.harnessFilenames.claudeCode), 'utf8');
    const codex = readFileSync(join(dirs['codex'], 'docs', pc.def.harnessFilenames.codex), 'utf8');
    const opencode = readFileSync(join(dirs['opencode'], 'docs', pc.def.harnessFilenames.opencode), 'utf8');
    expect(cc).toBe(pc.def.content);
    expect(codex).toBe(pc.def.content);
    expect(opencode).toBe(pc.def.content);
    expect(pc.def.harnessFilenames.claudeCode).toBe('CLAUDE.md');
    expect(pc.def.harnessFilenames.codex).toBe('AGENTS.md');
    expect(pc.def.harnessFilenames.opencode).toBe('AGENTS.md');
  });
});

describe('cross-harness — no leftover placeholder', () => {
  it('no emitted file in any bundle still contains the raw __SKILL_HOME__ token', () => {
    function walk(dir: string, acc: string[]): string[] {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (readFileSync(p, 'utf8').includes('__SKILL_HOME__')) acc.push(p);
      }
      return acc;
    }
    const offenders: string[] = [];
    for (const h of harnesses) walk(dirs[h], offenders);
    expect(offenders).toEqual([]);
  });
});
