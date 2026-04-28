# Database

The local database is optional for the first demo path. It is provided for product import, embedding, search, and persistence work.

## Image

`docker-compose.yml` pins:

```text
pgvector/pgvector:0.8.2-pg18-trixie
```

This keeps the latest pgvector release available on PostgreSQL 18, the latest supported PostgreSQL major. A major PostgreSQL upgrade requires a dump/restore or `pg_upgrade`, so an existing local development volume from PostgreSQL 16 or 17 should be recreated unless you intentionally need to preserve its data.

PostgreSQL 18 stores data below `/var/lib/postgresql/<major>/docker`, so the compose volume is mounted at `/var/lib/postgresql` rather than `/var/lib/postgresql/data`.

## Start

```bash
cp .env.example .env
npm run db:up
```

## Verify pgvector

```bash
docker compose exec -T db psql -U solivio -d solivio -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extversion FROM pg_extension WHERE extname = 'vector';"
```

Expected extension version:

```text
0.8.2
```

The API health endpoint also reports the live PostgreSQL and pgvector versions when the database is running:

```bash
curl http://localhost:3000/api/health
```

For a disposable local database created with an older PostgreSQL major:

```bash
npm run db:down
docker volume rm solivio_solivio-db
npm run db:up
```
