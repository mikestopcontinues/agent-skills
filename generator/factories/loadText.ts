import { readFileSync } from 'node:fs';

/**
 * Read a sidecar text file next to a canonical-source module. Canonical sources
 * keep their large verbatim payloads (skill bodies, agent prompts, hook bash
 * handlers) in adjacent files rather than inline string literals — so the bytes
 * stay byte-identical to the Phase 1 source with no escaping.
 *
 * Usage: `body: loadText(import.meta.url, 'create-spike.md')`.
 */
export function loadText(metaUrl: string, relativePath: string): string {
  return readFileSync(new URL(relativePath, metaUrl), 'utf8');
}
