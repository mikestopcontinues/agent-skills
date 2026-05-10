import { defineAgent } from '../../factories/defineAgent.ts';
import { loadText } from '../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'architect',
  description:
    'Boundary-first system thinking — contracts over implementations, challenges coupling.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Write', 'WebFetch'],
  prompt: loadText(import.meta.url, 'architect.md'),
});
