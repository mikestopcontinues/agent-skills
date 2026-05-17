import { chmodSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { aliasToolList } from '../aliases/toolNames.ts';
import { composeArtifact, type FrontmatterFields } from '../frontmatter.ts';
import type { CanonicalSources } from '../loadCanonicalSources.ts';

/** Canonical placeholder for "the toolkit's install directory". Codex injects
 *  `${CLAUDE_PLUGIN_ROOT}` (verified in `codex-rs/hooks/src/engine/discovery.rs`)
 *  for OOTB compat with Claude Code plugins — both inside hook command strings
 *  and inside plugin-shipped skill / agent content. */
const SKILL_HOME_TOKEN = '__SKILL_HOME__';
const CLAUDE_PLUGIN_ROOT = '${CLAUDE_PLUGIN_ROOT}';

/** Substitute the toolkit-home placeholder for the Codex plugin layout. */
function subSkillHome(text: string): string {
  return text.split(SKILL_HOME_TOKEN).join(CLAUDE_PLUGIN_ROOT);
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
 *  shipped scripts — Codex execs hook command paths directly, so the bit must
 *  be set in the bundle regardless of the on-disk source. */
function copyExecutable(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  chmodSync(to, 0o755);
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
 *     skills/<name>/SKILL.md            (+ extras: focuses/, personas/, chapter.md, …)
 *     agents/<role>.toml
 *     hooks.json                        ({ hooks: { <Event>: [ { matcher, hooks } ] } })
 *     hooks/<name>.sh
 *     scripts/<name>                    (yolo, doc-check-links.sh)
 *     docs/AGENTS.md                    (project context, if present)
 *
 * `__SKILL_HOME__` in skill bodies / skill extras / agent prompts is substituted
 * to `${CLAUDE_PLUGIN_ROOT}` — Codex injects that token for OOTB compat with
 * Claude Code plugins. Per d12: zero `notify` entries — `notify` is not a
 * hook fallback. The `hooks.json` shape mirrors the Claude Code emit pending a
 * vendored Codex schema.
 */
export function emitCodex(sources: CanonicalSources, outDir: string, meta: PluginMeta): void {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Plugin manifest. The `skills` field is load-bearing — Codex's plugin loader
  // refuses to surface skills without it (verified empirically: omitting it
  // leaves the plugin enabled-but-invisible). `name` must match the marketplace
  // entry (`plugins[].name`) so `<name>@<marketplace>` activation lines up.
  // Reference shape: openai-bundled / openai-curated plugins.
  write(
    join(outDir, '.codex-plugin', 'plugin.json'),
    JSON.stringify(
      {
        name: 'agent-skills',
        version: meta.version,
        description: meta.description,
        skills: './skills/',
        interface: {
          displayName: 'Agent Skills',
          shortDescription: 'Lifecycle skills, persona agents, and governance hooks.',
          category: 'Engineering',
        },
      },
      null,
      2,
    ) + '\n',
  );

  // Skills — Codex skill frontmatter is `name` + `description` only (no `tools` line).
  for (const { skill, bodyPath, extras } of sources.skills) {
    const def = skill.def;
    const fields: FrontmatterFields = { name: def.name, description: def.description };
    write(join(outDir, 'skills', def.name, 'SKILL.md'), composeArtifact(fields, subSkillHome(readFileSync(bodyPath, 'utf8'))));
    for (const [rel, abs] of extras.files) write(join(outDir, 'skills', def.name, rel), subSkillHome(readFileSync(abs, 'utf8')));
  }

  // Agents (personas) — one TOML file per role.
  for (const { agent, promptPath } of sources.agents) {
    const def = agent.def;
    const lines = [
      `description = ${tomlBasicString(def.description)}`,
      `developer_instructions = ${tomlMultilineString(subSkillHome(readFileSync(promptPath, 'utf8')))}`,
      `model = ${tomlBasicString(def.model ?? 'opus')}`,
      `tools = ${tomlStringArray(aliasToolList('codex', def.tools))}`,
    ];
    write(join(outDir, 'agents', `${def.name}.toml`), lines.join('\n') + '\n');
  }

  // Hooks — bash handler scripts + a hooks.json grouping them by (event, matcher),
  // same double-nested shape as the Claude Code emit. Zero `notify` entries (d12).
  type HookEntry = { type: 'command'; command: string };
  type MatcherBlock = { matcher: string; hooks: HookEntry[] };
  const byEvent = new Map<string, Map<string, HookEntry[]>>();
  for (const { hook, handlerPath } of sources.hooks) {
    const def = hook.def;
    copyExecutable(handlerPath, join(outDir, 'hooks', `${def.name}.sh`));
    if (!byEvent.has(def.event)) byEvent.set(def.event, new Map());
    const byMatcher = byEvent.get(def.event)!;
    if (!byMatcher.has(def.matcher)) byMatcher.set(def.matcher, []);
    byMatcher.get(def.matcher)!.push({ type: 'command', command: `${CLAUDE_PLUGIN_ROOT}/hooks/${def.name}.sh` });
  }
  const events: Record<string, MatcherBlock[]> = {};
  for (const [event, byMatcher] of byEvent) {
    events[event] = [...byMatcher].map(([matcher, hooks]) => ({ matcher, hooks }));
  }
  write(join(outDir, 'hooks.json'), JSON.stringify({ hooks: events }, null, 2) + '\n');

  // Shipped scripts.
  for (const [name, abs] of sources.scripts) copyExecutable(abs, join(outDir, 'scripts', name));

  // Project context (if present): docs/AGENTS.md.
  if (sources.projectContext) {
    write(join(outDir, 'docs', sources.projectContext.def.harnessFilenames.codex), sources.projectContext.def.content);
  }
}

/** Convenience: emit using the agent-skills package's name/version. */
export function emitCodexFromPackage(sources: CanonicalSources, outDir: string): void {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8')) as {
    name: string;
    version: string;
    description: string;
  };
  emitCodex(sources, outDir, pkg);
}
