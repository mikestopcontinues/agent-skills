import { defineSkill } from '../../../factories/defineSkill.ts';
import { loadText } from '../../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'yolo-project',
  description:
    'Top-level intent router. Identifies what the captain is asking for, ensures project context is loaded for project-bound work, and chains to the right lifecycle skill via /skill-name. Catch-all for ambiguous prompts like \'let\'s work on X\' — refuses to auto-route when intent is unclear.',
  tools: ['Read', 'Glob', 'Grep', 'Bash'],
  body: loadText(import.meta.url, 'yolo-project.md'),
});
