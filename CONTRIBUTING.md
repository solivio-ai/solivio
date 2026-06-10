# Contributing

Thanks for helping with Solivio. Keep changes small, easy to run locally, and documented enough that a new contributor can test the result without private services.

## Local Setup

```bash
yarn install
cp apps/solivio/.env.example apps/solivio/.env.local
yarn setup     # starts Postgres (Docker), generates module wiring, runs migrations
yarn dev       # generator watcher + Next.js on :3000
yarn seed      # optional: load example products and customers
```

Notes for a friction-free first run:

- `BETTER_AUTH_SECRET` — any non-trivial string works locally; only production needs a strong secret (`openssl rand -base64 32`).
- `OPENAI_API_KEY` — optional. Without it, AI agents are unavailable and products import without embeddings (semantic search disabled, text search still works). Nothing else breaks: the demo path requires no external services.
- Node `>= 24.15.0` and Yarn via corepack (`corepack enable`). Playwright tests need a one-time `yarn playwright install chromium`.

## Where Code Lives

Solivio is a modular monolith: **feature code lives in modules** (`modules/<id>/`), not in the app. A module owns its pages, API routes, services, events, jobs, database tables + migrations, translations, and UI by file convention; `yarn generate` wires everything into the app. The app (`apps/solivio`) keeps only auth, the shell, and runtime plumbing.

Reading path before your first change:

1. `docs/architecture.md` — layering and module boundaries
2. `docs/module-system.md` — how modules work and how to add one
3. `docs/codegen.md` — what `yarn generate` does
4. `docs/contracts.md` — the stable `@solivio/sdk` surface
5. `docs/adr/` — why the load-bearing decisions were made

`AGENTS.md` is the AI-agent-facing version of the same rules; the two must stay aligned.

## Development Guidelines

- New features go in a module — scaffold one with `yarn create-module <id>`, or mirror `modules/products-sync` (the reference example).
- Modules never import other modules or app internals; cross-module calls go through `getService()` and typed events. The boundary checker in `yarn check` enforces this.
- Change database schema only through committed Drizzle migrations in the owning journal (`yarn db:generate <moduleId>`, or `yarn db:generate` for core).
- **Ask first** (open an issue/discussion) before changing the generator (`scripts/generate/`), the public `@solivio/sdk` surface, or the module boundary rules.
- Prefer a working mock over an unfinished integration; never add required external services to the default demo path.
- Document any new environment variable in `apps/solivio/.env.example`.

## Before Opening a Pull Request

```bash
yarn validate   # biome + boundaries + generate --check + typecheck + generator tests
yarn db:check   # migration journals match schemas (needs the database up)
yarn e2e        # Playwright against http://localhost:3000
```

CI runs the same battery (`.github/workflows/quality.yml`).
