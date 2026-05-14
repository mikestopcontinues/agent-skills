/**
 * One-time promotion of the Phase 1 per-artifact eval briefs into the
 * canonical-sources tree as `<name>.eval.md` sidecars (plan p01, Ch8 "eval
 * brief promotion").
 *
 * Source: `<openspike>/docs/x000-yolo-project/notes/eval-briefs/<task>-<artifact>.md`
 * (default `../openspike`; `OPENSPIKE_REPO` overrides). Targets:
 *   - `generator/canonical-sources/skills/<name>.eval.md`
 *   - `generator/canonical-sources/agents/<name>.eval.md`
 *   - `generator/canonical-sources/hooks/<name>.eval.md`
 *   - `generator/canonical-sources/skills/review-doc.extras/focuses/<focus>.eval.md`
 *   - `generator/canonical-sources/skills/review-code.extras/focuses/<focus>.eval.md`
 *   - `generator/scripts/yolo.eval.md`
 *
 * The same path-normalization the canonical bodies got is applied
 * (`.claude/scripts/yolo` / `doc-create.sh` → `yolo`, `doc-check-links.sh`
 * bare, `.claude/agents|skills/review-` → `__SKILL_HOME__/...`). Where no
 * Phase 1 brief exists (the 5 d15-restored personas, the diff-tuned code-side
 * focus briefs, project-context), a short stub is written that points at the
 * relevant context — to be replaced by a real per-artifact brief on first
 * iteration use.
 *
 * Bootstrap tool — re-running clobbers hand-edits to the `.eval.md` files.
 * Run: `node scripts/promote-eval-briefs.ts`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const canon = resolve(repoRoot, 'generator/canonical-sources');
const openspike = process.env['OPENSPIKE_REPO'] ?? resolve(repoRoot, '../openspike');
const briefsDir = resolve(openspike, 'docs/x000-yolo-project/notes/eval-briefs');

function fail(m: string): never {
  console.error(`promote-eval-briefs: ${m}`);
  process.exit(1);
}
if (!existsSync(briefsDir)) fail(`eval-briefs not found at ${briefsDir} (set OPENSPIKE_REPO)`);

/** Apply the same path normalization the canonical bodies got. */
function normalize(text: string): string {
  return text
    .replace(/\.claude\/scripts\/(yolo|doc-create\.sh)/g, 'yolo')
    .replace(/\.claude\/scripts\/doc-check-links\.sh/g, 'doc-check-links.sh')
    .replace(/\.claude\/agents\//g, '__SKILL_HOME__/agents/')
    .replace(/\.claude\/skills\/review-/g, '__SKILL_HOME__/skills/review-');
}

const briefFiles = readdirSync(briefsDir);
/** Brief filenames are `<task>-<artifact>.md` (task prefix has no `-`, e.g.
 *  `T1A1.02`). Match on the artifact part exactly, so `findBrief('dx')` does
 *  NOT match `T1A2.06-review-dx.md` (whose artifact part is `review-dx`). */
function briefArtifact(file: string): string {
  return file.replace(/\.md$/, '').replace(/^[^-]+-/, '');
}
function findBrief(artifactName: string): string | undefined {
  const hit = briefFiles.find((f) => briefArtifact(f) === artifactName);
  return hit ? join(briefsDir, hit) : undefined;
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

const promoted: string[] = [];
const stubbed: string[] = [];

function promote(targetPath: string, sourceArtifactName: string, header?: string): boolean {
  const src = findBrief(sourceArtifactName);
  if (!src) return false;
  const body = normalize(readFileSync(src, 'utf8'));
  write(targetPath, header ? `${header}\n\n${body}` : body);
  promoted.push(targetPath.replace(repoRoot + '/', ''));
  return true;
}

function stub(targetPath: string, contents: string): void {
  write(targetPath, contents);
  stubbed.push(targetPath.replace(repoRoot + '/', ''));
}

const STUB_TODO = '> **Stub.** No Phase 1 eval brief exists for this artifact; a per-artifact brief is authored on first iteration use (see d15 / the sibling artifacts for the expected shape).';

// ── Skills (21) ─────────────────────────────────────────────────────────────
for (const file of readdirSync(join(canon, 'skills'))) {
  if (!file.endsWith('.ts')) continue;
  const name = file.replace(/\.ts$/, '');
  if (!promote(join(canon, 'skills', `${name}.eval.md`), name)) {
    stub(join(canon, 'skills', `${name}.eval.md`), `# Eval brief: ${name} skill\n\n${STUB_TODO}\n`);
  }
}

// ── Agents (11) ─────────────────────────────────────────────────────────────
for (const file of readdirSync(join(canon, 'agents'))) {
  if (!file.endsWith('.ts')) continue;
  const name = file.replace(/\.ts$/, '');
  if (!promote(join(canon, 'agents', `${name}.eval.md`), name)) {
    stub(
      join(canon, 'agents', `${name}.eval.md`),
      `# Eval brief: ${name} persona\n\n> **Stub.** The \`${name}\` persona was restored from git in the d15 remediation (it was wrongly dropped earlier) without a fresh Phase 1 eval brief. Author one on first iteration use, following the shape of the six already-refreshed persona eval briefs (researcher / doc-writer / implementer / designer / conflict-resolver / verifier): a contract paragraph, a small set of dispatch scenarios (a bare-dispatch one and a "dispatched-with-the-{focus}-review-brief" one where applicable), and what good output looks like. See decision d15.\n`,
    );
  }
}

// ── Hooks (5) ───────────────────────────────────────────────────────────────
for (const file of readdirSync(join(canon, 'hooks'))) {
  if (!file.endsWith('.ts')) continue;
  const name = file.replace(/\.ts$/, '');
  if (!promote(join(canon, 'hooks', `${name}.eval.md`), name)) {
    stub(join(canon, 'hooks', `${name}.eval.md`), `# Eval brief: ${name} hook\n\n${STUB_TODO}\n`);
  }
}

// ── Review focus briefs (doc side: 8) — relocated from the pre-d15 review-{focus} agents ─
const docFocuses = readdirSync(join(canon, 'skills', 'review-doc.extras', 'focuses')).filter((f) => f.endsWith('.md') && !f.endsWith('.eval.md'));
for (const file of docFocuses) {
  const focus = file.replace(/\.md$/, '');
  const header = `> Promoted from the pre-d15 \`review-${focus}\` agent eval brief. Per decision d15 (in the openspike repo) the \`${focus}\` review *focus* is now a brief loaded by \`review-doc\` and dispatched against the persona the brief names; this eval brief is the agent-era one, still applicable to the brief — refine the dispatch framing on first iteration use.`;
  if (!promote(join(canon, 'skills', 'review-doc.extras', 'focuses', `${focus}.eval.md`), `review-${focus}`, header)) {
    stub(join(canon, 'skills', 'review-doc.extras', 'focuses', `${focus}.eval.md`), `# Eval brief: ${focus} review focus (review-doc)\n\n${STUB_TODO}\n`);
  }
}

// ── Review focus briefs (code side: 3) — diff-tuned variants of the doc-side ─
const codeFocuses = readdirSync(join(canon, 'skills', 'review-code.extras', 'focuses')).filter((f) => f.endsWith('.md') && !f.endsWith('.eval.md'));
for (const file of codeFocuses) {
  const focus = file.replace(/\.md$/, '');
  stub(
    join(canon, 'skills', 'review-code.extras', 'focuses', `${focus}.eval.md`),
    `# Eval brief: ${focus} review focus (review-code)\n\n> **Stub.** The code-review \`${focus}\` focus brief is the diff-tuned variant of the doc-side one (\`../../review-doc.extras/focuses/${focus}.eval.md\`). Author a code-review-specific eval brief on first iteration use — inputs should be diffs, and the seeded findings should be diff-scoped (e.g. a change that introduces the kind of defect this focus catches).\n`,
  );
}

// ── yolo CLI ────────────────────────────────────────────────────────────────
if (!promote(join(repoRoot, 'generator/scripts/yolo.eval.md'), 'yolo-cli')) {
  stub(join(repoRoot, 'generator/scripts/yolo.eval.md'), `# Eval brief: yolo CLI\n\n${STUB_TODO}\n`);
}

// ── project-context ─────────────────────────────────────────────────────────
stub(
  join(canon, 'project-context.eval.md'),
  `# Eval brief: project-context template\n\n> **Stub.** \`defineProjectContext\` is new in Phase 2 (no Phase 1 eval brief). Author one on first iteration use: the eval is "a fresh repo installs this template into \`docs/\` and the lifecycle skills navigate it correctly" — check that \`yolo new project\`, \`/start-session\`, and \`/create-spike\` agree with the directory shape the template documents.\n`,
);

console.log(`promote-eval-briefs: ${promoted.length} promoted, ${stubbed.length} stubbed.`);
if (stubbed.length) console.log('  stubbed:\n' + stubbed.map((s) => `    ${s}`).join('\n'));
