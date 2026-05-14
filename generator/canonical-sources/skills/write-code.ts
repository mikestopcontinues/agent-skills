import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'write-code',
  description:
    'Singleton skill for ALL code work — bug fixes, refactors, feature increments, plan-phase execution. Operates in a git worktree, commits incrementally, runs the quality gate before every commit. Use whenever code is being written or modified.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'write-code.md'),
});
