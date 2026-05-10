# Phase 1 baseline — source of record

This directory is a literal copy of the `.claude/` engineering toolkit from the
openspike repo, frozen at the Phase 1 close. The Claude Code emitter's output is
diffed against it (`tests/phase1-baseline.test.ts`, per Ch8's snapshot
normalization rules).

| Field | Value |
|-------|-------|
| Source repo | `openspike` (sibling of this repo by default — `../openspike`; override with `OPENSPIKE_REPO`) |
| Tag | `phase1-baseline-2026-05-10` |
| Commit | `290c0646` |
| Subtree | `.claude/` |

## Refreshing

Run `pnpm run sync-baseline`. It reads the `Tag` above, pulls that tag's
`.claude/` subtree from the source repo, and replaces this directory's `.claude/`
copy. Use this when the Phase 1 baseline is re-tagged (e.g. a fix was lifted to
Phase 1 first per Ch8's "don't fix in transcription alone" rule).

Do not hand-edit the `.claude/` copy below — it must match the tagged commit
byte-for-byte, or the snapshot test's contract is broken.
