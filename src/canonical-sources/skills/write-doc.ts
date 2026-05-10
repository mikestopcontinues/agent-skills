import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'write-doc',
  description:
    'Author or edit any document under docs/. Use for new chapter authoring, single-section edits, frontmatter touch-ups, or restructuring existing docs. Replaces edit-doc.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'write-doc.md'),
});
