import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'start-session',
  description:
    'Session orientation — detect worktree state, identify the active project (xNNN-), summarize where work was left off, and suggest the most likely next step. Invoked at the start of every new conversation; waits for captain direction before acting.',
  tools: ['Read', 'Glob', 'Grep', 'Bash'],
  body: loadText(import.meta.url, 'start-session.md'),
});
