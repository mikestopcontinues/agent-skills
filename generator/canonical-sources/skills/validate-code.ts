import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'validate-code',
  description:
    'Code review dispatcher — fans out per-focus review-code subagents in parallel against a code artifact (diff, file, or directory) and returns a summary. Called by write-code, execute-plan, and ad-hoc by the captain.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'validate-code.md'),
});
