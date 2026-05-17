import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'review-doc',
  description:
    'Single-focus document review subagent — resolves a focus brief, adopts the named persona, reviews one artifact through one focus, writes one rNN-{focus}.md alongside the artifact; never fans out.',
  tools: ['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch'],
  body: loadText(import.meta.url, 'review-doc.md'),
});
