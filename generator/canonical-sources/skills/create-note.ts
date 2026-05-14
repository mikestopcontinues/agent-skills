import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'create-note',
  description:
    'Create a living note — for unresolved decisions, working knowledge, and adapter contracts that don\'t fit a spike or plan. Use when capturing design context that needs a home but isn\'t research or a spec.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'create-note.md'),
});
