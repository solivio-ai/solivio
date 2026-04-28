# Solivio

Solivio is an open-source groundwork for a sales workflow that turns a customer request into a reviewed product offer. The first version keeps the system deliberately small: a Next.js frontend, a separate Next.js API surface, shared domain mocks, and local Postgres with pgvector ready for product embeddings.

## What This Repo Contains

- `apps/web` - frontend workbench on `http://localhost:3000`
- `apps/api` - API service on `http://localhost:4000`
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
- API health: `http://localhost:4000/api/health`

Start the optional database:

```bash
cp .env.example .env
npm run db:up
```

The database image is pinned to `pgvector/pgvector:0.8.2-pg18-trixie`: pgvector `0.8.2` on PostgreSQL 18, the latest supported PostgreSQL major. If you previously started the database on another PostgreSQL major, recreate the local dev volume or run a proper PostgreSQL major upgrade.

The current app uses mocked domain data, so the database is not required for the first demo.

## Useful Commands

```bash
npm run dev        # run API and web together
npm run dev:api    # run API only
npm run dev:web    # run frontend only
npm run typecheck  # type-check all workspaces
npm run build      # build all workspaces
npm run db:up      # start Postgres with pgvector
npm run db:down    # stop local infra
```

## MVP Direction

The screenshots describe the first implementation path:

1. Intake a customer request from text or chat.
2. Extract customer needs and constraints.
3. Match the request against imported products.
4. Generate a draft offer with alternatives.
5. Let a salesperson review, edit, diff, validate, and accept the offer.

This scaffold avoids locking in storage, auth, AI provider, or deployment choices too early. Those pieces can be added behind the current API boundaries.
