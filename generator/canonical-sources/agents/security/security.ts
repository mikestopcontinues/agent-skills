import { defineAgent } from '../../../factories/defineAgent.ts';
import { loadText } from '../../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'security',
  description: 'Adversarial red-team mindset — zero trust, defense in depth, fail closed.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Write', 'WebFetch'],
  prompt: loadText(import.meta.url, 'security.md'),
});
