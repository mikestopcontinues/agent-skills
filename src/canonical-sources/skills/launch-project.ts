import { defineSkill } from '../../factories/defineSkill.ts';
import { loadText } from '../../factories/loadText.ts';

export const skill = defineSkill({
  name: 'launch-project',
  description:
    'Materialize or load a project context as precondition for lifecycle skills. Resolves the target project from cwd or an explicit name in the prompt; loads README, tasks.md, decisions/, notes/ for an existing project; scaffolds a new project skeleton if the resolved name doesn\'t exist. Refuses (with one bounded retry) when no project is determinable. Returns project metadata to the calling skill.',
  tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'],
  body: loadText(import.meta.url, 'launch-project.md'),
});
