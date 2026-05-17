import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'process-feedback',
  description:
    'Per-cluster feedback handler. Reads one cluster + artifact + relevant rNN- review files, deep-dives ambiguous clusters against primary sources, and emits exactly one of two canonical verdict shapes — verified-resolution or narrowed-options-brief. Subagent; no Dispatch.',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch'],
  body: loadText(import.meta.url, 'process-feedback.md'),
});
