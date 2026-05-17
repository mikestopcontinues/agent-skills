import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'grill-me',
  description:
    'Interview the captain relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when the captain wants to stress-test a plan, get grilled on a design, or mentions "grill me".',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'grill-me.md'),
});
