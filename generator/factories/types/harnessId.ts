import * as v from 'valibot';

/** The harnesses the toolkit emits bundles for. */
export const HARNESS_IDS = ['claude-code', 'codex', 'opencode'] as const;

export type HarnessId = (typeof HARNESS_IDS)[number];

export const HarnessIdSchema = v.picklist(HARNESS_IDS);
