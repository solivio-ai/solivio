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

Reusable payload schemas live in `apps/solivio/src/server/api/schemas/`. Route
handlers import those schemas directly so runtime validation and documentation
share the same objects.

## Generate the schema

```bash
yarn openapi:generate
```

This runs `next-openapi-gen` with `openapi-gen.config.ts` and writes:

```text
apps/docs/public/openapi/solivio.json
```

The Starlight OpenAPI plugin consumes that generated file and builds the API
reference pages under `/api/`.

## Documented endpoints

The generated API reference covers every Next.js route handler under
`apps/solivio/src/app/api`:

- `GET /api/auth/{all}`
- `POST /api/auth/{all}`
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

The Better Auth route is documented as a catch-all because the concrete
subroutes are owned by the Better Auth handler rather than by Solivio route
code.

## Validation policy

Route handlers validate request and response boundaries with the Zod schemas
exported from `apps/solivio/src/server/api/schemas/` or another directory listed
in `schemaDir`. Add or change route JSDoc and runtime schemas together when
handler behavior changes.
