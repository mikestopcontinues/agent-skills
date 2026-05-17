import { defineAgent } from '../../../factories/defineAgent.ts';
import { loadText } from '../../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'researcher',
  description: 'Evidence-first investigation — breadth before depth, skeptical of abstractions.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Write', 'WebFetch', 'Bash'],
  prompt: loadText(import.meta.url, 'researcher.md'),
});
