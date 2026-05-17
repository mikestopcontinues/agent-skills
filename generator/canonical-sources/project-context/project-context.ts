import { defineProjectContext } from '../../factories/defineProjectContext.ts';
import { loadText } from '../../factories/loadText.ts';

/**
 * The repo-root documentation-governance template the toolkit ships for
 * consumers to install into their `docs/`. One canonical content; the
 * generator emits it to whichever filename each harness reads — `CLAUDE.md`
 * for Claude Code, `AGENTS.md` for Codex and OpenCode.
 */
export const projectContext = defineProjectContext({
  name: 'docs-root-context',
  description:
    "The toolkit's docs/ navigation + governance doc — directory shape, the yolo CLI, the lifecycle skills, and the project/spike/plan/note/decision/review formats. Consumers install this into their repo's docs/.",
  content: loadText(import.meta.url, 'project-context.content.md'),
  harnessFilenames: {
    claudeCode: 'CLAUDE.md',
    codex: 'AGENTS.md',
    opencode: 'AGENTS.md',
  },
});
