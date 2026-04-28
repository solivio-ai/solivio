---
title: Getting started
description: Launch Solivio locally and preview the docs.
---

## Requirements

- Node.js 22.12 or newer.
- npm 10 or newer.
- Docker, only for the optional local database.

## Run the app

```bash
npm install
npm run dev
```

Open the app at `http://localhost:3000`.

The current product path uses mocked request, product, and offer data. Postgres
with pgvector is available for integration work, but it is not required for the
default demo.

## Run the docs

```bash
npm run docs:dev
```

Open the docs site at `http://localhost:4321`.

The docs workspace generates `apps/docs/public/openapi/solivio.json` before
starting the dev server, so the API reference always follows the route
contracts.

## Optional database

```bash
cp .env.example .env
npm run db:up
```

API health falls back to the local Docker database URL in development when
`DATABASE_URL` is not set.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js app on port 3000. |
| `npm run docs:dev` | Start the separate docs site on port 4321. |
| `npm run openapi:generate` | Generate OpenAPI JSON from API route contracts. |
| `npm run typecheck` | Type-check all workspaces. |
| `npm run build` | Build all workspaces, including the docs site. |
| `npm run db:up` | Start local Postgres with pgvector. |
| `npm run db:down` | Stop local infrastructure. |
