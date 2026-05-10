import * as v from 'valibot';
import { type SkillDef, SkillDefSchema } from './types/skillTypes.ts';

/** A validated skill definition. The generator discovers `Skill` instances by
 *  glob over `canonical-sources/skills/`. */
export class Skill {
  readonly def: SkillDef;
  constructor(def: SkillDef) {
    this.def = def;
  }
}

/** Validate a skill definition (throws on invalid) and wrap it. Called at
 *  module load — a malformed canonical source fails fast. */
export function defineSkill(def: SkillDef): Skill {
  v.parse(SkillDefSchema, def);
  return new Skill(def);
}
