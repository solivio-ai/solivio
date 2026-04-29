---
title: API contract
description: How Solivio generates OpenAPI from route contracts.
---

Solivio generates OpenAPI from TypeScript route contracts instead of maintaining
a handwritten schema file.

## Source of truth

API contracts live in `apps/solivio/src/server/api/contracts.ts`. Each contract
declares:

- HTTP method and path.
- Operation ID, summary, and tags.
- Zod request body schema, when the endpoint accepts a body.
- Zod response schemas by status code.

The Next.js route handlers import those same schemas for request validation and
response parsing. That keeps implementation behavior and documentation tied to
the same boundary definitions.

## Generate the schema

```bash
yarn openapi:generate
```

This runs `scripts/generate-openapi.ts`, registers the route contracts with
`@asteasolutions/zod-to-openapi`, and writes:

```text
apps/docs/public/openapi/solivio.json
```

The Starlight OpenAPI plugin consumes that generated file and builds the API
reference pages under `/api/`.

## Documented endpoints

The generated API reference covers every Next.js route handler under
`apps/solivio/src/app/api`:

- `GET /api/auth/{authPath}`
- `POST /api/auth/{authPath}`
- `POST /api/chat`
- `GET /api/embedding-models`
- `GET /api/health`
- `GET /api/offers`
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
- `GET /api/offers/pdf`
- `POST /api/offers/pdf`
- `POST /api/offers/quick`
- `GET /api/products`
- `POST /api/products/import`
- `POST /api/products/search`
- `POST /api/products/text-search`
- `GET /api/requests`
- `POST /api/requests`

The Better Auth route is documented as a catch-all because the concrete
subroutes are owned by the Better Auth handler rather than by Solivio route
code.

## Validation policy

Route handlers validate request bodies with the Zod schemas exported from the
contract module and return standard `400` error payloads for contract
violations. Add new error responses to the contract at the same time as stricter
runtime handling lands.
