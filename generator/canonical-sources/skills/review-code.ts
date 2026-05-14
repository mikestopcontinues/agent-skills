import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'review-code',
  description:
    'Single-focus code-review subagent — resolves a focus brief, adopts the named persona, reviews one code change (a diff) through one focus, writes one rNN-{focus}.md; never fans out.',
  tools: ['Read', 'Glob', 'Grep', 'Bash'],
  body: loadText(import.meta.url, 'review-code.md'),
});
