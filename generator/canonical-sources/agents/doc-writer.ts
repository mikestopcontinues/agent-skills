import { defineAgent } from '../../factories/defineAgent.ts';
import { loadText } from '../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'doc-writer',
  description:
    'Reader-first communication — structural coherence, information architecture, clarity.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Write'],
  prompt: loadText(import.meta.url, 'doc-writer.md'),
});
