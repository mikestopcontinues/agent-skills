import { defineAgent } from '../../factories/defineAgent.ts';
import { loadText } from '../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'conflict-resolver',
  description:
    'Git conflict resolution — preserves intent from both sides, verifies after resolution.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash'],
  prompt: loadText(import.meta.url, 'conflict-resolver.md'),
});
