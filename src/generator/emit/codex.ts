import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { aliasToolList } from '../aliases/toolNames.ts';
import { composeArtifact, type FrontmatterFields } from '../frontmatter.ts';
import type { CanonicalSources } from '../loadCanonicalSources.ts';

/** Token in canonical bodies for "the directory the toolkit's files live in".
 *  Codex plugins resolve files relative to the plugin root; `${CODEX_PLUGIN_ROOT}`
 *  is the v0.1 substitution — exact value pending Ch10 eval validation. */
const SKILL_HOME_TOKEN = '__SKILL_HOME__';
const CODEX_SKILL_HOME = '${CODEX_PLUGIN_ROOT}';

interface PluginMeta {
  name: string;
  version: string;
  description: string;
}

/** Substitute the toolkit-home placeholder for the Codex plugin layout. */
function subSkillHome(text: string): string {
  return text.split(SKILL_HOME_TOKEN).join(CODEX_SKILL_HOME);
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function copyExecutable(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
}

/** Serialize a TOML basic string (`"..."`) — escapes `\`, `"`, newline, tab. */
function tomlBasicString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

/** Serialize a TOML multi-line basic string (`"""..."""`). The opening delimiter
 *  is followed by a newline (trimmed by TOML parsers), so the value reads cleanly.
 *  Any literal `"""` in the value is escaped to keep the block well-formed. */
function tomlMultilineString(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
  return `"""\n${escaped}"""`;
}

/** Serialize a TOML array of strings (`["a", "b"]`). */
function tomlStringArray(values: readonly string[]): string {
  return `[${values.map(tomlBasicString).join(', ')}]`;
}

/**
 * Emit the Codex plugin bundle to `outDir` (plugin install path only — per the
 * captain decision, the non-plugin / `codex_hooks` variants are not emitted):
 *
 *   <outDir>/
 *     .codex-plugin/plugin.json
 *     skills/<name>/SKILL.md            (+ extras: focuses/, chapter.md, …)
 *     agents/<role>.toml
 *     hooks.json
 *     hooks/<name>.sh
 *     scripts/<name>                    (yolo, doc-check-links.sh)
 *     docs/AGENTS.md                    (project context, if present)
 *
 * `__SKILL_HOME__` in skill/agent bodies is substituted to `${CODEX_PLUGIN_ROOT}`.
 * Per d12: zero `notify` entries — `notify` is not a hook fallback.
 */
export function emitCodex(sources: CanonicalSources, outDir: string, meta: PluginMeta): void {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Plugin manifest (minimal — no vendored Codex manifest schema yet).
  write(
    join(outDir, '.codex-plugin', 'plugin.json'),
    JSON.stringify({ name: meta.name, version: meta.version, description: meta.description }, null, 2) + '\n',
  );

  // Skills — Codex skill frontmatter is `name` + `description` only (no `tools` line).
  for (const { skill, bodyPath, extras } of sources.skills) {
    const def = skill.def;
    const fields: FrontmatterFields = { name: def.name, description: def.description };
    const body = subSkillHome(readFileSync(bodyPath, 'utf8'));
    write(join(outDir, 'skills', def.name, 'SKILL.md'), composeArtifact(fields, body));
    for (const [rel, abs] of extras.files) {
      write(join(outDir, 'skills', def.name, rel), subSkillHome(readFileSync(abs, 'utf8')));
    }
  }

  // Agents (personas) — one TOML file per role.
  for (const { agent, promptPath } of sources.agents) {
    const def = agent.def;
    const prompt = subSkillHome(readFileSync(promptPath, 'utf8'));
    const lines = [
      `description = ${tomlBasicString(def.description)}`,
      `developer_instructions = ${tomlMultilineString(prompt)}`,
      `model = ${tomlBasicString(def.model ?? 'opus')}`,
      `tools = ${tomlStringArray(aliasToolList('codex', def.tools))}`,
    ];
    write(join(outDir, 'agents', `${def.name}.toml`), lines.join('\n') + '\n');
  }

  // Hooks — bash handler scripts + a hooks.json grouping them by (event, matcher),
  // same structure as the Claude Code emit. Zero `notify` entries (d12).
  type HookEntry = { type: 'command'; command: string };
  type MatcherBlock = { matcher: string; hooks: HookEntry[] };
  const byEvent = new Map<string, Map<string, HookEntry[]>>();
  for (const { hook, handlerPath } of sources.hooks) {
    const def = hook.def;
    write(join(outDir, 'hooks', `${def.name}.sh`), readFileSync(handlerPath, 'utf8'));
    if (!byEvent.has(def.event)) byEvent.set(def.event, new Map());
    const byMatcher = byEvent.get(def.event)!;
    if (!byMatcher.has(def.matcher)) byMatcher.set(def.matcher, []);
    byMatcher.get(def.matcher)!.push({ type: 'command', command: `${CODEX_SKILL_HOME}/hooks/${def.name}.sh` });
  }
  const hooksJson: Record<string, MatcherBlock[]> = {};
  for (const [event, byMatcher] of byEvent) {
    hooksJson[event] = [...byMatcher].map(([matcher, hooks]) => ({ matcher, hooks }));
  }
  write(join(outDir, 'hooks.json'), JSON.stringify(hooksJson, null, 2) + '\n');

  // Shipped scripts.
  for (const [name, abs] of sources.scripts) copyExecutable(abs, join(outDir, 'scripts', name));

  // Project context (if present): docs/AGENTS.md.
  if (sources.projectContext) {
    write(join(outDir, 'docs', sources.projectContext.def.harnessFilenames.codex), sources.projectContext.def.content);
  }
}

/** Convenience: emit using the agent-skills package's name/version. */
export function emitCodexFromPackage(sources: CanonicalSources, outDir: string): void {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../package.json'), 'utf8')) as {
    name: string;
    version: string;
    description: string;
  };
  emitCodex(sources, outDir, pkg);
}
