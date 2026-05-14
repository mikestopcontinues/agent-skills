import { defineAgent } from '../../factories/defineAgent.ts';
import { loadText } from '../../factories/loadText.ts';

export const agent = defineAgent({
  name: 'verifier',
  description:
    'Verification suite runner — checks for correctness, boundary violations, and plan completeness.',
  model: 'opus',
  tools: ['Read', 'Grep', 'Glob', 'Bash'],
  prompt: loadText(import.meta.url, 'verifier.md'),
});
