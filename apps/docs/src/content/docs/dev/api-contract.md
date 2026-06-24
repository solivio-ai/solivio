---
title: API contract
description: How Solivio generates OpenAPI from route contracts.
---

Solivio generates OpenAPI from TypeScript route contracts instead of
maintaining a handwritten schema file. Core routes and module routes share the
same contract vocabulary, then `yarn generate` merges enabled module contracts
into the app-level catalog.

## Source of truth

The app-level catalog lives in
`apps/solivio/src/server/api/contracts/routes.ts`. It combines:

- core contracts from `apps/solivio/src/server/api/contracts/system.ts`,
- enabled module contracts from `modules/<id>/src/contracts/routes.ts`,
  emitted through `apps/solivio/src/generated/contracts.ts`.

Each contract declares:

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

The generated API reference covers the contracts exported by the core and every
enabled module. In the default first-party configuration that includes route
families for auth, health, products, customers, requests, offers, offer PDFs,
offer revisions, and offer review chat.

The Better Auth route is documented as a catch-all because the concrete
subroutes are owned by the Better Auth handler rather than by Solivio route
code.

## Validation policy

Route handlers validate request bodies with the Zod schemas exported from the
contract module and return standard `400` error payloads for contract
violations. Add new error responses to the contract at the same time as stricter
runtime handling lands.
