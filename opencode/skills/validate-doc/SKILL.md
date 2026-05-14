---
name: validate-doc
description: "Document validation dispatcher — fans out parallel review-doc subagents per focus, derives sequential rNN- file numbers, and returns a per-reviewer summary. Called by lifecycle skills (create-spike, create-plan, archive-project) and ad-hoc validation rounds."
---

Document validation — given an artifact and a focus list, dispatches one
`review-doc` subagent per focus in parallel, each writing an `rNN-{focus}.md`
file alongside the artifact. Returns a summary naming the files that landed and
any reviewer that errored.

## Inputs

- **artifact path** — markdown file under review (a chapter or a README)
- **focus list** — ordered list of focus names (e.g., `[accuracy, architecture, depth, dx]`)
- **iteration number** — integer threaded into each reviewer prompt
- **review directory** — directory holding existing `rNN-*.md` siblings (defaults to the artifact's parent directory)

## Outputs

A summary listing, per dispatched focus: the target `rNN-{focus}.md` filename,
the dispatch status (`landed` / `errored`), the file path if landed, and the
error message if not.

## Focus list defaults by calling skill

Calling skills pass the focus list explicitly; these are the conventional
baselines (per `d08` / `d15`) so the catalog is discoverable in one place.

| Calling skill     | Baseline focus list                                  |
|-------------------|------------------------------------------------------|
| `create-spike`    | `accuracy, architecture, depth, dx`                  |
| `create-plan`     | `accuracy, architecture, integration, dx, scope`     |
| `archive-project` | `accuracy, comprehensiveness, clarity`               |

Lifecycle skills may extend or trim the list per chapter (e.g., a security-
sensitive chapter adds the contextual `security` focus). The list this skill
receives is the truth; the table is reference only.

## Scope modes

- **per-chapter** — `artifact` is a single chapter file (`03-foo.md`). Reviews land in the chapter's directory. Most rounds are this shape.
- **overall** — `artifact` is the project `README.md`, used near close. Same dispatch shape; reviewers frame findings against the whole document set.

The skill does not branch on mode — `artifact path` is taken at face value, and
reviewers self-orient. Mode is named here so callers know both shapes are
supported.

## Process

### 1. Validate the artifact

Read the `artifact path`. Confirm it exists and ends in `.md`. If the file is
missing or not markdown, abort with a clear error. Do not dispatch.

### 2. Derive the next free `NN`

`Glob` `<reviewDir>/r*.md`. Parse the leading `NN` integer from each filename
(`rNN-{focus}.md`). Compute:

```
NN_base = max(existing NN integers) + 1
       OR 1 if no rNN- files exist
```

For each focus at index `i` (zero-based) in the input list, the target filename
is `r{NN_base + i}-{focus}.md`. Numbers are assigned in input-list order; no
gaps, no overwrites. If a target filename already exists on disk (concurrent
write, manual rename), abort the whole batch — do not silently clobber.

### 3. Dispatch all reviewers in parallel

Dispatch every `review-doc` subagent in the focus list **in a single Task
batch** — one Task tool invocation per focus, all emitted together in the same
assistant message. This is non-negotiable: sequential dispatch (one Task call,
wait, next Task call) defeats the whole purpose of this skill and is a known
failure mode the eval explicitly checks for.

Each subagent prompt must include: `artifact path`, `focus name`, target
`rNN-{focus}.md` filename, iteration number, and the calling skill's name (for
context). The `review-doc` subagent is responsible for resolving the focus brief
(`${CLAUDE_PLUGIN_ROOT}/skills/review-doc/focuses/<focus>.md`), adopting the persona that brief
names, and writing the target file. (`review-doc` does not load a per-focus
reviewer agent — there are no such agents; focuses are briefs, dispatched against
personas.)

### 4. Wait for all subagents

Block until every dispatched Task returns. Do not return early on first error —
let the rest of the batch finish so the captain sees the full picture in one
pass.

### 5. Build the summary

For each dispatched focus, record:

- `focus` — name from the input list
- `target` — the computed `rNN-{focus}.md` filename
- `status` — `landed` if the file exists and is non-empty after the subagent returns; `errored` otherwise
- `path` — absolute or repo-relative path of the landed file (if `landed`)
- `error` — the subagent's error text or `"file missing/empty after dispatch"` (if `errored`)

Surface every `errored` entry verbatim. **Do not auto-bypass, do not retry, do
not silently swallow.** Reviewer dispatch errors point at infrastructure
problems that need investigation. The captain — or the calling lifecycle skill
acting on the captain's policy — decides whether to retry, skip, or stop.

### 6. Return the summary

Hand the summary back to the calling skill as conversational markdown. Do not
write it to a file (it's transient state, not an artifact).

## Tools

`Read, Glob, Grep, Bash, Dispatch` (Dispatch = Task in Claude Code).

## Failure modes to avoid

- **Sequential dispatch** — Tasks emitted across multiple assistant turns instead of one batch. Eval catches via wall-time threshold.
- **NN off-by-one** — empty review directory must yield `NN_base = 1`, not `0` and not `2`.
- **Silent error swallow** — a subagent failure that doesn't appear in the returned summary. Always surface.
- **Overwrite** — a target filename collision that proceeds anyway. Always abort.
