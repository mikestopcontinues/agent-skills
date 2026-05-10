---
name: grill-me
description: Interview the captain relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when the captain wants to stress-test a plan, get grilled on a design, or mentions "grill me".
---

Open-ended Socratic interview. The captain's prompt sets the topic; this
skill walks the design tree branch by branch, recommending an answer per
question, and persists outcomes via `/create-decision` and `/create-note`.

Distinct from `/lock-decisions`, which is finding-driven and consumes a
finite cluster list. `grill-me` is open-ended — the question set is
discovered as the interview unfolds.

## When to Use

- Captain says "grill me", "stress-test this", "interview me on X"
- Captain wants to converge on a design before writing a spec
- A `/lock-decisions` finding routes to `grill` (lock-decisions invokes
  `grill-me` for that finding, then resumes its own loop)

## When NOT to Use

- Resolving a finite list of decision-shaped findings → `/lock-decisions`
- "What's the file layout?" / "What's the current state?" → `/start-session`
- "Write this doc" / "Edit this section" → `/write-doc`
- "Apply review feedback" → `/revise-doc`

## Process

### 1. Receive the Topic

The captain's opening prompt sets scope. Restate the topic in one sentence
and confirm the boundary before exploring.

### 2. Explore the Codebase

Before recommending answers, ground in repo state. Use `Read`, `Glob`,
`Grep`, and `Bash` for inspection (file listings, git history, schema
shape). If a question can be answered by reading code, read code instead
of asking.

### 3. Map the Decision Tree (Internally)

Sketch the dependency graph of open questions. Parent decisions before
child decisions. A leaf question whose answer depends on an unresolved
parent gets deferred until the parent is locked.

### 4. Interview Loop

Per question:

- **One question per turn.** Never bundle. The captain answers one thing
  at a time so the dependency graph stays legible.
- **Recommend an answer.** State the recommendation with one or two
  sentences of rationale grounded in the codebase exploration. No
  recommendation = no question.
- **Wait for the captain's lock.** The captain may accept, modify, or
  reject. The captain's locked answer (not the recommendation) is what
  gets persisted.
- **Walk in dependency order.** When a parent answer reshapes the child
  question set, replan the queue before continuing.

### 5. Persist Outcomes

As the interview unfolds, two persistence paths:

- **Captain locks an answer to a design question** → invoke
  `/create-decision <kebab-name>` with the captain's answer body. The
  decision name is short and descriptive; the body is the captain's
  resolution plus the rationale that survived the interview.
- **Exploration surfaces an observation worth keeping but NOT a decision**
  (a design note, an API quirk, a constraint discovered mid-grill) →
  invoke `/create-note <kebab-name>` with the observation.

Discriminator: **decisions are choices among alternatives that the
captain has now closed**; **notes are observations or contracts that
inform future decisions but don't themselves resolve a choice**. If
unsure, ask the captain "decision or note?" — never auto-classify.

### 6. Route Out-of-Scope Questions

If the captain raises a non-design question mid-interview, name the
right skill and stop:

- "What's the layout?" / "Where are we?" → `/start-session`
- "Write the spec" / "Author the chapter" → `/write-doc`
- "Apply this review" → `/revise-doc`

Don't try to answer out-of-scope questions inside grill-me.

### 7. Exit

Exit when the captain says "done", when the open-question queue is empty,
or when remaining questions all defer to a future spike. Brief the
captain: count of decisions locked, count of notes created, any open
questions deferred.

## Guidelines

- **Ground before recommending.** A recommendation without codebase
  grounding is noise. If the repo doesn't answer it, say so explicitly.
- **One question per turn.** Multi-question turns are forbidden.
- **Dependency order.** Parents before children. Replan when a parent
  answer changes the child set.
- **Don't auto-classify decision vs note.** When ambiguous, ask.
- **Captain's words, not recommendations, get persisted.** The
  recommendation seeds the conversation; the captain's locked answer
  is what `/create-decision` receives.
