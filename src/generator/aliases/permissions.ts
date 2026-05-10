import type { HarnessId } from '../../factories/types/harnessId.ts';
import type { PermissionRuleset } from '../../factories/types/permissionRuleset.ts';

/**
 * Map a canonical permission ruleset (Claude Code-shaped — `allow` / `deny` /
 * `ask` lists of rule strings like `Bash(pnpm *)` or `Write(.claude/**)`) to a
 * harness's permission model.
 *
 * - Claude Code: identity (the canonical DSL *is* the CC shape).
 * - Codex / OpenCode: v0.1 carries the canonical ruleset through unchanged —
 *   no toolkit artifact currently sets `permission`, so there's nothing to
 *   translate yet. When a per-agent permission ruleset is first introduced for
 *   a non-CC harness, extend this with the real mapping (Codex `sandbox_mode`
 *   + per-tool allowlists; OpenCode's `permission` block).
 */
export function aliasPermissionRuleset(
  _harness: HarnessId,
  ruleset: PermissionRuleset,
): PermissionRuleset {
  return ruleset;
}
