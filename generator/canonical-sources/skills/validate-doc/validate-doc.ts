import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'validate-doc',
  description:
    'Document validation dispatcher — fans out parallel review-doc subagents per focus, derives sequential rNN- file numbers, and returns a per-reviewer summary. Called by lifecycle skills (create-spike, create-plan, archive-project) and ad-hoc validation rounds.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'validate-doc.md'),
});
