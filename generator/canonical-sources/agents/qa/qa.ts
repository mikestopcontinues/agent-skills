import { defineAgent } from '../../../factories/defineAgent.ts';
import { loadText } from '../../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'qa',
  description: 'Correctness-first quality assurance — edge cases, failure modes, scope discipline.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Write', 'Bash'],
  prompt: loadText(import.meta.url, 'qa.md'),
});
