---
title: Deployment
description: Deploy the Solivio demo to a single-host server with Docker Compose.
---

The Solivio demo runs on a single VPS as three containers behind Traefik:

- **traefik** — reverse proxy, terminates TLS via Let's Encrypt.
- **db** — Postgres 18 with pgvector.
- **app** — the Next.js app, pulled from GHCR.

A one-shot `db-push` container syncs `schema.ts` to the database before the app starts on every deploy.

## Prerequisites

- A Linux host with Docker Engine and Docker Compose v2 installed.
- A DNS A record `demo.solivio.ai` pointing to the host's public IP.
- Inbound TCP 80 and 443 open in the host firewall.
- Read access to the GHCR images `ghcr.io/solivioai/solivio-app` and `ghcr.io/solivioai/solivio-db-push` (a GitHub PAT with `read:packages` if the repo is private).

## Image build

Two images are built from the same `apps/solivio/Dockerfile`:

- `ghcr.io/solivioai/solivio-app` — Next.js standalone runtime (`runner` stage).
- `ghcr.io/solivioai/solivio-db-push` — `db-push` stage; ships with `drizzle-kit` and `schema.ts` so it can sync the schema into the database.

Both are declared in `docker-compose.build.yml`. CI (`.github/workflows/build-image.yml`) runs on every push to `main`:

```bash
IMAGE_TAG=$GITHUB_SHA docker compose -f docker-compose.build.yml build --pull
docker compose -f docker-compose.build.yml push
```

Each push tags `:latest` and `:<commit-sha>` for both images. Pin `IMAGE_TAG=<sha>` in `/opt/solivio/.env` for reproducible deploys; leave on `latest` to always run the newest build.

To build locally:

```bash
docker compose -f docker-compose.build.yml build
```

## First-time host setup

```bash
sudo mkdir -p /opt/solivio
sudo chown $USER:$USER /opt/solivio
cd /opt/solivio

git clone --depth 1 https://github.com/SolivioAI/Solivio.git .

cp .env.production.example .env
# Fill in: POSTGRES_PASSWORD, DATABASE_URL, BETTER_AUTH_SECRET, OPENAI_API_KEY, LETSENCRYPT_EMAIL.
```

If the GHCR images are private, log in once:

```bash
echo "$GITHUB_PAT" | docker login ghcr.io -u <github-username> --password-stdin
```

## Deploy

```bash
cd /opt/solivio
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

`up -d` starts the database, waits for it to become healthy, runs `db-push`, then starts Traefik and the app. Traefik requests the TLS cert from Let's Encrypt the first time `demo.solivio.ai` is hit.

## Verify

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS https://demo.solivio.ai/api/health
```

`db-push` should be `Exited (0)`. All other services `running`.

## Rolling back

Pin `IMAGE_TAG` to the last known-good SHA in `/opt/solivio/.env`, then:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Common operations

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f traefik
docker compose -f docker-compose.prod.yml exec db psql -U solivio -d solivio
docker compose -f docker-compose.prod.yml run --rm db-push
```

## Schema changes

`db-push` runs `drizzle-kit push --force` on every deploy. `--force` auto-approves data-loss statements; review schema diffs in PR before merging to `main`.

## Secrets

`/opt/solivio/.env` holds every secret used by the stack and is not committed. To rotate, edit the file and run `docker compose -f docker-compose.prod.yml up -d`.
