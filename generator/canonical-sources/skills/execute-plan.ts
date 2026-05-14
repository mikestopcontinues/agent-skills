import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'execute-plan',
  description:
    'Per-phase plan execution lifecycle. Reads a plan\'s task breakdown, dispatches /write-code workers in worktrees one phase at a time, runs /validate-code per phase, then drives the triage / process / lock-decisions cycle to convergence before merging. Use when a captain asks to execute or build out an existing plan.',
  tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash', 'TodoWrite', 'Dispatch'],
  body: loadText(import.meta.url, 'execute-plan.md'),
});
