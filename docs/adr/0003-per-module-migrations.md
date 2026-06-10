# ADR 0003 — Per-module database migrations

Status: **accepted**
Date: 2026-06-10

## Context

With modules owning real features (ADR 0002), they need to own tables — and a module's
schema must ship and evolve *with the module*, not inside one central journal that
every module edits. At the time of the split, one core Drizzle journal
(`apps/solivio/drizzle`) had already created all tables on deployed databases (the
demo), so any split had to migrate those databases forward without data loss and
without rewriting applied history.

## Decision

**Each schema owner gets its own Drizzle journal**, applied by one runner:

- Core keeps `apps/solivio/drizzle` (auth tables; default `__drizzle_migrations`
  table — identical behavior to the pre-split runner).
- Each module with a `src/data/schema.ts` owns `src/data/migrations/`, tracked in its
  own `drizzle_migrations_<module_id>` table.
- `yarn generate` emits a per-module drizzle-kit config and a migration manifest;
  `apps/solivio/scripts/migrate.mjs` applies the core journal, then every enabled
  module's journal in manifest order, under a pg advisory lock. The production
  container runs the same script at startup.
- `yarn db:generate [moduleId]` targets the owning journal;
  `yarn db:check` regenerates every journal into a temp copy and diffs (drift gate in
  CI).

**Table naming.** New module tables must be `<module_id>_`-prefixed (validated by the
generator). The tables that predate the split keep their names — a frozen,
**grandfathered** list (`products`, `product_prices`, `customers`, `requests`,
`offers`, `offer_items`, `offer_revisions`, `offer_chat_threads`,
`offer_chat_messages`, plus core auth tables). Renaming them was rejected: high-risk
data migration on deployed databases for purely cosmetic gain.

**Cross-module references are id-only.** FK constraints that crossed module boundaries
(`offers → customers/requests`, `offer_items → products`, `offers → users`,
`offer_chat_threads → offers`) were **dropped** in detach migrations. A module never
declares an FK onto another owner's table and never SQL-joins it; display data comes
through batch service lookups. Intra-module FKs remain. Rationale: referential
enforcement across ownership boundaries couples schemas that must evolve independently
and blocks a future where an owner's storage moves; integrity across boundaries is the
owning service's job.

**Adoption/detach recipe** for moving an existing table between owners:

1. *Detach* — the old owner removes the table from its schema and commits a custom
   migration dropping only the cross-owner FK constraints (the table is not dropped);
   its snapshot forgets the table.
2. *Adopt* — the new owner defines the table and commits an **idempotent** adoption
   migration as its journal's first entry (`CREATE TABLE IF NOT EXISTS`,
   `CREATE INDEX IF NOT EXISTS`, constraint adds guarded by
   `duplicate_object` handlers). No-op on deployed databases, full create on fresh
   ones.

**Continuity guarantee.** `scripts/db/verify-continuity.mjs` (CI) simulates a deployed
database — scratch DB with only the frozen pre-split baseline of the core journal
(entries `idx <= 1`, frozen forever) — then runs the real runner over it and asserts
convergence (tables present, cross-owner FKs gone). Deployed databases and fresh
checkouts provably converge on the same state.

## Alternatives

- **One central journal, modules contribute migrations into it** — rejected: ordering
  conflicts between modules, disabling a module leaves its history tangled in the
  shared journal, and out-of-tree modules cannot ship migrations at all.
- **Renaming grandfathered tables to prefixed names** — rejected (above).
- **Keeping cross-module FKs** — rejected: couples owners' schemas; the detach
  migrations would have been impossible to order safely across independent journals.
- **A non-Drizzle migration tool per module** — rejected: one toolchain, and
  drizzle-kit's per-config `migrations.table` gives owner isolation for free.

## Consequences

- Schema changes are per-owner: edit the owning schema file, `yarn db:generate
  [moduleId]`, review SQL, commit schema + journal together.
- Application-level integrity replaces FK enforcement at module boundaries — services
  validate referenced ids; orphaned ids are tolerated and resolved at read time.
- The pre-split baseline of the core journal is immutable; never edit entries at or
  below the continuity cutoff.
- Module journals ship inside module packages, so out-of-tree modules carry their own
  migrations; the image copies `modules/` so the startup runner can read them.
