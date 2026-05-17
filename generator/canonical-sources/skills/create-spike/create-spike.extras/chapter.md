# Chapter Template

Use this structure for every spike chapter. Delete this header and instructions
when writing the actual chapter.

## Line Target

500-1000 lines per chapter. Depth over brevity — exhaustive, source-verified
research is the goal.

## Structure

```markdown
# [Chapter Title]

_Part of [parent spike topic](./README.md)_

---

## The Problem

[1-2 paragraphs. What specific question does this chapter answer?
Why does it matter for OpenSpike? What goes wrong if we get it wrong?]

## The Simplest Version

[Start with the absolute simplest approach. Show a minimal TypeScript
example. This is the baseline everything else builds on.]

```typescript
// Minimal example — the naive approach
```

## How Reference Codebases Handle This

[Consult docs/REFERENCE.md for relevant projects. Browse their
GitHub repos with `gh` to study code patterns. Include every project
that touches this topic — 5+ codebases minimum.]

### [Project A]

[What does this codebase do? Show actual code patterns found on GitHub.
Cite specific file paths. Note what works well and what doesn't.]

### [Project B]

[Same treatment for each relevant project.]

### Comparison

| Approach | Pros | Cons | Used By |
|----------|------|------|---------|
| ... | ... | ... | ... |

## What the Internet Says

[Search the web for current best practices, official docs, blog posts,
conference talks, RFCs, and community discussions. Read primary sources.
Cite with URLs. Note where internet findings confirm, contradict, or
extend what the local codebases show.]

### [Finding / Source]

[Summary of insight. Link to source.]

## Layering Complexity

[Now build on the simple version. What do real systems add and why?
Show the progression from simple to production-quality.]

```typescript
// More sophisticated example — addressing real-world concerns
```

## Tradeoffs

[Explicit tradeoff analysis. No "it depends" without saying what it
depends on. Name the axes of the decision.]

- **[Axis A]**: [option 1] vs [option 2] — [when each wins]
- **[Axis B]**: [option 1] vs [option 2] — [when each wins]

## Recommendations for OpenSpike

[Concrete, specific recommendations. Reference project design values.
Say what to build, not just what's possible.]

1. **[Recommendation]** — [rationale, citing design values]
2. **[Recommendation]** — [rationale]

## Open Questions

[What this chapter can't answer. What needs further investigation or
a captain decision. Link to other topics if relevant.]
```

## Research Method

Follow this priority order when gathering evidence:

1. **Source code first** — read actual implementations in reference repos and
   local codebases. File paths and function names are your primary citations.
   Code is the authority — if docs and code disagree, the code wins.
2. **Web research second** — search for current best practices, official docs,
   blog posts, RFCs, and community discussions. Cite with URLs.
3. **Training data last** — use general knowledge only for framing and
   context, never as evidence. If you can't verify a claim in source code
   or a cited web resource, mark it as `[UNVERIFIED]`.

Do NOT paraphrase or simplify type definitions. Copy exact TypeScript types
from source — generics, conditional types, mapped types, the full picture.

## Quality Standards

Every chapter must meet these standards:

- **Source verification**: Every architectural claim must cite a specific file
  path or URL. "The loop uses a while pattern" is not enough — cite the file
  and show the code.
- **Type precision**: Copy exact type definitions from source. Do not
  paraphrase or simplify types.
- **Comparison awareness**: Note when a pattern is similar to or different
  from common approaches. This helps synthesis identify convergent patterns.
- **No training-data opinions**: If you can't verify it in source or a cited
  resource, don't include it. Mark anything uncertain as `[UNVERIFIED]`.
- **Practical focus**: We're building something. Prioritize information that
  informs design decisions over academic completeness.

## Quality Checklist

Before submitting a chapter, verify:

- [ ] Starts with the simplest version, then layers complexity
- [ ] Includes TypeScript code examples (pseudocode OK for concepts)
- [ ] Consulted docs/REFERENCE.md — compared 5+ codebases with source citations
- [ ] Searched the internet — cited docs, posts, specs with URLs
- [ ] Calls out tradeoffs explicitly with named axes
- [ ] Ends with concrete recommendations for OpenSpike
- [ ] References relevant design values from CLAUDE.md
- [ ] Every architectural claim cites a file path or URL
- [ ] Uncertain claims marked `[UNVERIFIED]`
- [ ] Type definitions copied exactly from source, not paraphrased
- [ ] Focuses on: interfaces, modularity, changeability, testability
- [ ] No "it depends" without saying what it depends on
