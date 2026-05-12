import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { loadCanonicalSources } from '../src/generator/loadCanonicalSources.ts';
import { ProjectContext } from '../src/factories/defineProjectContext.ts';
import { aliasToolName, aliasToolList, deAliasToolName } from '../src/generator/aliases/toolNames.ts';

describe('loadCanonicalSources', () => {
  it('aggregates the frozen Phase 1 inventory', async () => {
    const sources = await loadCanonicalSources();
    expect(sources.skills.length).toBe(21);
    expect(sources.agents.length).toBe(11);
    expect(sources.hooks.length).toBe(5);
    expect(sources.projectContext).toBeInstanceOf(ProjectContext);
    expect(sources.projectContext?.def.name).toBe('docs-root-context');
    expect(sources.projectContext?.def.harnessFilenames).toEqual({
      claudeCode: 'CLAUDE.md',
      codex: 'AGENTS.md',
      opencode: 'AGENTS.md',
    });
    expect([...sources.scripts.keys()].sort()).toEqual(['doc-check-links.sh', 'yolo']);
  });

  it('resolves a real body sidecar for every skill', async () => {
    const sources = await loadCanonicalSources();
    for (const { skill, bodyPath } of sources.skills) {
      expect(existsSync(bodyPath), `${skill.def.name}: ${bodyPath}`).toBe(true);
      expect(readFileSync(bodyPath, 'utf8')).toBe(skill.def.body);
    }
  });

  it('discovers extra files for skills that ship them', async () => {
    const sources = await loadCanonicalSources();
    const byName = new Map(sources.skills.map((s) => [s.skill.def.name, s]));
    expect([...byName.get('review-doc')!.extras.files.keys()].sort()).toEqual([
      'focuses/accuracy.md',
      'focuses/architecture.md',
      'focuses/clarity.md',
      'focuses/comprehensiveness.md',
      'focuses/depth.md',
      'focuses/dx.md',
      'focuses/integration.md',
      'focuses/scope.md',
    ]);
    expect([...byName.get('review-code')!.extras.files.keys()].sort()).toEqual([
      'focuses/accuracy.md',
      'focuses/architecture.md',
      'focuses/dx.md',
    ]);
    expect([...byName.get('create-spike')!.extras.files.keys()]).toEqual(['chapter.md']);
    expect(byName.get('write-doc')!.extras.files.size).toBe(0);
  });
});

describe('tool name aliasing', () => {
  it('claude-code is identity', () => {
    expect(aliasToolName('claude-code', 'Dispatch')).toBe('Dispatch');
    expect(aliasToolName('claude-code', 'Read')).toBe('Read');
  });

  it('aliases the dispatch tool per harness', () => {
    expect(aliasToolName('codex', 'Dispatch')).toBe('spawn');
    expect(aliasToolName('opencode', 'Dispatch')).toBe('task');
    expect(aliasToolName('codex', 'Read')).toBe('Read');
  });

  it('round-trips via deAliasToolName', () => {
    expect(deAliasToolName('codex', 'spawn')).toBe('Dispatch');
    expect(deAliasToolName('opencode', 'task')).toBe('Dispatch');
    expect(deAliasToolName('codex', 'Read')).toBe('Read');
  });

  it('aliasToolList preserves order', () => {
    expect(aliasToolList('codex', ['Read', 'Dispatch', 'Bash'])).toEqual(['Read', 'spawn', 'Bash']);
  });
});
