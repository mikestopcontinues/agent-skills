import { defineHook } from '../../factories/defineHook.ts';
import { loadText } from '../../factories/loadText.ts';

export const hook = defineHook({
  name: 'pre-commit-gate',
  event: 'PreToolUse',
  matcher: 'Bash',
  handler: { kind: 'bash', command: loadText(import.meta.url, 'pre-commit-gate.sh') },
});
