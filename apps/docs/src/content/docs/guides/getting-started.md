---
title: Getting started
description: Launch Solivio locally from the published Docker images or from source.
---

Solivio can be started in two ways:

- **Docker quick start** for people who want to run the ready app image locally.
- **Source checkout** for contributors who want to change the app or docs.

The published image is:

- `ghcr.io/solivio-ai/solivio-app:latest` — the Next.js runtime that applies committed migrations on startup.

## Requirements

- Docker Engine with Docker Compose v2 for the Docker quick start.
- Node.js 24.15 or newer and Yarn 4.14.1 for source development.
- An OpenAI API key when you want to import catalogs, generate offers, search products semantically, or use the offer assistant.

## Docker quick start

Use this path when you do not need the source code. It starts Postgres with
pgvector and runs the app on port 3000. The app container applies committed
Drizzle migrations before Next.js starts. The first migration creates the
`vector` extension before applying the app schema.

Create a new directory and add this `compose.yml`:

```yaml
services:
  db:
    image: pgvector/pgvector:0.8.2-pg18-trixie
    restart: unless-stopped
    environment:
      POSTGRES_DB: solivio
      POSTGRES_USER: solivio
      POSTGRES_PASSWORD: solivio
    volumes:
      - solivio-db:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U solivio -d solivio"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ghcr.io/solivio-ai/solivio-app:latest
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      DATABASE_URL: postgresql://solivio:solivio@db:5432/solivio
      BETTER_AUTH_URL: ${BETTER_AUTH_URL:-http://localhost:3000}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      OPENAI_MODEL: ${OPENAI_MODEL:-openai/gpt-5.4-mini}
      AUTH_SIGNUP_ENABLED: "true"
      AUTH_CREDENTIALS_ENABLED: "true"
      AUTH_SSO_ENABLED: "false"

volumes:
  solivio-db:
```

Create the local environment file:

```bash
printf "BETTER_AUTH_SECRET=%s\n" "$(openssl rand -base64 32)" > .env
printf "OPENAI_API_KEY=\n" >> .env
```

Set `OPENAI_API_KEY` in `.env` before testing AI-backed features. Then start
the stack:

```bash
docker compose up -d
docker compose ps
```

Open `http://localhost:3000`, choose **Sign up**, and create the first local
user. Keep `AUTH_SIGNUP_ENABLED=true` while evaluating locally. For shared
environments, create the first account and then disable signup.

If port 3000 is already occupied, add these lines to `.env` before starting:

```bash
APP_PORT=3100
BETTER_AUTH_URL=http://localhost:3100
```

Then open `http://localhost:3100` instead.

Useful Docker commands:

```bash
docker compose logs -f app
docker compose restart app
docker compose down
docker compose down -v   # removes local database data
```

## Source checkout

Use this path when you want to develop Solivio.

```bash
yarn install
cp apps/solivio/.env.example apps/solivio/.env.local
```

Before the first `yarn dev`, set `BETTER_AUTH_SECRET` in
`apps/solivio/.env.local`:

```bash
openssl rand -base64 32
```

Paste the generated value into `BETTER_AUTH_SECRET`. Set `OPENAI_API_KEY` in the
same file when you want AI-backed catalog import, offer generation, product
search, or offer chat.

Start the local database and apply the schema:

```bash
yarn setup
```

Then run the app:

```bash
yarn dev
```

Open the app at `http://localhost:3000`, sign up, and start from the dashboard.

## Run the docs

```bash
yarn docs:dev
```

Open the docs site at `http://localhost:4321`.

The docs workspace generates `apps/docs/public/openapi/solivio.json` before
starting the dev server, so the API reference always follows the route
contracts.

## Local database notes

`yarn setup` starts the `db` service from `docker-compose.yml`, waits for it to
accept connections, and applies committed migrations. Run it on a fresh checkout
and again after database schema changes.

The app database URL is read from `apps/solivio/.env.local`. The default value
matches the local Compose database:

```text
postgresql://solivio:solivio@localhost:5432/solivio
```

To stop local infrastructure:

```bash
yarn db:down
```

## Useful commands

| Command | Purpose |
| --- | --- |
| `yarn dev` | Start the Next.js app on port 3000. |
| `yarn docs:dev` | Start the separate docs site on port 4321. |
| `yarn openapi:generate` | Generate OpenAPI JSON from API route contracts. |
| `yarn typecheck` | Type-check all workspaces. |
| `yarn build` | Build all workspaces, including the docs site. |
| `yarn setup` | Start local Postgres, wait for readiness, and apply the schema. |
| `yarn db:up` | Start local Postgres with pgvector. |
| `yarn db:generate` | Generate a Drizzle migration after editing the schema. |
| `yarn db:migrate` | Apply committed Drizzle migrations to the database. |
| `yarn db:down` | Stop local infrastructure. |
