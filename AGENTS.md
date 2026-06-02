# Agent Notes

This repository is intended to stay easy to launch for contributors evaluating the idea.

## Development

```bash
yarn install
cp apps/solivio/.env.example apps/solivio/.env.local   # set BETTER_AUTH_SECRET via `openssl rand -base64 32`
yarn setup                                              # docker compose up db, wait for it, run migrations, build sdk + modules
yarn dev                                                # Next.js on :3000
```

`yarn setup` must run on a fresh checkout before `yarn dev`, and again whenever new Drizzle migrations are added. `yarn db:migrate` applies pending migrations without restarting the database.

`yarn modules:build` compiles the SDK and all packages under `modules/`. Re-run after changing module source files. It is included in `yarn setup` so a fresh checkout needs no separate step.

## Code Quality

Biome is the single formatting, linting, and import-organization tool for this repository.

Agents may ignore formatting noise while actively editing, but must normalize and verify their work before handing it back:

```bash
yarn biome check --write .   # formats, sorts imports, and applies safe lint fixes
yarn check                   # verifies formatting, lint rules, and import organization
```

Use `yarn check` as the single repository quality gate for Biome.

Run `yarn typecheck` as well whenever TypeScript, API contracts, server code, or React component behavior changes.

Playwright e2e tests use the normal local app path: `yarn setup` prepares Postgres and migrations, and `yarn e2e` runs against `http://localhost:3000` while starting `yarn dev` if needed. Do not add separate e2e setup scripts. CI (`.github/workflows/quality.yml`) runs `yarn check`, `yarn typecheck`, prepares `.env.local`, runs `yarn setup`, and then runs `yarn e2e`.

## Build

Production images are produced via `docker-compose.build.yml`:

```bash
docker compose -f docker-compose.build.yml build         # builds the app image
docker compose -f docker-compose.build.yml push          # pushes to GHCR (requires `docker login ghcr.io`)
```

This produces `ghcr.io/solivio-ai/solivio-app`, a Next.js standalone runtime that applies committed Drizzle migrations before starting the app.

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

Modules extend the core. A module is a factory built via `defineModule({ id, name, version, register(ctx, options) })`; `register` receives a `ModuleContext` (logger, config, AI, typed `services`, events) and returns typed capability contributions (v0: `importers`, `agentTools`). Modules depend only on `@solivio/sdk` — never on `@/server/*` or other modules.

`yarn modules:build` builds the SDK then bundles every `modules/*` package into a self-contained ESM bundle at `modules-dist/<package>/index.mjs` (esbuild). The core loads these bundles **at startup** by file URL from `SOLIVIO_MODULES_DIR` (default: repo `modules-dist/`) and registers each one. Operators add modules by dropping pre-built bundles + editing `solivio.config.json` — no app rebuild. Design rationale and the long-term shape live in `docs/module-system.md`.

To add a first-party module:
1. Create `modules/<name>/` with `src/index.ts` (default export `defineModule({...})`), `package.json`, and `tsconfig.json` — mirror `modules/csv-products-importer/` (importer) or `modules/offer-tools/` (agent tools).
2. Add an entry to `solivio.config.json` under `modules` (`{ "package": "@solivio/module-<name>", "options": {} }`), and bind a `slots` entry if it fills an exclusive capability.
3. Run `yarn modules:build`, then restart `yarn dev`.

## Architecture

- `apps/solivio` owns the single Next.js app.
- `apps/solivio/src/app/api` owns HTTP API routes.
- `apps/solivio/src/features` owns user-facing feature UI.
- `apps/solivio/src/server` owns server-only service integrations.
- `packages/domain` owns shared types, workflow constants, and mock fixtures.
- `modules/` owns first-party Solivio modules (compiled packages).
- `sdk/` owns the module SDK (`@solivio/sdk`) — types and helpers for building modules.
- `infra/postgres` owns local database bootstrap files.

## Current Product Shape

Solivio should help a sales team convert raw customer input into a reviewed offer:

1. Customer sends a request.
2. The system extracts requirements.
3. Product search and matching finds candidates.
4. A draft offer is generated.
5. A salesperson reviews, edits, validates, and accepts it.

## Database

Schema is defined in `apps/solivio/src/server/database/schema.ts` using Drizzle ORM. The Drizzle client singleton is exported from `apps/solivio/src/server/database/db.ts` and must only be imported inside server-only code (`apps/solivio/src/server/` or `apps/solivio/src/app/api/`).

Schema is changed through committed Drizzle migrations:

1. Edit `apps/solivio/src/server/database/schema.ts`.
2. Run `yarn db:generate` to create a migration.
3. Review the generated SQL under `apps/solivio/drizzle/`.
4. Run `yarn db:migrate` to apply it locally.

The same migrations run in production when the app container starts.

As the schema grows, split tables into `apps/solivio/src/server/database/schema/` (one file per domain entity) and re-export them from `schema.ts`. The `drizzle.config.ts` path stays unchanged.

## UI

The app uses **shadcn/ui** components with **Tailwind CSS v4**.

- Public copy should come from the README and user-facing guides.
- Install new UI components with `yarn dlx shadcn@latest add <component>` from `apps/solivio`.
- Import components from `@/components/ui/<component>`.
- Use shadcn primitives (`Button`, `Card`, `Badge`, `Textarea`, etc.) for all UI — do not write custom CSS classes.
- Before building any UI element, check if a matching shadcn component exists at https://ui.shadcn.com/docs/components and add it with `yarn dlx shadcn@latest add <component>` if so.
- Style layout and spacing with Tailwind utility classes only; avoid adding rules to `globals.css`.
- Theme tokens live in `packages/theme/src/tokens.css` and are mapped in `apps/solivio/src/app/globals.css` inside `@layer base`. The theme is light-first (Solivio brand: yellow primary `#F6C215`, teal secondary `#134E4A`) with dark mode kept as an optional `.dark` / `data-theme="dark"` variant.
- `globals.css` must stay clean: Tailwind imports, `@theme inline` token mapping, and the `@layer base` theme block only.

## Implementation Rules

- Preserve the internal API/frontend/server separation inside `apps/solivio`.
- Keep setup commands simple and documented.
- Avoid adding required external services to the default demo path.
- Use mocks until the data model and integration boundaries are clear.
- Add database and AI integrations behind server helpers and API routes, not directly in frontend components.
