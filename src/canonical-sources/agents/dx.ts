import { defineAgent } from '../../factories/defineAgent.ts';
import { loadText } from '../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'dx',
  description:
    'Developer-experience advocate — time-to-first-success, guessable APIs, progressive complexity.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Write', 'WebFetch'],
  prompt: loadText(import.meta.url, 'dx.md'),
});
