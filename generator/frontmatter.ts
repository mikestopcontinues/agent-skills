/**
 * Minimal YAML-frontmatter handling for harness artifact files (`SKILL.md`,
 * agent `.md`). The Phase 1 sources use only flat scalar string fields — bare
 * `name` / `tools` / `model`, double-quoted `description`. This module does not
 * aim to be a general YAML implementation; it covers exactly that shape and
 * fails loudly on anything richer.
 */

/** Frontmatter fields in insertion order (JS preserves string-key order). */
export type FrontmatterFields = Record<string, string>;

export interface ParsedFrontmatter {
  fields: FrontmatterFields;
  /** Everything after the closing `---\n`, byte-for-byte. */
  body: string;
}

/** Parse `---\n…\n---\n<body>` into fields + body. Throws on a malformed block. */
export function parseFrontmatter(text: string, label: string): ParsedFrontmatter {
  if (!text.startsWith('---\n')) throw new Error(`${label}: expected leading \`---\` frontmatter`);
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) throw new Error(`${label}: unterminated frontmatter`);
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  const fields: FrontmatterFields = {};
  for (const line of block.split('\n')) {
    if (line.trim() === '') continue;
    const m = line.match(/^([A-Za-z0-9_-]+):[ \t]*(.*)$/);
    if (!m) throw new Error(`${label}: unparseable frontmatter line: ${JSON.stringify(line)}`);
    const key = m[1]!;
    if (key in fields) throw new Error(`${label}: duplicate frontmatter key '${key}'`);
    fields[key] = unquoteScalar(m[2]!);
  }
  return { fields, body };
}

function unquoteScalar(raw: string): string {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

/** Keys this module always double-quotes (matching the Phase 1 style). */
const ALWAYS_QUOTED = new Set(['description']);

function needsQuoting(value: string): boolean {
  return (
    value === '' ||
    value !== value.trim() ||
    /[:#"'\n]/.test(value) ||
    /^[!&*?|>%@`[\]{},]/.test(value)
  );
}

function formatScalar(key: string, value: string): string {
  if (ALWAYS_QUOTED.has(key) || needsQuoting(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

/** Serialize fields back to a `---\n…\n---\n` block (no trailing body). */
export function formatFrontmatter(fields: FrontmatterFields): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${formatScalar(key, value)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

/** Compose a full artifact file: frontmatter block + body. */
export function composeArtifact(fields: FrontmatterFields, body: string): string {
  return formatFrontmatter(fields) + body;
}
