import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'archive-project',
  description:
    'Archive lifecycle — condense an xNNN- project to a single archived README; promote important decisions to top-level docs/decisions/; move follow-up to docs/notes/; rewrite cross-references; validate the condensed README; commit atomically. Single-pass variant of the validate-loop. Captain confirms decision promotions per item and the staged README before any source content is deleted.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'archive-project.md'),
});
