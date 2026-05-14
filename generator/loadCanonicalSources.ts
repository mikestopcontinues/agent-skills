import { glob } from 'glob';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Skill } from './factories/defineSkill.ts';
import { Agent } from './factories/defineAgent.ts';
import { Hook } from './factories/defineHook.ts';
import { ProjectContext } from './factories/defineProjectContext.ts';

const repoRoot = resolve(import.meta.dirname, '..');
const canonRoot = resolve(repoRoot, 'generator/canonical-sources');

/** Extra files a skill ships alongside its SKILL.md — focus briefs, chapter
 *  templates, etc. Discovered as everything under `<name>.extras/`. */
export interface SkillExtras {
  /** Relative path under the skill's emit dir → absolute source path. */
  files: Map<string, string>;
}

export interface LoadedSkill {
  skill: Skill;
  /** Absolute path of `<name>.md` — the verbatim body sidecar. */
  bodyPath: string;
  /** Extra shipped files keyed by their path relative to the skill's emit dir. */
  extras: SkillExtras;
}

export interface LoadedAgent {
  agent: Agent;
  /** Absolute path of `<name>.md` — the verbatim prompt sidecar. */
  promptPath: string;
}

export interface LoadedHook {
  hook: Hook;
  /** Absolute path of `<name>.sh` — the verbatim bash handler sidecar. */
  handlerPath: string;
}

export interface CanonicalSources {
  skills: LoadedSkill[];
  agents: LoadedAgent[];
  hooks: LoadedHook[];
  projectContext?: ProjectContext;
  /** Shipped bash scripts (`yolo`, `doc-check-links.sh`): basename → abs path. */
  scripts: Map<string, string>;
}

async function importDefault<T>(file: string, exportName: string, ctor: new (...args: never) => T, label: string): Promise<T> {
  const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  const value = mod[exportName];
  if (!(value instanceof ctor)) {
    throw new Error(`${file}: expected a \`${exportName}\` export that is a ${label}`);
  }
  return value;
}

/**
 * Walk `generator/canonical-sources/` and `generator/scripts/`, importing every
 * `define*` module. The filesystem is the registry — no static import list.
 * Throws if any module fails to load or fails its factory validation, or if a
 * skill / agent / hook `name` does not match its filename.
 */
export async function loadCanonicalSources(): Promise<CanonicalSources> {
  const skillFiles = (await glob('skills/*.ts', { cwd: canonRoot, absolute: true })).sort();
  const skills: LoadedSkill[] = [];
  for (const file of skillFiles) {
    const base = file.replace(/.*\//, '').replace(/\.ts$/, '');
    const skill = await importDefault(file, 'skill', Skill, 'Skill');
    if (skill.def.name !== base) throw new Error(`${file}: skill name '${skill.def.name}' != filename`);
    const bodyPath = resolve(canonRoot, 'skills', `${base}.md`);
    const extrasRoot = resolve(canonRoot, 'skills', `${base}.extras`);
    // `.eval.md` sidecars under `<name>.extras/` are dev-only — never shipped.
    const extraFiles = await glob('**/*', { cwd: extrasRoot, absolute: true, nodir: true, ignore: ['**/*.eval.md'] });
    const files = new Map<string, string>();
    for (const abs of extraFiles) files.set(abs.slice(extrasRoot.length + 1), abs);
    skills.push({ skill, bodyPath, extras: { files } });
  }

  const agentFiles = (await glob('agents/*.ts', { cwd: canonRoot, absolute: true })).sort();
  const agents: LoadedAgent[] = [];
  for (const file of agentFiles) {
    const base = file.replace(/.*\//, '').replace(/\.ts$/, '');
    const agent = await importDefault(file, 'agent', Agent, 'Agent');
    if (agent.def.name !== base) throw new Error(`${file}: agent name '${agent.def.name}' != filename`);
    agents.push({ agent, promptPath: resolve(canonRoot, 'agents', `${base}.md`) });
  }

  const hookFiles = (await glob('hooks/*.ts', { cwd: canonRoot, absolute: true })).sort();
  const hooks: LoadedHook[] = [];
  for (const file of hookFiles) {
    const base = file.replace(/.*\//, '').replace(/\.ts$/, '');
    const hook = await importDefault(file, 'hook', Hook, 'Hook');
    if (hook.def.name !== base) throw new Error(`${file}: hook name '${hook.def.name}' != filename`);
    if (hook.def.handler.kind !== 'bash') throw new Error(`${file}: only bash handlers are supported in v0.1`);
    hooks.push({ hook, handlerPath: resolve(canonRoot, 'hooks', `${base}.sh`) });
  }

  const projectContextFiles = await glob('project-context.ts', { cwd: canonRoot, absolute: true });
  let projectContext: ProjectContext | undefined;
  if (projectContextFiles[0]) {
    projectContext = await importDefault(projectContextFiles[0], 'projectContext', ProjectContext, 'ProjectContext');
  }

  // `.eval.md` sidecars in generator/scripts/ are dev-only — never shipped.
  const scriptFiles = await glob('*', { cwd: resolve(repoRoot, 'generator/scripts'), absolute: true, nodir: true, ignore: ['*.eval.md'] });
  const scripts = new Map<string, string>();
  for (const abs of scriptFiles) scripts.set(abs.replace(/.*\//, ''), abs);

  return { skills, agents, hooks, projectContext, scripts };
}
