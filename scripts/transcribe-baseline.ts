/**
 * One-time transcription of the Phase 1 `.claude/` baseline into the TS
 * canonical-sources layout (Phase 2.A, p01 T2A.07–T2A.32).
 *
 * Reads `tests/snapshots/phase1-baseline/.claude/` (run `pnpm sync-baseline`
 * first if stale) and writes:
 *   - `src/canonical-sources/skills/<name>.ts`  + `<name>.md`   (body sidecar)
 *   - `src/canonical-sources/agents/<name>.ts`  + `<name>.md`   (prompt sidecar)
 *   - `src/canonical-sources/hooks/<name>.ts`   + `<name>.sh`   (handler sidecar)
 *     + `<name>.test/`  (hook test fixtures, copied verbatim — not shipped)
 *   - `src/canonical-sources/skills/<name>.extras/**`  (focus briefs, chapter
 *     templates — extra files the skill ships alongside its SKILL.md)
 *   - `src/scripts/yolo`, `src/scripts/doc-check-links.sh`  (shipped scripts)
 *
 * This is a bootstrap tool — after transcription the canonical sources are the
 * source of truth and are hand-maintained. Re-running clobbers hand-edits to
 * the generated `.ts` files (the same way `sync-baseline` clobbers the snapshot
 * copy). The `description` / `tools` / `event` / `matcher` metadata is the only
 * non-mechanical extraction; everything else (bodies, prompts, handlers, extras,
 * scripts) is a byte-for-byte copy.
 *
 * Run: `node scripts/transcribe-baseline.ts`.
 *
 * Not transcribed here:
 *   - project-context (`defineProjectContext`) — no direct Phase 1 source; the
 *     toolkit's generic `CLAUDE.md`/`AGENTS.md` template needs a considered
 *     authoring pass (p01 T2A.31).
 *   - `.claude/scripts/new-provider.sh` / `new-provider.test.sh` — openspike-
 *     specific package scaffolding, not part of the harness-neutral toolkit.
 *   - `.claude/settings.json`'s `permissions.allow` block — a generator/manifest
 *     concern (Ch9), not a canonical-source artifact.
 *   - eval-brief promotion (`<name>.eval.md`) — done separately; several
 *     post-d15 artifacts (the 5 restored personas, the 11 focus briefs) have no
 *     Phase 1 eval-brief file yet.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ToolNameSchema, type ToolName } from '../src/factories/types/toolNames.ts';
import { HookEventSchema, type HookEvent } from '../src/factories/types/hookTypes.ts';
import * as v from 'valibot';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const baseline = resolve(repoRoot, 'tests/snapshots/phase1-baseline/.claude');
const canonSkills = resolve(repoRoot, 'src/canonical-sources/skills');
const canonAgents = resolve(repoRoot, 'src/canonical-sources/agents');
const canonHooks = resolve(repoRoot, 'src/canonical-sources/hooks');
const srcScripts = resolve(repoRoot, 'src/scripts');

function fail(message: string): never {
  console.error(`transcribe-baseline: ${message}`);
  process.exit(1);
}

if (!existsSync(baseline)) fail(`baseline not found at ${baseline} — run \`pnpm sync-baseline\` first`);

interface Frontmatter {
  fields: Record<string, string>;
  body: string;
}

/** Split a `---\n…\n---\n<body>` file into its frontmatter fields and body. The
 *  body is everything after the closing `---\n` line, byte-for-byte. */
function parseFrontmatter(text: string, sourceLabel: string): Frontmatter {
  if (!text.startsWith('---\n')) fail(`${sourceLabel}: expected leading \`---\` frontmatter`);
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) fail(`${sourceLabel}: unterminated frontmatter`);
  const fmBlock = text.slice(4, end);
  const body = text.slice(end + 5); // past "\n---\n"
  const fields: Record<string, string> = {};
  for (const line of fmBlock.split('\n')) {
    if (line.trim() === '') continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) fail(`${sourceLabel}: unparseable frontmatter line: ${JSON.stringify(line)}`);
    fields[m[1]!] = unquoteYaml(m[2]!, sourceLabel);
  }
  return { fields, body };
}

