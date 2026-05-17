
Code-side mirror of `validate-doc`. Resolves the artifact to a unified diff,
dispatches one `review-code` subagent per requested focus in parallel, and
returns a summary of which `rNN-{focus}.md` files landed plus any reviewer
errors. Calling skills supply the focus list; this skill provides the
dispatcher discipline (NN derivation, parallel fan-out, error surfacing).

## Inputs

- **artifact**: path to one of: a `.diff` / `.patch` file, a single source
  file, or a directory. Required.
- **focusList**: ordered list of focus names (`architecture`, `accuracy`,
  `integration`, `dx`, `security`, `performance`, etc.). Required.
- **iteration**: integer (1, 2, …). Used in the dispatched subagent prompt
  for context; does NOT influence numbering.
- **reviewDir**: directory where `rNN-{focus}.md` files land. Defaults to
  the artifact's parent directory (or the directory itself when artifact
  is a directory).

## Focus-list defaults by calling skill

Calling skills stipulate the focus list. The only `review-code` baseline per
`d08` / `d15` is `execute-plan`'s; ad-hoc callers pass whatever they need. There
are `review-code` focus briefs for `accuracy`, `architecture`, `dx`; contextual
focuses (`security`, `performance`, `compatibility`) require a brief authored at
first use.

| Calling skill   | Baseline focuses                                  |
|-----------------|---------------------------------------------------|
| `execute-plan`  | `accuracy, architecture, dx` (+ contextual: e.g., `security` for auth/crypto, `performance` for hot paths) |
| ad-hoc          | whatever the captain specifies                    |

This skill does not impose a default; it dispatches what it is given.

## Process

### 1. Resolve the artifact to a diff

- If the artifact path ends in `.diff` or `.patch` and is a regular file:
  pass the path through unchanged.
- Else (file or directory): derive the diff via `git diff <base>...HEAD --
  <artifact>` where `<base>` is the worktree's base branch (resolve via
  `git merge-base HEAD master`). Write the diff to a temp path under
  `reviewDir/.cache/<artifact-basename>.diff`; subagents read from there.
- **Empty-diff guard**: if the resolved diff is empty (zero lines or only
  whitespace headers), refuse with a clear error: `validate-code: artifact
  '<path>' produced an empty diff against <base>; nothing to review.` Do
  NOT dispatch any subagents. Return the error as the summary.

### 2. Confirm the artifact and review directory

- `Read` the artifact path to verify existence (or `Glob` the directory).
- `Glob reviewDir/r*.md` to inventory existing review files.

### 3. Derive the next NN

- Parse each existing `rNN-*.md` filename in `reviewDir`; collect integers.
- `next = (max(existing) + 1)` if any exist, else `1`.
- For each focus at index `i` in `focusList`, target filename is
  `r{next + i}-{focus}.md`. Off-by-one check: when `reviewDir` is empty,
  `next = 1` (NOT 0); the first focus lands at `r1-{focus}.md`.

### 4. Dispatch all review-code subagents in parallel

**Single-batch dispatch is mandatory.** Issue every `Dispatch`
(Task) call inside one tool-call batch in a single assistant turn — never
sequentially across turns.

**The ONLY `subagent_type` this skill dispatches is `review-code`.** Do NOT
also dispatch the personas (`qa`, `architect`, `dx`, etc.) — `review-code`
adopts the brief's named persona internally (by `Read`ing the persona's prompt
and operating in that lens; not by spawning the persona as a subagent). One
focus → one `review-code` dispatch, period. If you emit a `Task` call with
`subagent_type` set to anything other than `review-code`, that's the bug.

Each dispatched subagent is `review-code` with the inputs:

- artifact path (the resolved diff path from step 1)
- focus name
- target filename (`r{NN}-{focus}.md`)
- iteration number
- reviewDir

Each `review-code` subagent resolves its focus brief
(`__SKILL_HOME__/skills/review-code/focuses/<focus>.md`), adopts the persona
that brief names (by reading its prompt, never by dispatching it), and writes
the target file. There are no per-focus reviewer agents — focuses are briefs
the `review-code` leaf executes through a named persona's lens.

If iteration discipline requires it, prefix each subagent prompt with
"eval mode" so reviewers respect any sleep instrumentation.

### 5. Wait for all subagents, then summarize

After every subagent returns (success or error), produce a summary table:

```
| focus         | rNN file                          | status   | error |
|---------------|-----------------------------------|----------|-------|
| architecture  | reviewDir/r3-architecture.md      | written  | -     |
| accuracy      | reviewDir/r4-accuracy.md          | written  | -     |
| integration   | (none)                            | errored  | <msg> |
```

**No silent swallow.** Any errored, missing, or empty `rNN-` file is
surfaced in the `status` and `error` columns. Do not auto-retry; do not
auto-bypass. The summary's overall status is `failed` if any reviewer
errored, `ok` only if every focus produced a substantive `rNN-` file.

### 6. Return the summary

Return the table plus a one-line headline (`validate-code: ok` /
`validate-code: failed (N of M reviewers errored)`). The calling skill
decides whether to proceed, re-dispatch, or escalate.

## Notes

- This skill never edits the artifact, never commits, and never invokes
  `pnpm run check`. It is purely a dispatcher.
- The `Dispatch` tool is the only path to `review-code`; do not run a
  review inline in this skill's own context (per the no-skipped-layers
  invariant).
- `Bash` is used only for `git diff`, `git merge-base`, and writing the
  cached diff. No other shell work.
