import { defineHook } from '../../factories/defineHook.ts';
import { loadText } from '../../factories/loadText.ts';

export const hook = defineHook({
  name: 'block-main-edits',
  event: 'PreToolUse',
  matcher: 'Bash',
  handler: { kind: 'bash', command: loadText(import.meta.url, 'block-main-edits.sh') },
});
