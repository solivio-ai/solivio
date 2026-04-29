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

- `GET /api/health`
- `GET /api/products`
- `POST /api/products/search`
- `GET /api/requests`
- `POST /api/requests`
- `GET /api/offers`
- `POST /api/offers`

The app also has internal routes for offer review edits, quick offers, product
import, offer chat, and PDF rendering. Add those to
`apps/solivio/src/server/api/contracts.ts` before treating them as public API
surface.

## Validation policy

Route handlers validate request bodies with the Zod schemas exported from the
contract module and return standard `400` error payloads for contract
violations. Add new error responses to the contract at the same time as stricter
runtime handling lands.
