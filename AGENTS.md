# Agent Notes

This repository is intended to stay easy to launch for contributors evaluating the idea.

## Architecture

- `apps/web` owns the user-facing Next.js app.
- `apps/api` owns HTTP API routes and future service integrations.
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

- Preserve the API/frontend split.
- Keep setup commands simple and documented.
- Avoid adding required external services to the default demo path.
- Use mocks until the data model and integration boundaries are clear.
- Add database and AI integrations behind API routes, not directly in the frontend.
