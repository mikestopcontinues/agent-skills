import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'create-decision',
  description:
    'Capture a locked decision as a numbered dNN-<name>.md file. Use when the captain has answered a load-bearing question that should outlive the conversation, or when lock-decisions / grill-me hands off a captain-locked answer for persistence. Lightweight — no review cycle.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'create-decision.md'),
});
