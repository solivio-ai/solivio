# Agent Notes

This repository is intended to stay easy to launch for contributors evaluating the idea.

The sections below are the quick reference. They summarize the boundaries; the detailed sections later in this file (Development, Modules, Database, UI) and the docs in `docs/` remain authoritative.

## Always

- Match the task to the **Task Router** below and read the relevant `docs/` guide before researching or coding. A task can match multiple rows — read all of them.
- Run `yarn check` before handing work back (Biome + the module boundary checker); add `yarn typecheck` whenever TypeScript, API contracts, server code, or React behavior changes. Auto-fix formatting first with `yarn biome check --write .`.
- Run `yarn generate` after changing module files or `solivio.config.ts` — the generated registries and app-router stubs are how module code reaches the app. (`yarn dev` keeps a generator watcher running for you.)
- Keep feature code in modules (`modules/<id>/src/`); modules depend only on `@solivio/sdk` and the shared packages (`@solivio/ui`, `@solivio/theme`, `@solivio/domain`), and reach shared infrastructure only through `@solivio/sdk/runtime` accessors.
- Read each module's own `AGENTS.md` (e.g. `modules/customers/AGENTS.md`) before changing it; `modules/products-sync` is the reference example exercising every module surface.
- Change database schema only through committed Drizzle migrations in the owning journal (`yarn db:generate` for core, `yarn db:generate <moduleId>` for a module) and verify with `yarn db:check`.
- Build UI from the shared shadcn/ui kit in `packages/ui` and Tailwind utilities; check https://ui.shadcn.com/docs/components before writing a new component.
- Use mocks until the data model and integration boundaries are clear, and keep setup commands simple and documented.
- After a correction, record a rule in `docs/lessons.md` (see **Self-improvement**) so the same mistake cannot recur.

## Ask First

- Before changing architecture, the public `@solivio/sdk` contract surface, or the module/SDK boundary (`docs/contracts.md`).
- Before changing the generator (`scripts/generate/`) or the shape of its emitted artifacts (`docs/codegen.md`).
- Before adding a required external service to the default demo path, or adding a production dependency.
- Before applying migrations in any shared or non-local environment.
- Before reducing scope or changing behavior the user or a doc did not explicitly ask to change.

## Never

- Never edit `apps/solivio/src/generated/` or the generated app trees (`apps/solivio/src/app/(protected)/(gen)/`, `(gen-public)/`, `api/(gen)/`) — they are generator-owned, gitignored, and overwritten by `yarn generate`.
- Never import another module at runtime — cross-module calls go through `getService()` and typed events only. The one sanctioned exception is a **type-only** import of a dependency module's `services.ts` (erased at runtime) to pull its `Services` augmentation into the typecheck.
- Never make a module import app internals (`@/...`, `@solivio/app`) — modules depend only on `@solivio/sdk` and the shared packages.
- Never SQL-join another module's tables. Cross-module references are id-only columns (no FK constraints); fetch display data through batch service lookups (`findByIds`-style).
- Never name a module table anything other than `<module_id>` or `<module_id>_*` (snake_case, hyphens in the module id become underscores; see `docs/database.md`).
- Never run module code at import time that touches the runtime (`getDb()`, `getService()`, `getAi()`, …) — instantiate agents and resolve services lazily inside handlers/factories; the runtime boots in `instrumentation.ts` after modules are imported.
- Never import the Drizzle client (`apps/solivio/src/server/database/db.ts`) outside `apps/solivio/src/server/` or `apps/solivio/src/app/api/`; module code uses `getDb()`/`db` from `@solivio/sdk/runtime` with its own `data/schema.ts` tables.
- Never write custom CSS classes or add rules to `globals.css` beyond the allowed blocks, and never hard-code theme colors — use the theme tokens.
- Never add required external services to the default demo path.

## Validation Commands

Choose the smallest relevant set for the change:

