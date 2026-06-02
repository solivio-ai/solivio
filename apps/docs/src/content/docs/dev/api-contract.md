---
title: API contract
description: How Solivio generates OpenAPI from Next.js API routes.
---

Solivio generates OpenAPI from the Next.js API route tree instead of maintaining
a separate route catalog.

## Source of truth

API endpoints live in `apps/solivio/src/app/api/**/route.ts` or `route.tsx`.
Exported route handlers carry `next-openapi-gen` JSDoc metadata for the HTTP
methods they implement. Runtime validation uses the same Zod schemas imported
directly into the handler.

The generator derives:

- HTTP path from the route directory.
- HTTP methods from exported `GET`, `POST`, `PATCH`, and `DELETE` handlers.
- Operation ID, summary, tags, auth, request schemas, and response schemas from
  route-handler JSDoc tags.

Generation fails when exported route methods and generated OpenAPI operations do
not match. If a handler exports `PATCH` but is missing `@openapi` metadata,
generation fails before the docs build can publish a stale contract.

Route-only request and response schemas should live beside the route handler
that validates with them. Shared payload schemas live in concrete modules under
`apps/solivio/src/server/api/schemas/`, and route handlers import those modules
directly so runtime validation and documentation share the same objects.

## Generate the schema

```bash
yarn openapi:generate
```

This writes a Better Auth OpenAPI fragment from
`auth.api.generateOpenAPISchema()`, then runs `next-openapi-gen` with
`openapi-gen.config.ts` and writes:

```text
apps/docs/public/openapi/solivio.json
```

The Starlight OpenAPI plugin consumes that generated file and builds the API
reference pages under `/api/`.

## Documented endpoints

The generated API reference covers every Solivio-owned Next.js route handler
under `apps/solivio/src/app/api`:

- `POST /api/chat`
- `GET /api/customers`
- `POST /api/customers`
- `POST /api/customers/import`
- `GET /api/health`
- `POST /api/offers`
- `GET /api/offers/{offerId}`
- `PATCH /api/offers/{offerId}`
- `DELETE /api/offers/{offerId}`
- `GET /api/offers/{offerId}/chat/threads`
- `POST /api/offers/{offerId}/chat/threads`
- `GET /api/offers/{offerId}/chat/threads/{threadId}/messages`
- `GET /api/offers/{offerId}/pdf`
- `POST /api/offers/{offerId}/products`
- `PATCH /api/offers/{offerId}/products/{offerProductId}`
- `DELETE /api/offers/{offerId}/products/{offerProductId}`
- `GET /api/offers/{offerId}/revisions`
- `POST /api/offers/{offerId}/revisions`
- `GET /api/offers/{offerId}/revisions/{revisionId}`
- `POST /api/offers/{offerId}/revisions/{revisionId}/restore`
- `POST /api/offers/{offerId}/validate`
- `GET /api/offers/pdf`
- `POST /api/offers/pdf`
- `POST /api/offers/quick`
- `POST /api/products/import`
- `POST /api/products/search`
- `POST /api/products/text-search`

Auth endpoints are generated from Better Auth's OpenAPI plugin and merged as
concrete `/api/auth/*` paths instead of being represented by Solivio's
catch-all route file.

## Validation policy

Route handlers validate request and response boundaries with the Zod schemas
referenced by their route JSDoc. Keep route-only schemas in the route file, and
move schemas into `apps/solivio/src/server/api/schemas/` or another `schemaDir`
only when they are shared by multiple handlers or server modules. Add or change
route JSDoc and runtime schemas together when handler behavior changes.
