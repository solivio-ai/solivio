# Contributing

Thanks for helping with Solivio. Keep changes small, easy to run locally, and documented enough that a new contributor can test the result without private services.

## Local Setup

```bash
yarn install
yarn dev
```

The app uses mocked data by default. Start Postgres only when working on persistence, imports, search, or embeddings:

```bash
cp .env.example .env
yarn db:up
```

## Development Guidelines

- Keep frontend feature code in `apps/solivio/src/features`.
- Keep API routes in `apps/solivio/src/app/api`.
- Keep server-only integration code in `apps/solivio/src/server`.
- Put shared domain types and demo fixtures in `packages/domain`.
- Prefer a working mock over an unfinished integration.
- Document any new environment variable in the relevant `.env.example`.
- Run `yarn typecheck` before opening a pull request.
