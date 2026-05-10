
Create a living note. Notes capture working knowledge, unresolved decisions,
and design context that doesn't warrant a full spike or plan lifecycle.

## When to Use

- Deferred decisions that need a place to live
- Implementation contracts or requirements discovered during design work
- Cross-cutting concerns that span multiple spikes or plans
- Design context that would otherwise be lost between conversations

## When NOT to Use

- **Researching a topic** — use `/create-spike` instead
- **Writing a tech spec** — use `/create-plan` instead
- **Editing an existing note** — use `/edit-doc` instead

## Process

### 1. Resolve scope (project vs global)

Determine whether a project context is loaded. Inspect the working directory
and the captain's prompt:

- **Project scope** — cwd is inside `docs/xNNN-<name>/` (or any descendant),
  OR the captain's prompt names a project that already exists at
  `docs/xNNN-<name>/`. The note lands at `docs/xNNN-<name>/notes/<kebab>.md`.
- **Global scope** — neither resolves to an existing project. The note lands
  at `docs/notes/<kebab>.md`.

**Do not invoke `/launch-project`.** `create-note` is intentionally
independent: if no project context is loaded, fall back to global. Project
loading is the captain's call, not this skill's.

If scope is ambiguous (e.g., cwd is `docs/` itself, or two projects could
plausibly match the prompt), ask the captain once before scaffolding.

### 2. Normalize the name

Lowercase. Replace any character that isn't `[a-z0-9]` with `-`. Collapse
runs of `-`. Strip leading and trailing `-`.

Examples:

- `Channel Outbox Ownership` → `channel-outbox-ownership`
- `OAuth/PKCE notes!` → `oauth-pkce-notes`
- `  spacing test  ` → `spacing-test`

The scaffold CLI also normalizes; explicit normalization here keeps the
brief consistent with the eventual filename and surfaces collisions early.

### 3. Scaffold via the CLI

Delegate file creation to the scaffold CLI — never write the file directly
(the pre-write-doc hook blocks ad-hoc doc creation). For a project-scope
note, pass the resolved project slug (e.g. `x000-yolo-project`); for a
global note, pass `--global`:

```bash
.claude/scripts/yolo new note <project|--global> <kebab-name>
```

Parse the JSON envelope on stdout to learn the created path:

```bash
result=$(.claude/scripts/yolo new note "$scope" "$name")
file_path=$(printf '%s' "$result" | jq -r '.filePath')
```

If the CLI exits non-zero, the JSON envelope (on stderr) carries
`code` and `message` — surface the message to the captain rather than
retrying blindly. Common cases: `collision` (note with that name already
exists at the resolved path) and `missing-project` (the scope didn't
resolve to a project under `docs/`).

### 4. Write the note

Fill in the scaffolded sections:

- **Core Questions** — what this note tracks or resolves
- **Scope** — what's in and out of this note's purview

Add topic-specific sections as needed. Notes are free-form beyond the
scaffold — adapt the structure to the content.

### 5. Brief the captain

Confirm what was created, what it captures, and where it lives (project or
global path).

## Guidelines

- **Flat files only** — notes live directly in the chosen `notes/`
  directory, no subdirectories
- **No numbering** — notes use descriptive kebab-case filenames, not
  numbered prefixes
- **Living documents** — notes are updated over time via `/edit-doc`
- **Keep it focused** — one topic per note. If a note grows beyond ~500
  lines, consider whether it should become a spike
- **No mandatory reviews** — notes don't require the review cycle that
  spikes and plans do, but they can be reviewed via `/review-doc` if
  warranted
