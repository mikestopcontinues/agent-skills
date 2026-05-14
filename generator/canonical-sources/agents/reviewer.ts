import { defineAgent } from '../../factories/defineAgent.ts';
import { loadText } from '../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'reviewer',
  description: 'Focus discipline and actionable findings — evidence-based, scope-bound evaluation.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Write', 'WebFetch'],
  prompt: loadText(import.meta.url, 'reviewer.md'),
});
