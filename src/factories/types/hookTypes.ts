import * as v from 'valibot';
import { alignSchema } from './valibot.ts';

/** Lifecycle events a hook can bind to (Claude Code's event vocabulary; the
 *  canonical superset — other harnesses cover a subset). */
export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'UserPromptSubmit',
  'Stop',
  'SubagentStop',
  'SessionStart',
  'SessionEnd',
  'PreCompact',
  'Notification',
] as const;

export type HookEvent = (typeof HOOK_EVENTS)[number];

export const HookEventSchema = v.picklist(HOOK_EVENTS);

/**
 * Matcher pattern — for tool events, a tool name or `|`-alternated set
 * (`"Bash"`, `"Edit|Write"`). Empty for events that have no tool.
 */
export type HookMatcher = string;

export const HookMatcherSchema = v.string();

/** A hook handler. Pure data: a bash command, or a TS module reference (used by
 *  the OpenCode emitter, which inlines the function into its TS plugin). */
export type HandlerSpec =
  | { kind: 'bash'; command: string }
  | { kind: 'module'; modulePath: string; exportName: string };

export const HandlerSpecSchema: v.GenericSchema<HandlerSpec> = v.variant('kind', [
  v.object({
    kind: v.literal('bash'),
    command: v.pipe(v.string(), v.minLength(1)),
  }),
  v.object({
    kind: v.literal('module'),
    modulePath: v.pipe(v.string(), v.minLength(1)),
    exportName: v.pipe(v.string(), v.minLength(1)),
  }),
]);

export interface HookDef {
  /** kebab-case, leading lowercase letter. */
  name: string;
  event: HookEvent;
  matcher: HookMatcher;
  handler: HandlerSpec;
}

const HOOK_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

export const HookDefSchema = alignSchema<HookDef>()(
  v.object({
    name: v.pipe(v.string(), v.regex(HOOK_NAME_REGEX)),
    event: HookEventSchema,
    matcher: HookMatcherSchema,
    handler: HandlerSpecSchema,
  }),
);

/** A reference to a hook from an agent's per-agent hook scoping. For v0.1 this
 *  is just the hook name; the generator resolves it against the hook registry. */
export type HookSpec = string;

export const HookSpecSchema = v.string();
