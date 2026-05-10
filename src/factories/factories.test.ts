import { describe, expect, it } from 'vitest';
import { defineSkill, Skill } from './defineSkill.ts';
import { defineAgent, Agent } from './defineAgent.ts';
import { defineHook, Hook } from './defineHook.ts';
import { defineProjectContext, ProjectContext } from './defineProjectContext.ts';

describe('defineSkill', () => {
  it('accepts a well-formed skill', () => {
    const s = defineSkill({
      name: 'create-spike',
      description: 'Use when starting a research spike.',
      tools: ['Read', 'Write', 'Glob', 'Grep', 'Bash', 'Dispatch'],
      body: '# Create Spike\n\nDo the thing.',
    });
    expect(s).toBeInstanceOf(Skill);
    expect(s.def.name).toBe('create-spike');
  });

  it('accepts optional metadata', () => {
    const s = defineSkill({
      name: 'review-doc',
      description: 'Review a document through a focus brief.',
      tools: ['Read', 'Glob', 'Grep'],
      body: 'body',
      metadata: { shortDescription: 'Review a doc', compatibility: ['claude-code'] },
    });
    expect(s.def.metadata?.shortDescription).toBe('Review a doc');
  });

  it('rejects an invalid name', () => {
    expect(() =>
      defineSkill({ name: 'Create Spike', description: 'x', tools: [], body: 'b' }),
    ).toThrow();
  });

  it('rejects an unknown tool name', () => {
    expect(() =>
      // @ts-expect-error — exercising the runtime guard with a bad tool name
      defineSkill({ name: 'x', description: 'd', tools: ['NotARealTool'], body: 'b' }),
    ).toThrow();
  });

  it('rejects an empty body', () => {
    expect(() => defineSkill({ name: 'x', description: 'd', tools: [], body: '' })).toThrow();
  });
});

describe('defineAgent', () => {
  it('accepts a well-formed persona', () => {
    const a = defineAgent({
      name: 'architect',
      description: 'Boundary-first system thinking.',
      tools: ['Read', 'Grep', 'Glob', 'Write', 'WebFetch'],
      prompt: 'You are the architect persona.',
      model: 'opus',
    });
    expect(a).toBeInstanceOf(Agent);
    expect(a.def.model).toBe('opus');
  });

  it('rejects an empty prompt', () => {
    expect(() =>
      defineAgent({ name: 'architect', description: 'd', tools: [], prompt: '' }),
    ).toThrow();
  });
});

describe('defineHook', () => {
  it('accepts a bash handler', () => {
    const h = defineHook({
      name: 'pre-commit-gate',
      event: 'PreToolUse',
      matcher: 'Bash',
      handler: { kind: 'bash', command: '#!/bin/bash\necho ok' },
    });
    expect(h).toBeInstanceOf(Hook);
    expect(h.def.handler.kind).toBe('bash');
  });

  it('accepts a module handler', () => {
    const h = defineHook({
      name: 'opencode-hook',
      event: 'PreToolUse',
      matcher: 'Edit|Write',
      handler: { kind: 'module', modulePath: './hooks/foo.ts', exportName: 'run' },
    });
    expect(h.def.handler.kind).toBe('module');
  });

  it('rejects an unknown event', () => {
    expect(() =>
      defineHook({
        name: 'x',
        // @ts-expect-error — exercising the runtime guard with a bad event
        event: 'NotAnEvent',
        matcher: 'Bash',
        handler: { kind: 'bash', command: 'echo' },
      }),
    ).toThrow();
  });

  it('rejects a malformed handler discriminant', () => {
    expect(() =>
      defineHook({
        name: 'x',
        event: 'PreToolUse',
        matcher: 'Bash',
        // @ts-expect-error — exercising the runtime guard with a bad handler kind
        handler: { kind: 'python', command: 'print()' },
      }),
    ).toThrow();
  });
});

describe('defineProjectContext', () => {
  it('accepts the singleton shape', () => {
    const pc = defineProjectContext({
      name: 'docs-root-context',
      description: 'Repo-root context template.',
      content: '# Project\n\nContext here.',
      harnessFilenames: { claudeCode: 'CLAUDE.md', codex: 'AGENTS.md', opencode: 'AGENTS.md' },
    });
    expect(pc).toBeInstanceOf(ProjectContext);
    expect(pc.def.harnessFilenames.claudeCode).toBe('CLAUDE.md');
  });

  it('rejects a non-singleton name', () => {
    expect(() =>
      defineProjectContext({
        // @ts-expect-error — exercising the runtime guard with a bad name
        name: 'something-else',
        description: 'd',
        content: 'c',
        harnessFilenames: { claudeCode: 'CLAUDE.md', codex: 'AGENTS.md', opencode: 'AGENTS.md' },
      }),
    ).toThrow();
  });
});
