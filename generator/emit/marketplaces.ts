import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { CanonicalSources } from '../loadCanonicalSources.ts';

interface PluginMeta {
  name: string;
  version: string;
  description: string;
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/** Sorted skill names → relative paths under the Claude Code bundle. The
 *  vercel-labs `npx skills add` CLI walks `plugins[].skills[]` to discover
 *  installable skills (it recognizes both `source` and `skills` per
 *  `vercel-labs/skills` `src/plugin-manifest.ts`); Claude Code uses `source`
 *  to pick up the whole plugin. Both fields coexist on the same entry. */
function skillPaths(sources: CanonicalSources): string[] {
  return sources.skills
    .map((s) => `./claude/skills/${s.skill.def.name}`)
    .sort();
}

/**
 * Emit `.claude-plugin/marketplace.json` (Claude Code + vercel-labs) and
 * `.agents/plugins/marketplace.json` (Codex) at `repoRoot`. Both files are
 * derived from the canonical sources so the `skills[]` array stays in sync
 * with what the `claude/` and `codex/` bundles actually ship.
 *
 * Returns the absolute paths of the files written.
 */
export function emitMarketplaces(sources: CanonicalSources, repoRoot: string, meta: PluginMeta): string[] {
  const claudeMarketplace = {
    name: 'agent-skills-dev',
    owner: { name: 'mikestopcontinues' },
    metadata: {
      description:
        'OpenSpike agent-skills toolkit. Multi-target plugin: Claude Code (`./claude`), Codex (`./codex`), OpenCode (npm package), and skills via vercel-labs `npx skills add`.',
    },
    plugins: [
      {
        name: meta.name,
        source: './claude',
        description:
          'Lifecycle skills, persona agents, and governance hooks for the OpenSpike yolo-projects toolkit (Claude Code bundle).',
        version: meta.version,
        skills: skillPaths(sources),
      },
    ],
  };

  const codexMarketplace = {
    name: 'agent-skills-dev',
    interface: {
      displayName: 'OpenSpike Agent Skills',
      shortDescription: 'Lifecycle skills, persona agents, and governance hooks.',
    },
    plugins: [
      {
        name: meta.name,
        source: { source: 'local', path: './codex' },
        policy: { installation: 'INSTALLED_BY_DEFAULT', authentication: 'ON_INSTALL' },
        category: 'Engineering',
        interface: {
          displayName: 'Agent Skills',
          shortDescription: 'OpenSpike yolo-projects toolkit (Codex bundle).',
        },
      },
    ],
  };

  const claudePath = join(repoRoot, '.claude-plugin', 'marketplace.json');
  const codexPath = join(repoRoot, '.agents', 'plugins', 'marketplace.json');
  write(claudePath, JSON.stringify(claudeMarketplace, null, 2) + '\n');
  write(codexPath, JSON.stringify(codexMarketplace, null, 2) + '\n');
  return [claudePath, codexPath];
}

/** Convenience: emit using the agent-skills package's name/version. */
export function emitMarketplacesFromPackage(sources: CanonicalSources, repoRoot: string): string[] {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8')) as {
    name: string;
    version: string;
    description: string;
  };
  return emitMarketplaces(sources, repoRoot, { name: 'agent-skills', version: pkg.version, description: pkg.description });
}
