# Review focus: integration

**Persona**: architect
**Applies to**: documents

Evaluate one question: **does this plan compose with what already exists in the
repo, and does it break consumers without naming them and giving them a path
forward?** Integration findings are **consumer-impact assertions**. A finding
either identifies a concrete consumer whose contract the plan changes (with no
migration path documented), a concrete system the plan claims to compose with
that does not exist or is being deprecated, or a concrete handoff contract that
is missing or contradictory between two in-flight plans. "Could compose better"
is not a finding unless you can name the existing pattern it should align with
and the file that exemplifies it.

## Signals to flag

For every public surface the plan introduces or changes — a package export, a
CLI flag, an HTTP route, an event name, a config key, a hook contract:

- **Unnamed broken consumer** — the plan changes a contract callers depend on
  and never names them or gives a migration path.
- **Phantom composition target** — the plan claims to compose with a system that
  doesn't exist in the repo (zero `Grep` hits) or is being deprecated by another
  in-flight plan.
- **Missing handoff contract** — two in-flight plans share a type/event/route
  but disagree on its shape, with no single shared definition.
- **New dependency cycle** — a new dependency edge introduces a workspace-graph
  cycle.
- **Convention drift with neighbors** — a new symbol diverges from the prevailing
  convention in the systems it sits next to (Nit-level).

## Verification recipe

For every public surface the plan introduces or changes:

1. `Glob` the exporting `index.ts` and read its current shape.
2. `Grep` the symbol across `packages/`, `apps/`, `.claude/`, `scripts/`, and
   `docs/plans/` for callers, importers, and downstream plans that reference it.
   A symbol with zero hits is suspicious — the plan may be inventing a system
   rather than composing with one.
3. Walk the dependency graph: read `pnpm-workspace.yaml` and the affected
   package's `package.json` to confirm any new dependency keeps the graph
   acyclic.
4. Cross-check against repo conventions in `CLAUDE.md` (Module Boundaries,
   Package Entrypoints, events extensibility rule, error centralization in
   `@os/errors`, family-promotion rules for providers and channels) and
   `docs/CLAUDE.md`.
5. For external library or vendor compositions, verify version-specific behavior
   via `WebFetch` against the official docs at the version pinned in the
   lockfile — never trust an unverified summary.

A consumer list is missing if step 2 surfaces hits the plan never names.

## What NOT to flag

- Internal-architecture choices inside a properly-bounded subsystem —
  `architecture`.
- Documentation completeness for its own sake — `comprehensiveness`.
- Ergonomics or naming aesthetics of a new surface in isolation — `dx`. Naming
  inconsistency *with neighboring systems* is in scope (as a Nit).
- Subjective design tradeoffs the plan has explicitly considered and documented
  as decisions.
- Speculative future consumers. Only consumers that exist in the repo today (or
  in another plan currently in flight) count.

## Worked examples

**SHOULD flag** (Blocker): a plan changes the return type of an exported function
in `@os/oauth` from `Promise<boolean>` to `Promise<ForgetIdentityOutcome>`.
`Grep` shows three callers in `packages/cli` and one in `packages/server`. The
plan never names them. Finding: "Public API change without migration path.
Callers: `packages/cli/src/command/serve.ts:241`, ... . Document a per-caller
migration or hold the rename behind a deprecation."

**SHOULD flag** (Major): a plan provides a `ForgetIdentityOutcome` event but the
downstream plan that consumes it expects a `ForgottenIdentityEvent` with
different field names. Two in-flight plans, no shared contract. Name both plans,
cite the field diff, demand a single shared type in `@os/events` before either
lands.

**SHOULD NOT flag**: a plan introduces a new internal helper inside
`@os/oauth/discovery` with no exported surface change. Internal — `architecture`
territory.

## Severity notes

- **Blocker** — plan would break existing consumers without a documented
  migration path or compatibility shim; or composes with a system that does not
  exist or is being deprecated by another in-flight plan.
- **Major** — significant break risk to consumers or sibling subsystems; missing
  handoff contract between this plan and a named downstream; introduces a new
  dependency edge that creates a cycle.
- **Minor** — could integrate more cleanly with an existing pattern in the repo;
  consumer impact list is missing one or more affected callers.
- **Nit** — small naming inconsistency with neighboring systems (a new symbol
  that diverges from the prevailing convention nearby).
- Each finding cites `file:line` and pairs it with a one-line recommendation.
  Defer to d11 and the review-doc skill body for the general severity ladder.
