# Agent Notes

This repository is intended to stay easy to launch for contributors evaluating the idea.

## Architecture

- `apps/solivio` owns the single Next.js app.
- `apps/solivio/src/app/api` owns HTTP API routes.
- `apps/solivio/src/features` owns user-facing feature UI.
- `apps/solivio/src/server` owns server-only service integrations.
- `packages/domain` owns shared types, workflow constants, and mock fixtures.
- `infra/postgres` owns local database bootstrap files.

## Current Product Shape

Solivio should help a sales team convert raw customer input into a reviewed offer:

1. Customer sends a request.
2. The system extracts requirements.
3. Product search and matching finds candidates.
4. A draft offer is generated.
5. A salesperson reviews, edits, validates, and accepts it.

## Implementation Rules

- Preserve the internal API/frontend/server separation inside `apps/solivio`.
- Keep setup commands simple and documented.
- Avoid adding required external services to the default demo path.
- Use mocks until the data model and integration boundaries are clear.
- Add database and AI integrations behind server helpers and API routes, not directly in frontend components.
