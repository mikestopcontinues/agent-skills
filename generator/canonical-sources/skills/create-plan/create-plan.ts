import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'create-plan',
  description:
    'Plan creation lifecycle — orchestrates project context, per-chapter authoring, and the validate-loop (validate-doc → triage-feedback → revise-doc / process-feedback / lock-decisions) to convergence. Use when the captain asks for a tech spec, implementation plan, or follow-on plan derived from a spike.',
  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.
  body: loadText(import.meta.url, 'create-plan.md'),
});