/** Unwrap a YAML scalar — plain, single-quoted, or double-quoted. The Phase 1
 *  sources use plain and double-quoted scalars with no escape sequences. */
function unquoteYaml(raw: string, sourceLabel: string): string {
  const s = raw.trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    const inner = s.slice(1, -1);
    if (inner.includes('\\')) fail(`${sourceLabel}: YAML escape sequences not supported: ${s}`);
    return inner;
  }
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

/** Emit a single-quoted TS string literal. */
function tsStr(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Parse a `tools:` frontmatter value (`Read, Edit, …`) into validated names. */
function parseTools(raw: string | undefined, sourceLabel: string): ToolName[] | undefined {
  if (raw === undefined) return undefined;
  const names = raw.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
  return names.map((n) => {
    try {
      return v.parse(ToolNameSchema, n);
    } catch {
      return fail(`${sourceLabel}: unknown tool name ${JSON.stringify(n)}`);
    }
  });
}

function toolsTsLine(tools: ToolName[] | undefined): string {
  if (tools === undefined) {
    return "  // No `tools:` in the Phase 1 source — inherits the harness's full toolset.";
  }
  if (tools.length === 0) return '  tools: [],';
  return `  tools: [${tools.map((t) => `'${t}'`).join(', ')}],`;
}

/** Wrap a long single-line description across lines for the `.ts` file. The
 *  value is unaffected — only the source-file layout. */
function descriptionTsBlock(desc: string): string {
  const literal = tsStr(desc);
  if (`  description: ${literal},`.length <= 100) return `  description: ${literal},`;
  return `  description:\n    ${literal},`;
}

function writeFileLogged(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

// ── Skills ──────────────────────────────────────────────────────────────────

const skillExtras: Record<string, Array<{ from: string; to: string }>> = {
  'create-spike': [{ from: 'chapter.md', to: 'chapter.md' }],
  'review-doc': [{ from: 'focuses', to: 'focuses' }],
  'review-code': [{ from: 'focuses', to: 'focuses' }],
};

let skillCount = 0;
for (const name of readdirSync(join(baseline, 'skills')).sort()) {
  const skillMd = join(baseline, 'skills', name, 'SKILL.md');
  if (!existsSync(skillMd)) continue;
  const { fields, body } = parseFrontmatter(readFileSync(skillMd, 'utf8'), `skills/${name}/SKILL.md`);
  if (fields['name'] !== name) fail(`skills/${name}/SKILL.md: frontmatter name ${JSON.stringify(fields['name'])} != dir name`);
  if (!fields['description']) fail(`skills/${name}/SKILL.md: missing description`);
  const tools = parseTools(fields['tools'], `skills/${name}/SKILL.md`);

  writeFileLogged(join(canonSkills, `${name}.md`), body);
  const ts = [
    "import { defineSkill } from '../../factories/defineSkill.ts';",
    "import { loadText } from '../../factories/loadText.ts';",
    '',
    'export const skill = defineSkill({',
    `  name: '${name}',`,
    descriptionTsBlock(fields['description']),
    toolsTsLine(tools),
    `  body: loadText(import.meta.url, '${name}.md'),`,
    '});',
    '',
  ].join('\n');
  writeFileLogged(join(canonSkills, `${name}.ts`), ts);

  for (const extra of skillExtras[name] ?? []) {
    const fromPath = join(baseline, 'skills', name, extra.from);
    const toPath = join(canonSkills, `${name}.extras`, extra.to);
    rmSync(toPath, { recursive: true, force: true });
    mkdirSync(dirname(toPath), { recursive: true });
    cpSync(fromPath, toPath, { recursive: true });
  }
  skillCount += 1;
}

// ── Agents (personas) ───────────────────────────────────────────────────────

let agentCount = 0;
for (const file of readdirSync(join(baseline, 'agents')).sort()) {
  if (!file.endsWith('.md')) continue;
  const name = file.replace(/\.md$/, '');
  const { fields, body } = parseFrontmatter(readFileSync(join(baseline, 'agents', file), 'utf8'), `agents/${file}`);
  if (fields['name'] !== name) fail(`agents/${file}: frontmatter name ${JSON.stringify(fields['name'])} != file name`);
  if (!fields['description']) fail(`agents/${file}: missing description`);
  if (!fields['model']) fail(`agents/${file}: missing model`);
  const tools = parseTools(fields['tools'], `agents/${file}`);

  writeFileLogged(join(canonAgents, `${name}.md`), body);
  const ts = [
    "import { defineAgent } from '../../factories/defineAgent.ts';",
    "import { loadText } from '../../factories/loadText.ts';",
    '',
    'export const agent = defineAgent({',
    `  name: '${name}',`,
    descriptionTsBlock(fields['description']),
    `  model: ${tsStr(fields['model'])},`,
    tools === undefined ? '  tools: [],' : `  tools: [${tools.map((t) => `'${t}'`).join(', ')}],`,
    `  prompt: loadText(import.meta.url, '${name}.md'),`,
    '});',
    '',
  ].join('\n');
  writeFileLogged(join(canonAgents, `${name}.ts`), ts);
  agentCount += 1;
}

// ── Hooks ───────────────────────────────────────────────────────────────────

interface HookBinding {
  event: HookEvent;
  matcher: string;
}

/** Read `.claude/settings.json` and map hook script basename → {event, matcher}. */
function readHookBindings(): Record<string, HookBinding> {
  const settings = JSON.parse(readFileSync(join(baseline, 'settings.json'), 'utf8')) as {
    hooks?: Record<string, Array<{ matcher?: string; hooks?: Array<{ command?: string }> }>>;
  };
  const bindings: Record<string, HookBinding> = {};
  for (const [eventName, blocks] of Object.entries(settings.hooks ?? {})) {
    const event = v.parse(HookEventSchema, eventName);
    for (const block of blocks) {
      const matcher = block.matcher ?? '';
      for (const entry of block.hooks ?? []) {
        const cmd = entry.command ?? '';
        const m = cmd.match(/\/hooks\/([A-Za-z0-9_-]+)\.sh"?\s*$/);
        if (m) bindings[m[1]!] = { event, matcher };
      }
    }
  }
  return bindings;
}

const hookBindings = readHookBindings();
let hookCount = 0;
for (const file of readdirSync(join(baseline, 'hooks')).sort()) {
  if (!file.endsWith('.sh')) continue;
  const name = file.replace(/\.sh$/, '');
  const binding = hookBindings[name];
  if (!binding) fail(`hooks/${file}: not referenced from settings.json`);
  const handlerBody = readFileSync(join(baseline, 'hooks', file), 'utf8');

  writeFileLogged(join(canonHooks, `${name}.sh`), handlerBody);
  const testDir = join(baseline, 'hooks', `${name}.test`);
  if (existsSync(testDir)) {
    const destTest = join(canonHooks, `${name}.test`);
    rmSync(destTest, { recursive: true, force: true });
    cpSync(testDir, destTest, { recursive: true });
  }
  const ts = [
    "import { defineHook } from '../../factories/defineHook.ts';",
    "import { loadText } from '../../factories/loadText.ts';",
    '',
    'export const hook = defineHook({',
    `  name: '${name}',`,
    `  event: '${binding.event}',`,
    `  matcher: ${tsStr(binding.matcher)},`,
    `  handler: { kind: 'bash', command: loadText(import.meta.url, '${name}.sh') },`,
    '});',
    '',
  ].join('\n');
  writeFileLogged(join(canonHooks, `${name}.ts`), ts);
  hookCount += 1;
}

// ── Shipped scripts ─────────────────────────────────────────────────────────

mkdirSync(srcScripts, { recursive: true });
for (const script of ['yolo', 'doc-check-links.sh']) {
  const from = join(baseline, 'scripts', script);
  if (!existsSync(from)) fail(`scripts/${script}: not found in baseline`);
  cpSync(from, join(srcScripts, script));
}

console.log(
  `transcribe-baseline: ${skillCount} skills, ${agentCount} agents, ${hookCount} hooks, 2 scripts → src/canonical-sources + src/scripts`,
);
