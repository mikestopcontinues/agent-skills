# Review focus: architecture

**Persona**: architect
**Applies to**: code diff

Assess whether the *produced code* respects the project's architectural rules:
module boundaries, contract-first design, composability, and the absence of
hidden coupling. The rules live in the root `CLAUDE.md` ("Module Boundaries",
"Design Principles", "Engineering Principles", "Package Entrypoints") and the
conventions under `docs/conventions/` indexed by `docs/AGENTS.md` — read those
before reviewing. Every finding must (a) cite the file:line in the diff, (b)
name the rule violated, and (c) describe the structural consequence — not a
stylistic preference.

## Signals to flag

- **Module boundary breach** — a sibling import bypassing `index.ts`, a
  deep-import into another module's internals, code added at `src/*.ts` that is
  not a package export.
- **Circular package dependency** — a new import edge that introduces a
  workspace-graph cycle (`disallowWorkspaceCycles` enforces).
- **Implementation without contract** — a new public surface added without the
  `index.ts` shape defined first; types backfilled after the implementation.
- **Hidden coupling under abstraction** — a new `*Impl` with one implementor,
  premature inheritance, a factory whose return shape is a one-impl interface.
- **Everything-is-a-plugin violation** — new kernel ambient state, a
  cross-cutting global, hard-coded composition that should be injected.
- **Provider-agnostic violation** — vendor-specific code or types added outside a
  `packages/provider-*` adapter.
- **Composition-over-magic violation** — implicit ambient state, dev-mode
  conditionals inside library code, module augmentation (`declare module` /
  `declare global`), wildcard re-exports (`export * from`), cross-package
  re-exports outside an explicit facade.
- **`/types` contamination** — runtime logic added to a `/types` submodule, or a
  `/types` file importing from a runtime module in the same package.
- **Errors outside `@os/errors`** — a new error class defined elsewhere, or a
  class extending `Error` directly instead of `SerializableError`.
- **Events misplacement** — a cross-package event defined in a single package's
  `events/` instead of `@os/events`.

## Verification recipe

Run against the files the diff touches (and their package's `src/`):

- Deep cross-module imports: `Grep -rn "from ['\"]\\.\\./[^/]+/[^']+['\"]"` in
  the changed files — sibling imports must hit `index.ts`, not internals.
- Module augmentation: `Grep -rn "declare (module|global)"` — zero hits in the
  diff.
- Wildcard re-exports: `Grep -rn "export \\* from"` — zero hits in the diff.
- Cross-package re-exports: in the affected `src/index.ts`, `Grep` for
  `export .* from ['\"]@os/` — flag any non-facade re-export.
- Errors: `Grep -rn "extends Error\\b"` in the diff outside `@os/errors` — zero
  hits.
- New deps: read the changed `package.json`; confirm the dependency graph stays
  acyclic.

## What NOT to flag

- Naming, prose, or formatting preferences — `dx` for surface naming, the quality
  gate for formatting.
- Performance speculation.
- Implementation details inside a properly-bounded module — the boundary is your
  concern, not the internals.
- Test coverage or whether the change matches the spec — `accuracy`.
- Library/framework choice unless it breaks provider-agnostic or a boundary.
- Pre-existing boundary debt the diff doesn't touch — note as context, not a
  finding.

## Worked examples

**SHOULD flag** (Major): the diff adds `packages/oauth/src/oauthUtils.ts`
exported from `src/index.ts`. Per the `src/` layout rule, only package-export
files may live at `src/*.ts`; everything else belongs in a submodule with its
own `index.ts`. Move to `src/oauth/utils.ts`, re-export via `src/oauth/index.ts`.

**SHOULD flag** (Blocker): the diff adds `import { Foo } from
'@os/cli/src/internal/foo'` inside `@os/server`, and `@os/cli` already imports
`@os/server` — a new cycle.

**SHOULD NOT flag**: a 200-line internal helper added inside
`src/oauth/discovery.ts` that parses JSON without streaming. The boundary is
intact; parser ergonomics and performance belong to other reviewers.

## Severity notes

- **Blocker** — breaks design intent or ships a broken contract: a new circular
  package dep, a breach of a published module-boundary contract, an interface
  that contradicts a prior locked decision, an error class extending `Error`.
- **Major** — significant boundary erosion or coupling that compounds: a
  cross-module deep import, a new public surface without interface-first design,
  vendor-specific code in a non-adapter package, a `*Impl` with a single
  implementor, ambient kernel state, a wildcard re-export.
- **Minor** — localized boundary blur: a helper in the wrong module, a re-export
  that flattens paths without facade justification, an unjustified subpath
  export.
- **Nit** — cosmetic structural suggestions.
- Architecture findings of `major`/`blocker` severity are decision-shaped and
  route through `lock-decisions` per d11 — write them as decisions, not as
  auto-applied fixes. Defer to the review-code skill body for the general
  severity ladder.
