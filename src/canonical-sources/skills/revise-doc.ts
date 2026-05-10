import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'revise-doc',
  description:
    'Apply act-pass changes to a document from rNN- review files (or an inline finding list). Walks each finding, edits the artifact, surfaces genuine contradictions, and reports applied vs deferred. Singleton; no Dispatch.',
  tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep'],
  body: loadText(import.meta.url, 'revise-doc.md'),
});
