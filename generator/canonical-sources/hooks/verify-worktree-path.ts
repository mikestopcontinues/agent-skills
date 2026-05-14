import { defineHook } from '../../factories/defineHook.ts';
import { loadText } from '../../factories/loadText.ts';

export const hook = defineHook({
  name: 'verify-worktree-path',
  event: 'PreToolUse',
  matcher: 'Edit|Write',
  handler: { kind: 'bash', command: loadText(import.meta.url, 'verify-worktree-path.sh') },
});
