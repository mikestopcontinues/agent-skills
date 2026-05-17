import { defineHook } from '../../../factories/defineHook.ts';
import { loadText } from '../../../factories/loadText.ts';

export const hook = defineHook({
  name: 'pre-write-doc',
  event: 'PreToolUse',
  matcher: 'Write',
  handler: { kind: 'bash', command: loadText(import.meta.url, 'pre-write-doc.sh') },
});
