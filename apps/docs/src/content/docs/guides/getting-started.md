---
title: Getting started
description: Launch Solivio locally and preview the docs.
---

## Requirements

- Node.js 24.15 or newer.
- Yarn 4.14.1 CLI.
- Docker, only for the optional local database.

## Run the app

```bash
yarn install
yarn dev
```

Open the app at `http://localhost:3000`.

The current product path uses mocked request, product, and offer data. Postgres
with pgvector is available for integration work, but it is not required for the
default demo.

## Run the docs

```bash
yarn docs:dev
```

Open the docs site at `http://localhost:4321`.

The docs workspace generates `apps/docs/public/openapi/solivio.json` before
starting the dev server, so the API reference always follows the route
contracts.

## Optional database

```bash
cp .env.example .env
yarn db:up
```

API health falls back to the local Docker database URL in development when
`DATABASE_URL` is not set.

## Useful commands

| Command | Purpose |
| --- | --- |
| `yarn dev` | Start the Next.js app on port 3000. |
| `yarn docs:dev` | Start the separate docs site on port 4321. |
| `yarn openapi:generate` | Generate OpenAPI JSON from API route contracts. |
| `yarn typecheck` | Type-check all workspaces. |
| `yarn build` | Build all workspaces, including the docs site. |
| `yarn db:up` | Start local Postgres with pgvector. |
| `yarn db:down` | Stop local infrastructure. |
