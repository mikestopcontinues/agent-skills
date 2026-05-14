import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'write-convention',
  description:
    'Author, edit, or delete a convention file under docs/conventions/ and keep docs/AGENTS.md\'s convention list in sync. Use when adding or changing a project convention (style or process rule). Refuses any path outside docs/conventions/.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'write-convention.md'),
});