```bash
yarn validate                # the PR gate: biome + boundaries + generate --check + typecheck + generator tests
yarn biome check --write .   # format, sort imports, apply safe lint fixes
yarn generate                # regenerate module wiring (add --check to validate only)
yarn check                   # Biome quality gate + module boundary checker (CI runs this)
yarn typecheck               # when TS, API contracts, server code, or React behavior changes
yarn test:generator          # unit tests for scripts/generate (run after touching it)
yarn db:check                # journals match schemas (core + every module journal)
yarn e2e                     # Playwright against http://localhost:3000 (yarn setup first)
```

Scaffold a new module with `yarn create-module <id>`; load demo data with `yarn seed`.

## Task Router — Where to Find Detailed Guidance

Before research or coding, match the task to a row and read the linked guide. A single task often matches multiple rows — read all of them.

| Task | Guide |
|------|-------|
| Building or changing a module — anatomy, services/events, pages/API routes, jobs, capabilities, boundaries | `docs/module-system.md` + the module's own `AGENTS.md` + this file → **Modules** |
| The generator (`yarn generate`) — inputs, emitted artifacts, validations, watch/check modes | `docs/codegen.md` |
| What the public SDK/module contract surface is — what is stable and what modules may import | `docs/contracts.md` |
| AI agents — which module owns which agent, agent tools, per-role models | `docs/agents.md` |
| Overall architecture, layering, and module boundaries | `docs/architecture.md` |
| Database schema, per-owner migration journals, or the entity-relationship model | `docs/database.md` + `docs/erd.md` |
| HTTP API routes and their conventions | `docs/api.md` |
| Operator overlays — running custom modules without forking (`yarn overlay`) | `docs/codegen.md` → Config resolution + public guide `apps/docs/.../guides/extending.md` |
| Building/publishing images, deployment | `docs/publishing.md` + this file → **Build** / **Deploy** |
| Product scope and what the MVP includes | `docs/mvp-scope.md` |
| Why a load-bearing technical decision was made | `docs/adr/` |

## Working with Subagents

Offload research and parallel analysis to subagents to keep the main context clean. Give each subagent a single, focused task. Prefer subagents for broad searches across many files where you only need the conclusion.

## Self-improvement

After the user corrects you, append a dated entry to `docs/lessons.md`. If the lesson is a durable rule, also fold it into the relevant **Always** / **Never** list above or the matching `docs/` guide, written so the same mistake cannot repeat.

## Development

```bash
yarn install
cp apps/solivio/.env.example apps/solivio/.env.local   # set BETTER_AUTH_SECRET via `openssl rand -base64 32`
yarn setup                                              # docker compose up db, wait for it, generate module wiring, run migrations
yarn dev                                                # generator in watch mode + Next.js on :3000
```

