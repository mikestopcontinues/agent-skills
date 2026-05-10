import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { aliasToolList } from '../aliases/toolNames.ts';
import { composeArtifact, type FrontmatterFields } from '../frontmatter.ts';
import type { CanonicalSources } from '../loadCanonicalSources.ts';

/** Claude Code expands `${CLAUDE_PLUGIN_ROOT}` inside `hooks/hooks.json` command
 *  strings (and `.mcp.json`, `monitors.json`) — but NOT inside skill/agent body
 *  text. Skill bodies therefore reference bundled files by skill-relative paths
 *  (`focuses/<f>.md`, `personas/<p>.md`), which resolve from the skill's own
 *  directory. The only use of this token in the bundle is the hook commands. */
const CC_PLUGIN_ROOT = '${CLAUDE_PLUGIN_ROOT}';

interface PluginMeta {
  name: string;
  version: string;
  description: string;
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
 *     skills/<name>/SKILL.md            (+ extras: focuses/, personas/, chapter.md, …)
 *     hooks/hooks.json                  ({ hooks: { <Event>: [ { matcher, hooks } ] } })
 *     hooks/<name>.sh
 *     scripts/<name>                    (yolo, doc-check-links.sh)
 *     docs/CLAUDE.md                    (project context, if present)
 *
 * Skill/agent bodies are emitted verbatim; bundled files they reference are
 * resolved by skill-relative path at runtime, not by token substitution.
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
    write(join(outDir, 'skills', def.name, 'SKILL.md'), composeArtifact(fields, readFileSync(bodyPath, 'utf8')));
    for (const [rel, abs] of extras.files) write(join(outDir, 'skills', def.name, rel), readFileSync(abs, 'utf8'));
  }

  // Agents (personas).
  for (const { agent, promptPath } of sources.agents) {
    const def = agent.def;
    const fields: FrontmatterFields = { name: def.name, description: def.description };
    if (def.model !== undefined) fields['model'] = def.model;
    fields['tools'] = aliasToolList('claude-code', def.tools).join(', ');
    write(join(outDir, 'agents', `${def.name}.md`), composeArtifact(fields, readFileSync(promptPath, 'utf8')));
  }

  // Hooks — bash handler scripts + a hooks.json grouping them by (event, matcher).
  // Plugin hooks.json is the same double-nested shape as settings.json:
  //   { "hooks": { "<Event>": [ { "matcher": "...", "hooks": [ {type,command} ] } ] } }
  type HookEntry = { type: 'command'; command: string };
  type MatcherBlock = { matcher: string; hooks: HookEntry[] };
  const byEvent = new Map<string, Map<string, HookEntry[]>>();
  for (const { hook, handlerPath } of sources.hooks) {
    const def = hook.def;
    write(join(outDir, 'hooks', `${def.name}.sh`), readFileSync(handlerPath, 'utf8'));
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
