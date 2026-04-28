# Solivio

Solivio is an open-source groundwork for a sales workflow that turns a customer request into a reviewed product offer. The first version keeps the system deliberately small: one Next.js app with clearly separated frontend, API, server, and shared domain layers, plus local Postgres with pgvector ready for product embeddings.

## What This Repo Contains

- `apps/solivio` - the Next.js app on `http://localhost:3000`
- `apps/solivio/src/app/api` - API route handlers
- `apps/solivio/src/features` - frontend product/workflow features
- `apps/solivio/src/server` - server-only helpers and integrations
- `packages/domain` - shared process, product, request, and offer types
- `infra/postgres` - database initialization for pgvector
- `docs` - API, database, and MVP implementation notes

## Quick Start

Requirements:

- Node.js 22 or newer
- npm 10 or newer
- Docker, only if you want the local database

```bash
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`

Start the optional database:

```bash
cp .env.example .env
cp apps/solivio/.env.example apps/solivio/.env
npm run db:up
npm run db:push
```

The database image is pinned to `pgvector/pgvector:0.8.2-pg18-trixie`: pgvector `0.8.2` on PostgreSQL 18, the latest supported PostgreSQL major. If you previously started the database on another PostgreSQL major, recreate the local dev volume or run a proper PostgreSQL major upgrade.

The current app uses mocked domain data, so the database is not required for the first demo.

## Useful Commands

```bash
npm run dev        # run the Next.js app
npm run start      # run the production Next server after a build
npm run typecheck  # type-check all workspaces
npm run build      # build all workspaces
npm run db:up      # start Postgres with pgvector
npm run db:down    # stop local infra
npm run db:push    # apply the current schema directly to the local DB (dev only)
npm run db:generate  # generate a SQL migration file from schema changes
npm run db:migrate   # apply pending migration files to the DB
npm run db:studio    # open Drizzle Studio to browse the database
```

### Database workflow

Schema is defined in `apps/solivio/src/server/database/schema.ts` and managed with [Drizzle ORM](https://orm.drizzle.team). The config lives in `apps/solivio/drizzle.config.ts`.

**Local development** — use `db:push` to instantly apply schema changes without creating migration files:

```bash
npm run db:push
```

**Staging / production** — generate and commit migration files, then apply them:

```bash
npm run db:generate  # creates a new SQL file in apps/solivio/drizzle/
npm run db:migrate   # runs all pending migrations against the DB
```

Migration files are checked into version control so schema history is tracked alongside code.

## MVP Direction

The screenshots describe the first implementation path:

1. Intake a customer request from text or chat.
2. Extract customer needs and constraints.
3. Match the request against imported products.
4. Generate a draft offer with alternatives.
5. Let a salesperson review, edit, diff, validate, and accept the offer.

This scaffold avoids locking in storage, auth, AI provider, or deployment choices too early. Those pieces can be added behind the current API boundaries.