`yarn setup` must run on a fresh checkout before `yarn dev`, and again whenever new Drizzle migrations are added. `yarn db:migrate` applies pending migrations (the core journal plus every enabled module's journal) without restarting the database.

`yarn generate` reads `solivio.config.ts`, discovers each enabled module's files by convention, validates the module graph, and emits the registries and app-router stubs the app builds against. It runs inside `yarn setup`, `yarn dev` (watch mode), and `yarn build`, so it rarely needs to be invoked by hand — but stale wiring after a manual module change is fixed by running it.

## Code Quality

Biome is the single formatting, linting, and import-organization tool for this repository.

Agents may ignore formatting noise while actively editing, but must normalize and verify their work before handing it back:

```bash
yarn biome check --write .   # formats, sorts imports, and applies safe lint fixes
yarn check                   # Biome + scripts/check-boundaries.mts (module import boundaries)
```

Use `yarn check` as the single repository quality gate. It includes the module boundary checker: modules may not import other modules or app internals, and handwritten app code may not import `@solivio/module-*` directly (only the generated registries do).

Run `yarn typecheck` as well whenever TypeScript, API contracts, server code, or React component behavior changes. Run `yarn db:check` after schema work.

Playwright e2e tests use the normal local app path: `yarn setup` prepares Postgres, module wiring, and migrations, and `yarn e2e` runs against `http://localhost:3000` while starting `yarn dev` if needed. Do not add separate e2e setup scripts. CI (`.github/workflows/quality.yml`) runs `yarn generate`, `yarn check`, `yarn typecheck`, `yarn db:check`, prepares `.env.local`, runs `yarn setup`, and then runs `yarn e2e`.

## Build

Production images are produced via `docker-compose.build.yml`:

```bash
docker compose -f docker-compose.build.yml build         # builds the app image
docker compose -f docker-compose.build.yml push          # pushes to GHCR (requires `docker login ghcr.io`)
```

This produces `ghcr.io/solivio-ai/solivio-app`, a Next.js standalone runtime. The Dockerfile runs `yarn generate` before `next build`, so the modules enabled in `solivio.config.ts` are compiled into the app. On startup the container applies committed Drizzle migrations — the core journal plus every enabled module's journal — before starting the server.

CI (`.github/workflows/build-image.yml`) runs the same commands on every push to `main` and tags the image with `:latest` and `:<commit-sha>`.

## Deploy

The demo runs on a single OVH VPS at `demo.solivio.ai` as three containers via `docker-compose.prod.yml`: Traefik (TLS), Postgres+pgvector, and the app. Manual deploy:

```bash
ssh ovh
cd /opt/solivio && git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Full deployment guide (host setup, GHCR auth, rollback, troubleshooting): `apps/docs/src/content/docs/guides/deployment.md`.

## Modules

Solivio is a modular monolith. A module is a TypeScript **source package** under `modules/<id>/` (no build step of its own); `yarn generate` discovers its files by convention and emits the wiring — registries under `apps/solivio/src/generated/` and Next.js app-router stubs under the `(gen)` trees — that compiles the module into the app. Enabling or disabling a module means editing `solivio.config.ts` and regenerating; there is no runtime loading. Out-of-tree modules are npm packages with `"solivio": { "module": true }` in `package.json`, enabled by adding the package name to `solivio.config.ts`.

Module anatomy (all parts optional; discovery is by file path):

| File | Contributes |
|------|-------------|
| `src/index.ts` | Manifest — default export `defineModule({ id, title, version, optionsSchema?, dependsOn?, routeGroup? })` |
| `src/services.ts` | `export const services` factories + `declare module "@solivio/sdk"` augmentation of `Services` |
| `src/events.ts` | Declaration-merged `Events` map (`<moduleId>.<entity>.<action>`) |
| `src/data/schema.ts` + `src/data/migrations/` | Module-owned Drizzle tables and the module's own migration journal |
| `src/api/**/route.ts` | HTTP routes under `/api/...` (stubbed into the app router) |
| `src/pages/**/page.tsx` | Pages (session-guarded by default; `routeGroup: "public"` opts out) |
| `src/components/` | Module-private React components |
| `src/subscribers/*.ts` | Event subscribers (`defineSubscriber`; `persistent: true` runs via the job queue) |
| `src/jobs/*.ts` | Background jobs (`defineJob`; optional cron schedule resolved at boot) |
| `src/ai/tools.ts`, `src/ai/importers.ts` | Agent tools and importer capabilities |
| `src/contracts/routes.ts` | OpenAPI route contracts merged into the API docs |
| `src/i18n/<locale>.json` | Translations, namespaced under the module id |
| `src/nav.tsx`, `src/slots.tsx` | Sidebar nav entries and slot contributions (client-safe) |
| `src/acl.ts` | `export const permissions` (must be `<moduleId>.`-prefixed) |
| `AGENTS.md` | The module's own working notes — read it first |

To add a module: create `modules/<id>/` with `package.json` (name `@solivio/module-<id>`, `"solivio": { "module": true }`), `tsconfig.json`, and `src/index.ts`; add the id to `solivio.config.ts` `modules`; run `yarn generate`. Mirror `modules/products-sync/` — it exercises every surface. Full details: `docs/module-system.md` and `docs/codegen.md`.

## Architecture

- `apps/solivio` owns the single Next.js app — the core: auth + `/admin/users`, the app shell and sidebar, runtime boot (`src/server/runtime/`, `instrumentation.ts`), the pg-boss jobs engine, `/api/health`, and the generated wiring.
- `modules/` owns the feature modules: `catalog`, `customers`, `offers`, `offer-chat`, `csv-import`, `products-sync`.
- `sdk/` owns `@solivio/sdk` — the only contract modules build against (manifest types, registries, runtime accessors).
- `packages/domain` owns shared types, workflow constants, and mock fixtures; `packages/ui` the shared shadcn/ui kit; `packages/theme` the design tokens.
- `scripts/generate` owns the module generator; `scripts/check-boundaries.mts` enforces import boundaries.
- `infra/postgres` owns local database bootstrap files.

Module dependency direction (declared via `dependsOn`, validated acyclic): `catalog` and `customers` are leaves; `offers` depends on both; `offer-chat` depends on `offers`; `products-sync` depends on `catalog`; `csv-import` is a headless capability provider.

## Current Product Shape

Solivio should help a sales team convert raw customer input into a reviewed offer:

1. Customer sends a request.
2. The system extracts requirements.
3. Product search and matching finds candidates.
4. A draft offer is generated.
5. A salesperson reviews, edits, validates, and accepts it.

## Database

Each schema owner has its **own Drizzle journal**: the core schema (`apps/solivio/src/server/database/schema.ts` — auth/users tables) migrates from `apps/solivio/drizzle/`, and each module's `src/data/schema.ts` migrates from its `src/data/migrations/` (tracked in its own `drizzle_migrations_<module>` table). `yarn db:migrate` applies the core journal, then every enabled module's journal, under an advisory lock — the same runner the production container executes at startup.

Schema changes:

1. Edit the owning schema file (core, or `modules/<id>/src/data/schema.ts`).
2. Run `yarn db:generate` (core) or `yarn db:generate <moduleId>` (module).
3. Review the generated SQL in the owning journal.
4. Run `yarn db:migrate` locally and `yarn db:check` to confirm no drift.

Module tables must be named `<module_id>` or `<module_id>_*` (snake_case); cross-module references are id-only columns without FK constraints.

## UI

The app uses **shadcn/ui** components with **Tailwind CSS v4**.

- Public copy should come from the README and user-facing guides.
- The shared component kit lives in `packages/ui` (`@solivio/ui`); both the app and modules import from it: `import { Button } from "@solivio/ui/components/button.tsx"`.
- Use shadcn primitives (`Button`, `Card`, `Badge`, `Textarea`, etc.) for all UI — do not write custom CSS classes. Before building any UI element, check https://ui.shadcn.com/docs/components; new primitives go into `packages/ui/src/components/`.
- Style layout and spacing with Tailwind utility classes only; avoid adding rules to `globals.css`. Module sources are picked up by Tailwind via the generated `@source` list (`apps/solivio/src/generated/tailwind.css`).
- Module pages render inside the app shell automatically (protected route group); modules host or fill UI injection points via `<Slot id="..." />` from `@solivio/slots` and `src/slots.tsx`.
- Theme tokens live in `packages/theme/src/tokens.css` and are mapped in `apps/solivio/src/app/globals.css` inside `@layer base`. The theme is light-first (Solivio brand: yellow primary `#F6C215`, teal secondary `#134E4A`) with dark mode kept as an optional `.dark` / `data-theme="dark"` variant.
- `globals.css` must stay clean: Tailwind imports, the generated `@source` import, `@theme inline` token mapping, and the `@layer base` theme block only.
