# API Notes

The API routes run inside the single Next.js app at
`http://localhost:3000/api/*` in development. They support the product flow:
catalog and customer data in, AI-assisted draft generation, human review, chat,
PDF output, and operational checks.

Solivio does not maintain a handwritten endpoint list in this file. Most
routes are owned by modules and wired into the app by `yarn generate`, so the
current source of truth is:

- handwritten core routes under `apps/solivio/src/app/api/`, such as
  `/api/health` and Better Auth's catch-all route,
- module route handlers under `modules/<id>/src/api/**/route.ts`,
- module route contracts under `modules/<id>/src/contracts/routes.ts`,
- the merged contract catalog in
  `apps/solivio/src/server/api/contracts/routes.ts`.

The generated app-router stubs live under
`apps/solivio/src/app/api/(gen)/`; do not edit them directly.

## OpenAPI

The publishable API contract is generated as OpenAPI 3.1:

- Contract catalog: `apps/solivio/src/server/api/contracts/routes.ts`
- Core route contracts: `apps/solivio/src/server/api/contracts/system.ts`
- Module route contracts: `modules/<id>/src/contracts/routes.ts`
- Generator: `scripts/generate-openapi.ts`
- Generated schema: `apps/docs/public/openapi/solivio.json`
- Docs reference route: `http://localhost:4321/api`
- Guide route for API contract notes: `http://localhost:4321/dev/api-contract`

Generate the schema with:

```bash
yarn openapi:generate
```

Route handlers should import the same Zod schemas used by their contracts for
request validation and response parsing. Keep new endpoints self-described in
the owning contract file and update the contract at the same time as runtime
behavior changes.

## Current Route Families

The default first-party module set contributes route families for:

- authentication (`/api/auth/*`) and system health (`/api/health`),
- product import, keyword search, and semantic search,
- customer and request import/listing,
- offer creation, editing, validation, revisions, import, quick offers, and
  PDF rendering,
- offer review chat threads, messages, and streaming chat.

Exact paths and schemas are available from the generated OpenAPI file and the
module contract files listed above.

## Module Rules

Module routes are part of the module boundary:

- Route files live in `modules/<id>/src/api/**/route.ts`.
- Contracts live in `modules/<id>/src/contracts/routes.ts`.
- Routes must use infrastructure through `@solivio/sdk/runtime`, not app
  internals.
- Cross-module data should move through services, events, or HTTP boundaries,
  not runtime imports or SQL joins.
- Adding, removing, or renaming a module route requires `yarn generate` so the
  app-router stubs and OpenAPI contract registry are refreshed.
