import * as v from 'valibot';
import { alignSchema } from './valibot.ts';
import { type ToolName, ToolNameSchema } from './toolNames.ts';
import { type HarnessId, HarnessIdSchema } from './harnessId.ts';

/**
 * Optional, harness-specific skill metadata. Canonical keys are camelCase; the
 * generator transforms to each harness's frontmatter dialect at emit time
 * (`shortDescription` → `short-description`, etc.).
 */
export interface SkillMetadata {
  /** Codex `short-description`. */
  shortDescription?: string;
  /** OpenCode `compatibility` — which harnesses this skill is meant for. */
  compatibility?: HarnessId[];
  /** OpenCode `license`. */
  license?: string;
  /** Claude Code `disable-model-invocation`. */
  disableModelInvocation?: boolean;
}

export interface SkillDef {
  /** `/skill-name` — kebab-case, leading lowercase letter. */
  name: string;
  /** Prescriptive description — tells the model when to invoke the skill. */
  description: string;
  /** Canonical tool names the skill body assumes are available. */
  tools: ToolName[];
  /** The SKILL.md body — transcribed verbatim from the Phase 1 source. */
  body: string;
  metadata?: SkillMetadata;
}

const SKILL_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

export const SkillMetadataSchema = alignSchema<SkillMetadata>()(
  v.object({
    shortDescription: v.optional(v.string()),
    compatibility: v.optional(v.array(HarnessIdSchema)),
    license: v.optional(v.string()),
    disableModelInvocation: v.optional(v.boolean()),
  }),
);

export const SkillDefSchema = alignSchema<SkillDef>()(
  v.object({
    name: v.pipe(v.string(), v.regex(SKILL_NAME_REGEX)),
    description: v.pipe(v.string(), v.minLength(1)),
    tools: v.array(ToolNameSchema),
    body: v.pipe(v.string(), v.minLength(1)),
    metadata: v.optional(SkillMetadataSchema),
  }),
);
