import { defineAgent } from '../../../factories/defineAgent.ts';
import { loadText } from '../../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'implementer',
  description:
    'Focused implementation — one task, with tests, following conventions, checks before done.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash'],
  prompt: loadText(import.meta.url, 'implementer.md'),
});
