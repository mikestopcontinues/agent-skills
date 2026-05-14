import * as v from 'valibot';
import { type ProjectContextDef, ProjectContextDefSchema } from './types/projectContextTypes.ts';

/** A validated project-context (repo-root `CLAUDE.md` / `AGENTS.md`) template. */
export class ProjectContext {
  readonly def: ProjectContextDef;
  constructor(def: ProjectContextDef) {
    this.def = def;
  }
}

/** Validate a project-context definition (throws on invalid) and wrap it. */
export function defineProjectContext(def: ProjectContextDef): ProjectContext {
  v.parse(ProjectContextDefSchema, def);
  return new ProjectContext(def);
}
