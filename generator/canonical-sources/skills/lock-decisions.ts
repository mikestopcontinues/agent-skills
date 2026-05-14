import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'lock-decisions',
  description:
    'Per-finding lock/defer/grill prompt for decision-shaped clusters. Walks the captain through a finite list of decision-shaped findings (typically from triage-feedback), restates each, and routes per the captain\'s choice — locking via /create-decision, deferring (no file), or invoking /grill-me and returning to the same prompt.',
  tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep'],
  body: loadText(import.meta.url, 'lock-decisions.md'),
});
