import * as v from 'valibot';
import { alignSchema } from './valibot.ts';
import { type ToolName, ToolNameSchema } from './toolNames.ts';
import { type HookSpec, HookSpecSchema } from './hookTypes.ts';
import { type PermissionRuleset, PermissionRulesetSchema } from './permissionRuleset.ts';

/**
 * A persona agent — a reusable cognitive lens (priorities, thinking style,
 * strategies), not a task bot. The task goes in the dispatch prompt; the agent
 * supplies the perspective. See d15.
 */
export interface AgentDef {
  /** kebab-case, leading lowercase letter. */
  name: string;
  /** Short description of the persona's lens — shown in the agent picker. */
  description: string;
  /** Canonical tool names available when this persona is dispatched. */
  tools: ToolName[];
  /** The persona prompt — transcribed verbatim from the Phase 1 source. */
  prompt: string;
  /** Per-agent model override (e.g. `opus`). */
  model?: string;
  /** Per-agent hook scoping — hook names that apply only to this agent. */
  hooks?: HookSpec[];
  /** Skills to preload when this agent runs. */
  skills?: string[];
  /** Per-agent permission ruleset. */
  permission?: PermissionRuleset;
}

const AGENT_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

export const AgentDefSchema = alignSchema<AgentDef>()(
  v.object({
    name: v.pipe(v.string(), v.regex(AGENT_NAME_REGEX)),
    description: v.pipe(v.string(), v.minLength(1)),
    tools: v.array(ToolNameSchema),
    prompt: v.pipe(v.string(), v.minLength(1)),
    model: v.optional(v.string()),
    hooks: v.optional(v.array(HookSpecSchema)),
    skills: v.optional(v.array(v.string())),
    permission: v.optional(PermissionRulesetSchema),
  }),
);
