import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'create-spike',
  description:
    'Spike lifecycle orchestrator — composes /launch-project, /write-doc, /validate-doc, /triage-feedback, /process-feedback, /revise-doc, and /lock-decisions to drive a full spike from research question to converged chapters with pending clusters surfaced. Use when starting a research spike or resuming one mid-iteration.',
  tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch', 'TodoWrite', 'Dispatch'],
  body: loadText(import.meta.url, 'create-spike.md'),
});
