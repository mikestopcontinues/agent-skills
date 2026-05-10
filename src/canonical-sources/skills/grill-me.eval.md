# Eval brief: grill-me skill

**Task**: T1B1.07

## Contract

Singleton skill at `.claude/skills/grill-me/SKILL.md`. Open-ended
Socratic interview. Captain's prompt sets the topic; the skill walks the
design tree branch by branch, recommending an answer per question
grounded in codebase exploration. As the captain locks answers, the
skill invokes `/create-decision`. As exploration surfaces observations
worth capturing but NOT decisions, it invokes `/create-note`. Tools:
`Read, Edit, Write, Glob, Grep, Bash` — Bash for repo state inspection
during the interview.

A successful run (a) explores relevant code before recommending, (b)
asks one question per turn, (c) walks questions in dependency order
(parents before children), (d) persists locks via `/create-decision` and
non-decision findings via `/create-note`, (e) routes non-design
questions away to `/start-session` or `/write-doc`.

## Eval scenarios

Static evaluation — describe the expected interview shape per scenario;
no live captain dialogue required.

1. **multi-question-design-topic** — Captain prompt: "Grill me on the
   shape of the new `@os/observability` package." Repo has no
   `observability` package yet but has a sibling `@os/events` for
   reference. Expected flow: skill reads `@os/events`, sketches a
   dependency tree (package boundary → public surface → adapter
   strategy → registry shape → test surface), asks the parent question
   first ("does observability ship as one package or split per
   backend?"), recommends an answer with rationale citing
   `@os/events`'s pattern, waits for the lock, invokes
   `/create-decision observability-package-shape <captain's body>`,
   replans the queue, moves to the next parent. Multiple
   `/create-decision` invocations across the interview, each with the
   captain's locked words.

2. **mostly-settled-topic** — Captain prompt: "Grill me on the
   `revise-doc` skill body — I think we're mostly there." Repo has
   `.claude/skills/revise-doc/SKILL.md` already drafted. Expected flow:
   skill reads the existing body, identifies that most branches are
   resolved, asks one or two narrow questions on remaining nits ("when
   two findings contradict, refuse or pick the latest?"), recommends
   per question, captain locks, one or zero `/create-decision`
   invocations land. Short interview; no false-positive question
   manufacturing.

3. **non-design-question-routing** — Captain prompt: "Grill me on the
   project — what's the current file layout?" Expected flow: skill
   recognizes this is not a design question, names the right skill
   ("file layout is `/start-session`'s scope; for a doc-shaped answer,
   `/write-doc`"), and stops without launching the interview. No
   `/create-decision` or `/create-note` invocations. The skill MUST NOT
   answer the layout question itself inside grill-me's frame.

## Pass criteria

For each scenario, the skill must:

- (1) ground recommendations in code (or explicitly state the repo
  doesn't answer the question)
- (2) ask exactly one question per turn
- (3) walk in dependency order — never ask a child whose parent is open
- (4) persist via `/create-decision` for locks and `/create-note` for
  non-decision observations; never auto-classify ambiguous cases
- (5) route out-of-scope topics to the named skill instead of answering
  inline

Cross-scenario: the recommendation seeds the conversation but the
captain's locked words (not the recommendation) populate the
`/create-decision` body.

## Iteration log

- **Iter 1** (2026-05-09): Authored brief and refreshed `grill-me`
  body to encode codebase-grounded recommendations, one-question-per-turn,
  dependency-ordered walk, `/create-decision` and `/create-note`
  persistence with explicit discriminator, and out-of-scope routing.
  Static eval drafted; no live runs yet.
