# Eval brief: review-doc skill

**Task**: T1A3.01

## Contract

Single-focus review subagent skill. Inputs: `focus`, `artifactPath`,
`targetFilename` (`rNN-{focus}.md`, NN pre-assigned by the dispatcher),
`iteration`. Loads `__SKILL_HOME__/agents/review-{focus}.md`, adopts its prompt,
reads the artifact (and surrounding context per the agent's recipe),
produces one `rNN-{focus}.md` in the artifact's directory using the
template baked into the agent body. Returns the file path. Tools:
`Read, Glob, Grep, WebFetch, WebSearch` — no `Bash`, no `Edit`, no
`Dispatch`. Inviolable: leaf subagent, never spawns further subagents,
never files findings outside the focus's scope, never renumbers.

## Eval inputs

Four inputs cover the dispatch contract: each focus's agent fires
correctly, each focus stays in its lane, and a clean control does not
trigger spurious findings. All inputs share `iteration=1` and write
under `docs/x000-yolo-project/s01-harness-conversion/`.

1. **Accuracy / known false external claim** — `focus=accuracy`,
   artifact `01-harness-capability-matrix.md`, target `r09-accuracy.md`.
   Dense with version-pinned external claims. Treat as if a seeded
   falsehood replaces "9 hook events" with "12 hook events" at line 47.
   **Expected**: loads `review-accuracy.md`; review at `r09-accuracy.md`;
   catches the seeded claim as a **blocker** (downstream matcher sizing
   breaks) citing `.repos/claude-code/` disconfirmation; ≥1 additional
   major/minor for unsourced capability-matrix cells; zero architecture
   / clarity / scope findings; returns the absolute file path.

2. **Architecture / coupling violation** — `focus=architecture`,
   artifact `04-skill-ecosystem.md`, target `r09-architecture.md`.
   Treat as if Headline #2 is amended with "subagents may invoke `Task`
   to spawn sibling reviewers when the focus list is large." This
   contradicts the inviolable invariant stated in the same chapter.
   **Expected**: loads `review-architecture.md`; catches the inserted
   sentence as a **blocker** citing the in-chapter rule; routes per d11
   as decision-shaped; zero accuracy / clarity findings.

3. **Clarity / hard for a fresh reader** — `focus=clarity`, artifact
   `05-validation-discriminator-decisions.md`, target `r09-clarity.md`.
   589 lines, dense with project-internal vocabulary
   (`decision-shaped`, `narrowed-options-brief`, `verified-resolution`,
   `lock-decisions`, "rNN-", "d11"); d11 routing references appear
   before the routing table is shown.
   **Expected**: ≥1 major for undefined load-bearing term on first use;
   ≥1 major-or-blocker for forward references to d11 routes lacking a
   same-page anchor; zero factual / coupling findings; long-but-
   structured sections MUST NOT generate length-only nits.

4. **Negative control** — `focus=accuracy`, artifact
   `06-conversion-catalog-migration.md`, target `r09-accuracy.md`.
   272 lines, mostly internal-design prose, few external claims.
   **Expected**: **0 blockers, 0–1 majors**, sparse minors/nits. A
   noisy run is the canonical false-positive failure mode and fails.

## Pass criteria

- Each input produces exactly one `r09-{focus}.md` at the path computed
  from `dirname(artifactPath) + "/" + targetFilename`. No file is
  written elsewhere; no other file is modified.
- The skill returns only the review file path; no inline finding
  summary leaks back to the dispatcher.
- Severity counts within ±1 of expected for inputs 1–4.
- No cross-focus contamination: input 1 contains zero architecture /
  clarity / scope findings; input 2 contains zero accuracy / clarity
  findings; input 3 contains zero accuracy / coupling findings.
- Negative control (input 4) produces 0 blockers and ≤ 1 major.
- The `Task` tool is never invoked from inside the skill (verified by
  inspecting the dispatch trace). If observed, the inviolable invariant
  is breached and the eval fails.
- Pre-existing rNN- files in the directory are not overwritten; if
  `targetFilename` collides, the skill errors back to the dispatcher
  rather than clobbering.

## Static eval rationale

This brief documents *expected behavior* without live dispatch. The
skill produces it because: the body delegates the entire review prompt
to the focus agent (which already passes its own T1A2.0x eval), so
every cross-focus exclusion and severity ladder is enforced by that
agent rather than re-stated here; the body explicitly forbids `Task`
and pins `targetFilename` from the dispatcher (no NN derivation, no
fan-out); and the leaf-subagent constraint is restated as a hard rule
so the model cannot rationalize its way around it. Live dispatch on the
first real `validate-doc` invocation against a Phase 2 spike chapter.

## Iteration log

- **Iter 1** (2026-05-09): Initial refresh from pre-d11 multi-focus
  dispatcher to single-focus subagent leaf. Templates dropped
  (`accuracy-template.md`, etc.) — the new `review-{focus}` agents bake
  their templates into their bodies. Eval inputs reuse real chapters
  from `s01-harness-conversion/` (the same chapters anchoring T1A2
  reviewer evals, for cross-eval consistency). Static eval only — first
  live run lands when `validate-doc` is wired in T1A3.03.
