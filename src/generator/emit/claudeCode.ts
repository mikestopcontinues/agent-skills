import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { aliasToolList } from '../aliases/toolNames.ts';
import { composeArtifact, type FrontmatterFields } from '../frontmatter.ts';
import type { CanonicalSources } from '../loadCanonicalSources.ts';

/** Token in canonical bodies for "the directory the toolkit's files live in".
 *  Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}` in plugin-shipped content. */
const SKILL_HOME_TOKEN = '__SKILL_HOME__';
const CC_SKILL_HOME = '${CLAUDE_PLUGIN_ROOT}';

interface PluginMeta {
  name: string;
  version: string;
  description: string;
}

/** Substitute the toolkit-home placeholder for the Claude Code plugin layout. */
function subSkillHome(text: string): string {
  return text.split(SKILL_HOME_TOKEN).join(CC_SKILL_HOME);
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function copyExecutable(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
}

/**
 * Emit the Claude Code plugin bundle to `outDir`:
 *
 *   <outDir>/
 *     .claude-plugin/plugin.json
 *     agents/<name>.md
 *     skills/<name>/SKILL.md            (+ extras: focuses/, chapter.md, …)
 *     hooks/hooks.json
 *     hooks/<name>.sh
 *     scripts/<name>                    (yolo, doc-check-links.sh)
 *
 * `__SKILL_HOME__` in skill/agent bodies is substituted to
 * `${CLAUDE_PLUGIN_ROOT}` (Claude Code expands that in plugin-shipped content).
 */
export function emitClaudeCode(sources: CanonicalSources, outDir: string, meta: PluginMeta): void {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Plugin manifest.
  write(
    join(outDir, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: meta.name, version: meta.version, description: meta.description }, null, 2) + '\n',
  );

  // Skills.
  for (const { skill, bodyPath, extras } of sources.skills) {
    const def = skill.def;
    const fields: FrontmatterFields = { name: def.name, description: def.description };
    if (def.tools !== undefined) fields['tools'] = aliasToolList('claude-code', def.tools).join(', ');
    const body = subSkillHome(readFileSync(bodyPath, 'utf8'));
    write(join(outDir, 'skills', def.name, 'SKILL.md'), composeArtifact(fields, body));
    for (const [rel, abs] of extras.files) {
      const text = subSkillHome(readFileSync(abs, 'utf8'));
      write(join(outDir, 'skills', def.name, rel), text);
    }
  }

  // Agents (personas).
  for (const { agent, promptPath } of sources.agents) {
    const def = agent.def;
    const fields: FrontmatterFields = { name: def.name, description: def.description };
    if (def.model !== undefined) fields['model'] = def.model;
    fields['tools'] = aliasToolList('claude-code', def.tools).join(', ');
    const prompt = subSkillHome(readFileSync(promptPath, 'utf8'));
    write(join(outDir, 'agents', `${def.name}.md`), composeArtifact(fields, prompt));
  }

  // Hooks — bash handler scripts + a hooks.json grouping them by (event, matcher).
  type HookEntry = { type: 'command'; command: string };
  type MatcherBlock = { matcher: string; hooks: HookEntry[] };
  const byEvent = new Map<string, Map<string, HookEntry[]>>();
  for (const { hook, handlerPath } of sources.hooks) {
    const def = hook.def;
    write(join(outDir, 'hooks', `${def.name}.sh`), readFileSync(handlerPath, 'utf8'));
    if (!byEvent.has(def.event)) byEvent.set(def.event, new Map());
    const byMatcher = byEvent.get(def.event)!;
    if (!byMatcher.has(def.matcher)) byMatcher.set(def.matcher, []);
    byMatcher.get(def.matcher)!.push({ type: 'command', command: `${CC_SKILL_HOME}/hooks/${def.name}.sh` });
  }
  const hooksJson: Record<string, MatcherBlock[]> = {};
  for (const [event, byMatcher] of byEvent) {
    hooksJson[event] = [...byMatcher].map(([matcher, hooks]) => ({ matcher, hooks }));
  }
  write(join(outDir, 'hooks', 'hooks.json'), JSON.stringify(hooksJson, null, 2) + '\n');

  // Shipped scripts.
  for (const [name, abs] of sources.scripts) copyExecutable(abs, join(outDir, 'scripts', name));

  // Project context (if present): docs/CLAUDE.md.
  if (sources.projectContext) {
    write(join(outDir, 'docs', sources.projectContext.def.harnessFilenames.claudeCode), sources.projectContext.def.content);
  }
}

/** Convenience: emit using the agent-skills package's name/version. */
export function emitClaudeCodeFromPackage(sources: CanonicalSources, outDir: string): void {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../package.json'), 'utf8')) as {
    name: string;
    version: string;
    description: string;
  };
  emitClaudeCode(sources, outDir, pkg);
}
