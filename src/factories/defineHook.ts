import * as v from 'valibot';
import { type HookDef, HookDefSchema } from './types/hookTypes.ts';

/** A validated hook definition. */
export class Hook {
  readonly def: HookDef;
  constructor(def: HookDef) {
    this.def = def;
  }
}

/** Validate a hook definition (throws on invalid) and wrap it. */
export function defineHook(def: HookDef): Hook {
  v.parse(HookDefSchema, def);
  return new Hook(def);
}
