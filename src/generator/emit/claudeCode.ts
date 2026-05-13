import { chmodSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { aliasToolList } from '../aliases/toolNames.ts';
import { composeArtifact, type FrontmatterFields } from '../frontmatter.ts';
import type { CanonicalSources } from '../loadCanonicalSources.ts';

/** Canonical placeholder for "the toolkit's install directory". Claude Code
 *  expands `${CLAUDE_PLUGIN_ROOT}` both inside `hooks/hooks.json` command strings
 *  and inside plugin-shipped skill/agent body text, so the placeholder maps to it
 *  directly. */
const SKILL_HOME_TOKEN = '__SKILL_HOME__';
const CC_PLUGIN_ROOT = '${CLAUDE_PLUGIN_ROOT}';

/** Substitute the toolkit-home placeholder for the Claude Code plugin layout. */
function subSkillHome(text: string): string {
  return text.split(SKILL_HOME_TOKEN).join(CC_PLUGIN_ROOT);
}

interface PluginMeta {
  name: string;
  version: string;
  description: string;
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/** Copy a file and ensure it's executable (`0o755`). Used for hook handlers and
 *  shipped scripts (`yolo`, `doc-check-links.sh`) — Claude Code execs hook
 *  command paths directly, so the bit must be set in the bundle regardless of
 *  what the on-disk source happens to be. */
function copyExecutable(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  chmodSync(to, 0o755);
}

/**
 * Emit the Claude Code plugin bundle to `outDir`:
 *
 *   <outDir>/
 *     .claude-plugin/plugin.json
 *     agents/<name>.md
 *     skills/<name>/SKILL.md            (+ extras: focuses/, personas/, chapter.md, …)
 *     hooks/hooks.json                  ({ hooks: { <Event>: [ { matcher, hooks } ] } })
 *     hooks/<name>.sh
 *     scripts/<name>                    (yolo, doc-check-links.sh)
 *     docs/CLAUDE.md                    (project context, if present)
 *
 * `__SKILL_HOME__` in skill bodies / skill extras / agent prompts is substituted
 * to `${CLAUDE_PLUGIN_ROOT}`, which Claude Code expands in plugin-shipped content.
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
    write(join(outDir, 'skills', def.name, 'SKILL.md'), composeArtifact(fields, subSkillHome(readFileSync(bodyPath, 'utf8'))));
    for (const [rel, abs] of extras.files) write(join(outDir, 'skills', def.name, rel), subSkillHome(readFileSync(abs, 'utf8')));
  }

  // Agents (personas).
  for (const { agent, promptPath } of sources.agents) {
    const def = agent.def;
    const fields: FrontmatterFields = { name: def.name, description: def.description };
    if (def.model !== undefined) fields['model'] = def.model;
    fields['tools'] = aliasToolList('claude-code', def.tools).join(', ');
    write(join(outDir, 'agents', `${def.name}.md`), composeArtifact(fields, subSkillHome(readFileSync(promptPath, 'utf8'))));
  }

  // Hooks — bash handler scripts + a hooks.json grouping them by (event, matcher).
  // Plugin hooks.json is the same double-nested shape as settings.json:
  //   { "hooks": { "<Event>": [ { "matcher": "...", "hooks": [ {type,command} ] } ] } }
  type HookEntry = { type: 'command'; command: string };
  type MatcherBlock = { matcher: string; hooks: HookEntry[] };
  const byEvent = new Map<string, Map<string, HookEntry[]>>();
  for (const { hook, handlerPath } of sources.hooks) {
    const def = hook.def;
    copyExecutable(handlerPath, join(outDir, 'hooks', `${def.name}.sh`));
    if (!byEvent.has(def.event)) byEvent.set(def.event, new Map());
    const byMatcher = byEvent.get(def.event)!;
    if (!byMatcher.has(def.matcher)) byMatcher.set(def.matcher, []);
    byMatcher.get(def.matcher)!.push({ type: 'command', command: `${CC_PLUGIN_ROOT}/hooks/${def.name}.sh` });
  }
  const events: Record<string, MatcherBlock[]> = {};
  for (const [event, byMatcher] of byEvent) {
    events[event] = [...byMatcher].map(([matcher, hooks]) => ({ matcher, hooks }));
  }
  write(join(outDir, 'hooks', 'hooks.json'), JSON.stringify({ hooks: events }, null, 2) + '\n');

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
