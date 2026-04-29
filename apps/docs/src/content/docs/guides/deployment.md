---
title: Deployment
description: Move Solivio from local Docker to a live single-host environment.
---

The simplest live deployment is a single Linux host running Docker Compose. The
production compose stack starts:

- **traefik** — reverse proxy, terminates TLS via Let's Encrypt.
- **db** — Postgres 18 with pgvector.
- **db-push** — one-shot migration job.
- **app** — the Next.js app, pulled from GHCR.

`db-push` runs before the app starts on every deploy. The service keeps its
original name for compatibility with existing deployments, but the image now
runs committed Drizzle migrations. The first migration creates the `vector`
extension, so no separate database init image or bind mount is required.

## Prerequisites

- A Linux host with Docker Engine and Docker Compose v2 installed.
- A DNS A record for your app host, for example `offers.example.com`, pointing to the host's public IP.
- Inbound TCP 80 and 443 open in the host firewall.
- Access to the public GHCR images `ghcr.io/solivio-ai/solivio-app` and `ghcr.io/solivio-ai/solivio-db-push`.
- An OpenAI API key for AI-backed catalog import, offer generation, semantic search, and offer chat.

## Image build

Two images are built from the same `apps/solivio/Dockerfile`:

- `ghcr.io/solivio-ai/solivio-app` — Next.js standalone runtime (`runner` stage).
- `ghcr.io/solivio-ai/solivio-db-push` — `db-push` stage; ships with `drizzle-kit` and the committed migrations so it can migrate the database before the app starts.

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

## Production settings

The production stack reads secrets and host-specific values from `.env` next to
`docker-compose.prod.yml`.

Important values:

| Variable | Purpose |
| --- | --- |
| `APP_HOST` | Public hostname routed by Traefik. |
| `LETSENCRYPT_EMAIL` | Email used for Let's Encrypt certificate registration. |
| `IMAGE_TAG` | `latest` for fast iteration, or a commit SHA for reproducible deploys. |
| `POSTGRES_PASSWORD` | Database password used by the `db` service. |
| `DATABASE_URL` | Internal app database URL, usually `postgresql://solivio:<password>@db:5432/solivio`. |
| `OPENAI_API_KEY` | Enables AI-backed product import, matching, offer generation, and chat. |
| `OPENAI_MODEL` | Chat and offer-generation model. Defaults to `openai/gpt-5.4-mini`. |
| `BETTER_AUTH_URL` | Public app URL, for example `https://offers.example.com`. |
| `BETTER_AUTH_SECRET` | Auth signing secret. Generate with `openssl rand -base64 32`. |
| `AUTH_SIGNUP_ENABLED` | Keep `true` for first setup; set `false` after creating initial users in shared environments. |

## First-time host setup

```bash
sudo mkdir -p /opt/solivio
sudo chown $USER:$USER /opt/solivio
cd /opt/solivio

git clone --depth 1 https://github.com/solivio-ai/Solivio.git .

cp .env.production.example .env
# Fill in: APP_HOST, LETSENCRYPT_EMAIL, POSTGRES_PASSWORD,
# DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET, and OPENAI_API_KEY.
```

Generate secrets on the host:

```bash
openssl rand -base64 32
```

Paste the value into `BETTER_AUTH_SECRET`.

## Deploy

```bash
cd /opt/solivio
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

`up -d` starts the database, waits for it to become healthy, runs migrations via
`db-push`, then starts Traefik and the app. Traefik requests the TLS certificate from
Let's Encrypt the first time your configured host is reached.

Open `https://<APP_HOST>`, create the first account, then consider setting
`AUTH_SIGNUP_ENABLED=false` and running `docker compose -f docker-compose.prod.yml up -d`
again.

## Verify

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS https://<APP_HOST>/api/health
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

## From local to live

After the app is reachable:

1. Create an admin or evaluation account.
2. Import a small CSV catalog from **Catalog Upload**.
3. Generate a draft from **New Offer** using a real customer request.
4. Review unmatched items and pricing in the offer review screen.
5. Accept the draft and download the generated PDF.
6. Disable public signup if the environment is shared.

## Schema changes

Production uses committed Drizzle migrations. For schema changes:

```bash
yarn db:generate
yarn db:migrate
```

Review generated SQL before merging to `main`; the deployment job applies the
same migrations before starting the app.

## Secrets

`/opt/solivio/.env` holds every secret used by the stack and is not committed. To rotate, edit the file and run `docker compose -f docker-compose.prod.yml up -d`.
