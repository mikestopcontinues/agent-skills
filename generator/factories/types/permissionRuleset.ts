import * as v from 'valibot';
import { alignSchema } from './valibot.ts';

/**
 * A permission ruleset in the canonical (Claude Code-shaped) DSL — rule strings
 * like `Bash(pnpm *)` or `Write(.claude/**)`. The generator's
 * `aliases/permissions.ts` (Ch9) maps these to each harness's permission model.
 */
export interface PermissionRuleset {
  allow?: string[];
  deny?: string[];
  ask?: string[];
}

export const PermissionRulesetSchema = alignSchema<PermissionRuleset>()(
  v.object({
    allow: v.optional(v.array(v.string())),
    deny: v.optional(v.array(v.string())),
    ask: v.optional(v.array(v.string())),
  }),
);
