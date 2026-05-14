import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'triage-feedback',
  description:
    'Cluster-routing skill — dispatches the reviewer persona to read every rNN-{focus}.md for an artifact, dedupe across reviewers, cluster by topic, severity-normalize, mark ambiguity/blocking, and route each cluster per d11/d08/d14. A thin wrapper around one reviewer dispatch; the triage process lives in this body.',
  tools: ['Read', 'Glob', 'Grep', 'Dispatch'],
  body: loadText(import.meta.url, 'triage-feedback.md'),
});
