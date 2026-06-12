# ADR 0003 — Per-module database migrations

Status: **accepted**
Date: 2026-06-10

## Context

With modules owning real features (ADR 0002), they need to own tables — and a module's
schema must ship and evolve *with the module*, not inside one central journal that
every module edits.

## Decision

**Each schema owner gets its own Drizzle journal**, applied by one runner:

- Core keeps `apps/solivio/drizzle` (auth tables only: `users`, `sessions`,
  `accounts`, `verifications`; default `__drizzle_migrations` table).
- Each module with a `src/data/schema.ts` owns `src/data/migrations/`, tracked in its
  own `drizzle_migrations_<module_id>` table.
- **Every journal starts from a fresh `0000_init` baseline** that creates only its
  owner's tables — there is no shared history and no legacy adoption.
- `yarn generate` emits a per-module drizzle-kit config and a migration manifest;
  `apps/solivio/scripts/migrate.mjs` applies the core journal, then every enabled
  module's journal in manifest order, under a pg advisory lock. The production
  container runs the same script at startup.
- `yarn db:generate [moduleId]` targets the owning journal;
  `yarn db:check` regenerates every journal into a temp copy and diffs (drift gate in
  CI).

**Table naming.** Every module table must be named `<module_id>` or `<module_id>_*`
(snake_case; hyphens in the module id become underscores), validated by the generator
with no exceptions. The tables that predate the split were renamed to comply
(`catalog_products`, `catalog_product_prices`, `customers_requests`, `offers_items`,
`offers_revisions`). Core auth tables are core-owned, not module tables.

**Cross-module references are id-only.** A module never declares an FK onto another
owner's table and never SQL-joins it; display data comes through batch service lookups.
Intra-module FKs remain. Rationale: referential enforcement across ownership boundaries
couples schemas that must evolve independently and blocks a future where an owner's
storage moves; integrity across boundaries is the owning service's job.

An earlier interim scheme — grandfathered unprefixed table names plus a detach + adopt
migration recipe guarded by a CI continuity check — was removed before any public
release in favor of the fresh baselines and the strict naming rule above.

## Alternatives

- **One central journal, modules contribute migrations into it** — rejected: ordering
  conflicts between modules, disabling a module leaves its history tangled in the
  shared journal, and out-of-tree modules cannot ship migrations at all.
- **Keeping the pre-split table names via a grandfathered list** — rejected: a frozen
  exception list complicates the validator and the docs forever, and with no public
  release there was no deployed data to protect.
- **Keeping cross-module FKs** — rejected: couples owners' schemas; constraints cannot
  be ordered safely across independent journals.
- **A non-Drizzle migration tool per module** — rejected: one toolchain, and
  drizzle-kit's per-config `migrations.table` gives owner isolation for free.

## Consequences

- Schema changes are per-owner: edit the owning schema file, `yarn db:generate
  [moduleId]`, review SQL, commit schema + journal together.
- Application-level integrity replaces FK enforcement at module boundaries — services
  validate referenced ids; orphaned ids are tolerated and resolved at read time.
- Module journals ship inside module packages, so out-of-tree modules carry their own
  migrations; the image copies `modules/` so the startup runner can read them.
