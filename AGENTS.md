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

## Database

Schema is defined in `apps/solivio/src/server/database/schema.ts` using Drizzle ORM. The Drizzle client singleton is exported from `apps/solivio/src/server/database/db.ts` and must only be imported inside server-only code (`apps/solivio/src/server/` or `apps/solivio/src/app/api/`).

Migration files are generated into `apps/solivio/drizzle/` and committed to version control.

When adding or changing tables:
1. Edit `apps/solivio/src/server/database/schema.ts`.
2. During local development, run `yarn db:push` to apply changes instantly.
3. Before committing schema changes, run `yarn db:generate` to produce a migration file and commit it together with the schema change.
4. Use `yarn db:migrate` to apply migrations in non-local environments.

As the schema grows, split tables into `apps/solivio/src/server/database/schema/` (one file per domain entity) and re-export them from `schema.ts`. The `drizzle.config.ts` path stays unchanged.

## UI

The app uses **shadcn/ui** components with **Tailwind CSS v4**.

- Public copy should come from the README. Brand implementation notes live in `apps/docs/src/content/docs/guides/brand.md`.
- Install new UI components with `yarn dlx shadcn@latest add <component>` from `apps/solivio`.
- Import components from `@/components/ui/<component>`.
- Use shadcn primitives (`Button`, `Card`, `Badge`, `Textarea`, etc.) for all UI — do not write custom CSS classes.
- Before building any UI element, check if a matching shadcn component exists at https://ui.shadcn.com/docs/components and add it with `yarn dlx shadcn@latest add <component>` if so.
- Style layout and spacing with Tailwind utility classes only; avoid adding rules to `globals.css`.
- Theme tokens live in `apps/solivio/src/app/globals.css` inside `@layer base`. The theme is dark-first (Solivio brand: yellow primary `#FACC15`, teal secondary `#134E4A`). Do not add a light-mode variant unless explicitly requested.
- `globals.css` must stay clean: Tailwind imports, `@theme inline` token mapping, and the `@layer base` theme block only.

## Implementation Rules

- Preserve the internal API/frontend/server separation inside `apps/solivio`.
- Keep setup commands simple and documented.
- Avoid adding required external services to the default demo path.
- Use mocks until the data model and integration boundaries are clear.
- Add database and AI integrations behind server helpers and API routes, not directly in frontend components.
