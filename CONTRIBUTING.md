# Contributing

Thanks for helping with Solivio. Keep changes small, easy to run locally, and documented enough that a new contributor can test the result without private services.

## Local Setup

```bash
npm install
npm run dev
```

The frontend and API use mocked data by default. Start Postgres only when working on persistence, imports, search, or embeddings:

```bash
cp .env.example .env
npm run db:up
```

## Development Guidelines

- Keep frontend code in `apps/web`.
- Keep API code in `apps/api`.
- Put shared domain types and demo fixtures in `packages/domain`.
- Prefer a working mock over an unfinished integration.
- Document any new environment variable in the relevant `.env.example`.
- Run `npm run typecheck` before opening a pull request.
