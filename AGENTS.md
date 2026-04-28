# Agent Notes

This repository is intended to stay easy to launch for contributors evaluating the idea.

## Development

```bash
yarn install
cp apps/solivio/.env.example apps/solivio/.env.local   # set BETTER_AUTH_SECRET via `openssl rand -base64 32`
yarn setup                                              # docker compose up db, wait for it, push schema
yarn dev                                                # Next.js on :3000
```

`yarn setup` must run on a fresh checkout before `yarn dev`, and again whenever `apps/solivio/src/server/database/schema.ts` changes. `yarn db:push` re-syncs the schema without restarting the database.

## Build

Production images are produced via `docker-compose.build.yml`:

```bash
docker compose -f docker-compose.build.yml build         # builds both images
docker compose -f docker-compose.build.yml push          # pushes to GHCR (requires `docker login ghcr.io`)
```

This produces two images:
- `ghcr.io/solivio-ai/solivio-app` — Next.js standalone runtime.
- `ghcr.io/solivio-ai/solivio-db-push` — runs `drizzle-kit push --force` once per deploy to sync the schema.

CI (`.github/workflows/build-image.yml`) runs the same commands on every push to `main` and tags both images with `:latest` and `:<commit-sha>`.

## Deploy

The demo runs on a single OVH VPS at `demo.solivio.ai` as four containers via `docker-compose.prod.yml`: Traefik (TLS), Postgres+pgvector, the one-shot `db-push`, and the app. Manual deploy:

```bash
ssh ovh
cd /opt/solivio && git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Full deployment guide (host setup, GHCR auth, rollback, troubleshooting): `apps/docs/src/content/docs/guides/deployment.md`.

## Architecture

- `apps/solivio` owns the single Next.js app.
- `apps/solivio/src/app/api` owns HTTP API routes.
- `apps/solivio/src/features` owns user-facing feature UI.
- `apps/solivio/src/server` owns server-only service integrations.
- `packages/domain` owns shared types, workflow constants, and mock fixtures.
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

There is no committed migration history; schema is synced via `drizzle-kit push`:

1. Edit `apps/solivio/src/server/database/schema.ts`.
2. Run `yarn db:push` to apply.

The same command runs in production via the `db-push` container on every deploy.

As the schema grows, split tables into `apps/solivio/src/server/database/schema/` (one file per domain entity) and re-export them from `schema.ts`. The `drizzle.config.ts` path stays unchanged.

## UI

The app uses **shadcn/ui** components with **Tailwind CSS v4**.

- Public copy should come from the README. Brand implementation notes live in `apps/docs/src/content/docs/guides/brand.md`.
- Install new UI components with `yarn dlx shadcn@latest add <component>` from `apps/solivio`.
- Import components from `@/components/ui/<component>`.
- Use shadcn primitives (`Button`, `Card`, `Badge`, `Textarea`, etc.) for all UI — do not write custom CSS classes.
- Before building any UI element, check if a matching shadcn component exists at https://ui.shadcn.com/docs/components and add it with `yarn dlx shadcn@latest add <component>` if so.
- Style layout and spacing with Tailwind utility classes only; avoid adding rules to `globals.css`.
- Theme tokens live in `apps/solivio/src/app/globals.css` inside `@layer base`. The theme is dark-first (Solivio brand: yellow primary `#FACC15`, teal secondary `#134E4A`). Do not add a light-mode variant unless explicitly requested.
- `globals.css` must stay clean: Tailwind imports, `@theme inline` token mapping, and the `@layer base` theme block only.

## Implementation Rules

- Preserve the internal API/frontend/server separation inside `apps/solivio`.
- Keep setup commands simple and documented.
- Avoid adding required external services to the default demo path.
- Use mocks until the data model and integration boundaries are clear.
- Add database and AI integrations behind server helpers and API routes, not directly in frontend components.
