# API Notes

The API routes run inside the single Next.js app at `http://localhost:3000/api/*`
in development. They support the README flow: Data -> AI -> Structured draft ->
Review -> Send.

The publishable API contract is generated OpenAPI 3.1:

- Route source: `apps/solivio/src/app/api/**/route.ts`
- Route metadata: `next-openapi-gen` JSDoc on exported route handlers
- Reusable schemas: `apps/solivio/src/server/api/schemas/`
- Generator: `openapi-gen.config.ts` with `next-openapi-gen`
- Generated schema: `apps/docs/public/openapi/solivio.json`
- Docs reference route: `http://localhost:4321/api`
- Guide route for API contract notes: `http://localhost:4321/guides/api-contract`

The generator reads the actual Next.js route files and only includes exported
handlers marked with `@openapi`. The config keeps a route coverage guard that
fails generation when exported HTTP methods and generated operations diverge.
Keep endpoint metadata on the exported handler, and import validation schemas
directly from the reusable schema barrel.

## Endpoints

The generated schema follows the current route tree. Run
`yarn openapi:generate` after adding, removing, or changing an API route.

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
