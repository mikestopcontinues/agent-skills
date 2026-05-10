import type { HarnessId } from '../../factories/types/harnessId.ts';
import type { ToolName } from '../../factories/types/toolNames.ts';

/**
 * Canonical tool name → per-harness tool name. A canonical name absent from a
 * harness's map emits unchanged (identity). Only the subagent-dispatch tool
 * differs across harnesses (per spike d04 / Ch9): canonical `Dispatch` is
 * Claude Code's `Dispatch` (the Phase 1 frontmatter uses that name verbatim),
 * Codex's `spawn` (`multi_agent_v2`), OpenCode's `task`.
 */
const TOOL_ALIASES: Record<HarnessId, Partial<Record<ToolName, string>>> = {
  'claude-code': {},
  codex: { Dispatch: 'spawn' },
  opencode: { Dispatch: 'task' },
};

/** Map a canonical tool name to its name in the given harness. */
export function aliasToolName(harness: HarnessId, name: ToolName): string {
  return TOOL_ALIASES[harness][name] ?? name;
}

/** Map a canonical tools list to the harness's names, in order. */
export function aliasToolList(harness: HarnessId, tools: readonly ToolName[]): string[] {
  return tools.map((t) => aliasToolName(harness, t));
}

/**
 * Reverse the aliasing — recover the canonical name from a harness name. Used
 * by `tool-aliasing.test.ts` to assert round-trip fidelity. Throws if the
 * harness name has no canonical preimage.
 */
export function deAliasToolName(harness: HarnessId, harnessName: string): ToolName {
  const map = TOOL_ALIASES[harness];
  for (const [canon, alias] of Object.entries(map) as Array<[ToolName, string]>) {
    if (alias === harnessName) return canon;
  }
  return harnessName as ToolName;
}
