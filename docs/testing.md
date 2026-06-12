# Testing Strategy

Status: initial backbone
Audience: contributors, agents
Last updated: 2026-06-12

Solivio is a build-time-codegen modular monolith, so tests should protect the
same boundaries the runtime uses: modules own behavior, cross-module calls go
through services/events/HTTP, and the generated wiring is validated rather than
hand-edited.

## Layers

### Architecture and generation gates

These are contract tests for the modular architecture, not lint noise:

```bash
yarn generate --check
yarn check
yarn typecheck
yarn db:check
```

`yarn check` includes the module boundary checker. It must stay fast and strict:
modules may not import app internals or other modules at runtime.

### Unit and module tests

Fast unit tests live beside the file that owns the behavior and run with:

```bash
yarn test:unit
yarn test:watch
```

Use Vitest (`test`, `describe`, `expect`, `vi`) for module and package unit
tests. The root `vitest.config.ts` runs in the Node environment and resolves
the `react-server` package condition so server module files that import Next's
`server-only` marker can be loaded outside Next.

Recommended layout:

```text
modules/
  <module-id>/
    src/
      lib/
        parser.ts
        parser.test.ts
      server/
        service.ts
        service.test.ts
tests/
  support/
    runtime.ts
```

`tests/support/runtime.ts` installs a fake `@solivio/sdk/runtime` host through
the SDK's `setRuntime()` seam. Use it when module code calls `getService()`,
`getDb()`, `getAuth()`, `getImporter()`, `emitEvent()`, or similar accessors.
Keep shared test harness code in root `tests/support/`; keep module-owned
assertions next to the production file they exercise.

Default rule: test the module's public service, route, importer, job, or event
surface. Pure helpers can be tested directly when they encode business-relevant
parsing or validation. Consumer module tests should fake provider services by
their public service interface; do not import provider internals to set up a
consumer test.

Narrow DB fakes are acceptable for unit tests when the fake is specific to the
module-owned calls under test and fails loudly for unsupported operations. Use
real Postgres for repository, migration, transaction, pgvector, or cross-module
integration behavior.

### Integration tests

When a test needs real database behavior, use the normal committed migrations
against Postgres. Do not introduce SQLite or in-memory Drizzle substitutes for
module integration tests; they will miss schema, transaction, SQL, pgvector, and
migration behavior that Solivio relies on.

There is no separate integration runner yet. When adding one, prefer:

- database setup through `yarn setup` / committed migrations,
- cleanup by module-owned table prefix,
- tests that invoke one use case through a module service or HTTP route,
- provider dependencies faked unless the test is explicitly cross-module.

### End-to-end tests

Playwright tests live in `e2e/` and run with:

```bash
yarn setup
yarn e2e
```

Keep E2E thin: auth, generated module pages/routes, and a few critical
cross-module workflows. Use unique test data because local Playwright runs are
fully parallel. Do not depend on external services; CI runs with
`OPENAI_API_KEY` empty.

## Choosing a Layer

- Parser, mapper, schema, importer, deterministic service branch: colocated
  `*.test.ts` run by `yarn test:unit`.
- Runtime accessors, event emission, service dependency, auth guard behavior:
  `yarn test:unit` with `installTestRuntime()`.
- SQL, migration, transaction, pgvector, repository behavior: future integration
  test against Postgres.
- Generated app-router wiring, auth/session behavior, pages, and cross-module
  user journeys: Playwright E2E.
- Module graph, generated artifacts, import boundaries, table prefixes:
  `yarn generate --check`, `yarn check`, `yarn db:check`, generator tests.
