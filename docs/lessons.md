# Lessons

A running log of corrections, gotchas, and recurring mistakes — so an agent (or a contributor) does not repeat them.

## How to use this file

- After the user corrects you, or after you hit a non-obvious gotcha, add an entry here.
- If the lesson is a durable rule, also fold it into the relevant `Always` / `Never` list in `AGENTS.md` or the matching `docs/` guide — this log is for the long tail, the boundary lists are for the load-bearing rules.
- Keep entries short and concrete: what happened, the rule that prevents it, and where it applies.

## Format

Newest first. One entry per lesson:

```
### YYYY-MM-DD — short title

**Context:** what was being done and what went wrong.
**Rule:** the concrete thing to do (or avoid) next time.
**Applies to:** files, modules, or commands the rule covers.
```

## Lessons

### 2026-06-12 — Keep testing guidance colocated and concise

**Context:** Testing docs initially recorded intermediate decisions: root test placement, module-level placement, and research notes.
**Rule:** Prefer colocated `*.test.ts` beside production files under `modules/<id>/src/`; keep shared harness utilities in root `tests/support/`; keep task-router docs operational and compact.
**Applies to:** `modules/*/src/**/*.test.ts`, `tests/support/`, `docs/testing.md`, `vitest.config.ts`, `yarn test:unit`.

### 2026-06-12 — Keep pg-boss queue names v12-safe

**Context:** `pg-boss` 12 validates queue names more strictly. Existing job names such as `products-sync.run` are valid, but the old persistent-subscriber prefix `subscriber:<id>` used a colon and would fail once a persistent subscriber was registered.
**Rule:** Queue names sent to pg-boss should use only letters, numbers, hyphens, underscores, and periods. Use `subscriber.<id>` for persistent subscriber queues, and keep docs/runtime enqueue names in sync.
**Applies to:** `apps/solivio/src/server/runtime/jobs.ts`, `sdk/src/runtime.ts`, persistent subscribers, module job names.

### 2026-06-12 — Prefer the full health command over ad hoc validation

**Context:** Agents were manually composing several validation commands and then documenting `validate:all` as if it were mainly for dependency upgrades. The real need is a general, repeatable "is the repo healthy?" command.
**Rule:** Use and describe `yarn validate:all` as the full repo health and handoff command. Keep it from rewriting tracked source files; run fix commands like `yarn biome check --write .` and `yarn generate` separately when changes are intentional. Keep `yarn validate` as the faster static PR gate, and keep individual commands only for targeted feedback while actively editing.
**Applies to:** `AGENTS.md`, `package.json` scripts, and final validation guidance.

### 2026-06-12 — Dependency upgrades need package-manager hygiene

**Context:** A workspace-wide dependency upgrade initially missed `yarn dedupe`, and Yarn changed local manifest conventions while updating ranges.
**Rule:** After dependency changes, run `yarn dedupe` and verify with `yarn dedupe --check`. Preserve repo manifest conventions while upgrading: internal workspace dependencies stay `workspace:*`, deliberately pinned tools stay exact, and package major upgrades must be checked against runtime compatibility rather than accepted blindly.
**Applies to:** `package.json`, workspace `package.json` files, `yarn.lock`, and dependency maintenance.

### 2026-06-12 — pg-boss majors may require queue schema recreation

**Context:** Upgrading `pg-boss` from 10.x to 12.x typechecked after switching to the named `PgBoss` export, but `PgBoss.start()` could not migrate an existing local `pgboss.version = 24` schema. Dropping only the managed `pgboss` schema let v12 recreate it at schema version 30 without changing Drizzle journals.
**Rule:** Treat `pg-boss` major upgrades as operational database migrations, not ordinary library bumps. Verify `PgBoss.start()` against the existing `pgboss.version`; if the old queue data is disposable, reset `pgboss` with `DROP SCHEMA IF EXISTS pgboss CASCADE` and let `pg-boss` recreate it. Do not write Drizzle migrations for `pgboss`.
**Applies to:** `apps/solivio/package.json`, `apps/solivio/src/server/runtime/jobs.ts`, local/prod Postgres queue schema.

### 2026-06-12 — Do not run db drift temp files through Biome

**Context:** Running `yarn validate` in parallel with `yarn db:check` caused Biome to scan transient `.drizzle-check-*` directories while `db:check` was using them, producing formatting failures on generated temporary files.
**Rule:** Do not run `yarn validate` / `yarn check` concurrently with `yarn db:check`. Let `yarn validate:all` sequence them, or run database drift checks separately after static checks finish.
**Applies to:** `yarn validate`, `yarn check`, `yarn db:check`, `apps/solivio/.drizzle-check-*`.

### 2026-06-12 — Do not commit reusable local auth secrets

**Context:** A helper script for local validation initially wrote a predictable `BETTER_AUTH_SECRET` value into `.env.local`. The generated file was ignored, but the reusable secret value was committed in source.
**Rule:** Helper scripts may create ignored local env files, but secrets must be generated at runtime or left as placeholders with clear generation instructions. Never commit a reusable auth secret value, even for local development.
**Applies to:** `scripts/ensure-local-env.mjs`, `apps/solivio/.env.local`, local setup helpers.
