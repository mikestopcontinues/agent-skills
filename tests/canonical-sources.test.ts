import { describe, expect, it } from 'vitest';
import { glob } from 'glob';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Skill } from '../generator/factories/defineSkill.ts';
import { Agent } from '../generator/factories/defineAgent.ts';
import { Hook } from '../generator/factories/defineHook.ts';

const repoRoot = resolve(import.meta.dirname, '..');

async function loadAll(globPattern: string): Promise<Array<{ file: string; mod: Record<string, unknown> }>> {
  const files = (await glob(globPattern, { cwd: repoRoot, absolute: true })).sort();
  return Promise.all(
    files.map(async (file) => ({ file, mod: (await import(pathToFileURL(file).href)) as Record<string, unknown> })),
  );
}

// The Phase 1 toolkit is a frozen inventory: exactly 21 skills, 11 persona
// agents, 5 hooks. Changes to these counts are deliberate and update this test.
const EXPECTED = { skills: 21, agents: 11, hooks: 5 } as const;

describe('canonical sources', () => {
  it('every skill module loads and exports a Skill instance', async () => {
    const mods = await loadAll('generator/canonical-sources/skills/*/*.ts');
    expect(mods.length).toBe(EXPECTED.skills);
    for (const { file, mod } of mods) {
      expect(mod['skill'], `${file}: expected a \`skill\` export`).toBeInstanceOf(Skill);
    }
  });

  it('every agent module loads and exports an Agent instance', async () => {
    const mods = await loadAll('generator/canonical-sources/agents/*/*.ts');
    expect(mods.length).toBe(EXPECTED.agents);
    for (const { file, mod } of mods) {
      expect(mod['agent'], `${file}: expected an \`agent\` export`).toBeInstanceOf(Agent);
    }
  });

  it('every hook module loads and exports a Hook instance', async () => {
    const mods = await loadAll('generator/canonical-sources/hooks/*/*.ts');
    expect(mods.length).toBe(EXPECTED.hooks);
    for (const { file, mod } of mods) {
      expect(mod['hook'], `${file}: expected a \`hook\` export`).toBeInstanceOf(Hook);
    }
  });

  it('skill names are unique and match their filename', async () => {
    const mods = await loadAll('generator/canonical-sources/skills/*/*.ts');
    const names = new Set<string>();
    for (const { file, mod } of mods) {
      const skill = mod['skill'] as Skill;
      const base = file.split('/').at(-1)!.replace(/\.ts$/, '');
      expect(skill.def.name, `${file}: name should match filename`).toBe(base);
      expect(names.has(skill.def.name), `duplicate skill name: ${skill.def.name}`).toBe(false);
      names.add(skill.def.name);
    }
  });

  it('every canonical artifact has a co-located, non-empty .eval.md sidecar', async () => {
    const tsFiles = [
      ...(await glob('generator/canonical-sources/skills/*/*.ts', { cwd: repoRoot, absolute: true })),
      ...(await glob('generator/canonical-sources/agents/*/*.ts', { cwd: repoRoot, absolute: true })),
      ...(await glob('generator/canonical-sources/hooks/*/*.ts', { cwd: repoRoot, absolute: true })),
      resolve(repoRoot, 'generator/canonical-sources/project-context/project-context.ts'),
    ];
    const missing: string[] = [];
    for (const tsFile of tsFiles) {
      const evalFile = tsFile.replace(/\.ts$/, '.eval.md');
      if (!existsSync(evalFile) || readFileSync(evalFile, 'utf8').trim().length === 0) missing.push(evalFile);
    }
    expect(missing).toEqual([]);
  });
});
