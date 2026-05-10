import * as v from 'valibot';

/**
 * The canonical tool registry — the union of tool names the toolkit's skills and
 * agents reference. These are the names used in the Phase 1 `.claude/`
 * end-state; the generator's per-harness adapter (Ch9 `aliases/toolNames.ts`)
 * maps them to whatever each harness calls the same capability (e.g. `Dispatch`
 * → Claude Code's `Task`).
 */
export const TOOL_NAMES = [
  'Read',
  'Edit',
  'Write',
  'Glob',
  'Grep',
  'Bash',
  'WebFetch',
  'WebSearch',
  'TodoWrite',
  'Dispatch',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const ToolNameSchema = v.picklist(TOOL_NAMES);
