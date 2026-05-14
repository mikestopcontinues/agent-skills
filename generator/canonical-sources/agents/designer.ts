import { defineAgent } from '../../factories/defineAgent.ts';
import { loadText } from '../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'designer',
  description: 'Outside-in user perspective — progressive disclosure, reduce cognitive load.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Write'],
  prompt: loadText(import.meta.url, 'designer.md'),
});
