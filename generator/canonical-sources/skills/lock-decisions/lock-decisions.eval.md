# Eval brief: lock-decisions skill

**Task**: T1B1.08

## Contract

Finding-driven captain prompt for decision-shaped clusters. Receives a finite
list of decision-shaped findings (typically from `triage-feedback`'s
`lock-decisions` route). Per finding: restates the claim + rNN- citation, asks
the captain via a three-path prompt (`lock` / `defer` / `grill`), and acts on
the answer — locking via `/create-decision` (citation appended verbatim),
recording a deferral with no file written, or invoking `/grill-me` and
returning to the same prompt afterward. Returns a brief markdown summary
listing each finding's outcome. Tools: `Read, Edit, Write, Glob, Grep`. No
Bash, no Dispatch — interactive captain dialogue plus writes via
`/create-decision`. **Does not** auto-generate candidate resolutions —
surfacing alternatives is `grill-me`'s job.

## Eval scenarios

Static eval — describes the input findings list and captain answers as input;
expected behavior is the per-finding routing, the `/create-decision` /
`/grill-me` invocations, and the summary shape. No live captain dialogue yet.

### Scenario A — three findings, captain locks all three

Findings: 3 decision-shaped clusters from a real spike's triage output.
- `C1` — "harness X scope" (cited `r05-scope.md:14`)
- `C2` — "channel outbox ownership" (cited `r02-architecture.md:88`)
- `C3` — "OAuth profile selection" (cited `r05-scope.md:42`)

Captain answers `Lock answer now` for all three; supplies a free-form
decision body for each.

Expected: For each finding, the skill restates claim + citation, prompts
once, then invokes `/create-decision` with a body that ends in the verbatim
rNN- citation. Three `/create-decision` invocations land. Summary table has
three rows, all `locked`, each with the resulting decision file path.
Totals line reads `3 locked, 0 deferred, 0 grilled-then-locked, 0
grilled-then-deferred`.

### Scenario B — grill-then-lock

Findings: 2 decision-shaped clusters.
- `C1` — "channel outbox ownership" (cited `r02-architecture.md:88`)
- `C2` — "provider error taxonomy boundary" (cited `r05-scope.md:30`)

Captain answers `Lock answer now` for `C1` (supplies body). For `C2`,
captain picks `Grill me on this`. After `/grill-me` exits, the skill
re-prompts on `C2`; captain now picks `Lock answer now` and supplies a body.

Expected: `C1` produces one `/create-decision` invocation. For `C2`,
`/grill-me` is invoked with topic + claim + citation as starting context;
on grill exit the skill returns to step 2 for `C2`; captain locks; second
`/create-decision` invocation lands with rNN- citation. Summary: `C1`
`locked`, `C2` `grilled-then-locked`. Totals: `1 locked, 0 deferred, 1
grilled-then-locked, 0 grilled-then-deferred`.

### Scenario C — adversarial: defer-after-grill

Findings: same 2 clusters as Scenario B (`C1`, `C2`).

Captain answers `Lock answer now` for `C1` (supplies body). For `C2`,
captain picks `Grill me on this`. After `/grill-me` exits, the skill
re-prompts on `C2`; this time captain picks `Defer for later` (the grill
clarified the decision tree but the captain wants to revisit later).

Expected: `C1` produces one `/create-decision` invocation. For `C2`,
`/grill-me` is invoked; on grill exit the skill returns to step 2 for `C2`;
captain defers; **no second `/create-decision` invocation**. Summary: `C1`
`locked`, `C2` `grilled-then-deferred`. Totals: `1 locked, 0 deferred, 0
grilled-then-locked, 1 grilled-then-deferred`.

Failure mode this scenario guards: assuming `/grill-me` always resolves into
a lock. The skill must re-prompt with the full three-path menu after grill
exit and honor whichever path the captain picks.

### Scenario D — direct defer (no grill)

Findings: 1 decision-shaped cluster.
- `C1` — "validate-loop polling cadence" (cited `r05-scope.md:8`)

Captain answers `Defer for later` directly.

Expected: One restate + one prompt. No `/create-decision` invocation. No
`/grill-me` invocation. Summary: one row, `C1` `deferred`, artifact column
em-dash. Totals: `0 locked, 1 deferred, 0 grilled-then-locked, 0
grilled-then-deferred`.

### Scenario E — empty list (clean exit)

Findings: empty list (triage routed nothing to `lock-decisions`).

Expected: No prompts. No `/create-decision` or `/grill-me` invocations.
Summary is the empty form: `# Lock-decisions summary\n\nNo decision-shaped
findings to process.` Skill exits without further dialogue.

Failure mode this scenario guards: prompting the captain "are you sure
there's nothing?" or otherwise turning an empty input into an interactive
loop.

## Pass criteria

1. **Restate-before-ask** — every prompted finding shows the claim verbatim
   and the rNN- citation before the three-path prompt. Skipping the restate
   = fail.
2. **Three-path prompt** — every prompt offers exactly the three options
   `Lock answer now` / `Defer for later` / `Grill me on this`. Adding a
   fourth option (e.g., "let me suggest alternatives") = fail.
3. **No auto-generated alternatives** — the skill never lists candidate
   resolutions before the captain answers. Generating alternatives is
   `grill-me`'s job. Any "Option A / Option B" prelude in the prompt = fail.
4. **Citation in create-decision body** — every `/create-decision`
   invocation's body contains the verbatim `rNN-{focus}.md:{location}`
   citation. Missing citation = fail.
5. **Defer-after-grill (Scenario C)** — after `/grill-me` exits, the skill
   re-prompts with the full three-path menu and honors a `defer` answer
   without writing a decision file. Treating grill exit as implicit lock =
   fail.
6. **Empty list (Scenario E)** — no prompts, no invocations, empty summary.
   Any captain dialogue = fail.
7. **Summary shape** — outcome values are exactly `locked` / `deferred` /
   `grilled-then-locked` / `grilled-then-deferred`. Artifact column em-dash
   for non-lock outcomes. Totals line sums to `len(findings)`.

## Iteration log

- **Iter 1** (2026-05-09): Initial pass. Skill body authored from p01 Ch4
  contract (lines 192–219). Three-path prompt encoded with `AskUserQuestion`;
  defer-after-grill explicitly called out as a first-class outcome (returns
  to step 2 after grill exit, honors all three paths). Five scenarios cover
  bulk-lock, grill-then-lock, the adversarial defer-after-grill path,
  direct-defer, and the empty-list clean exit. Pending live dispatch once
  `triage-feedback` produces real `lock-decisions`-routed cluster output in
  this repo.
