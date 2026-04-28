# API Notes

The API routes run inside the single Next.js app at `http://localhost:3000/api/*` in development. They support the README flow: Data → AI → Structured draft → Review → Send.

The publishable API contract is generated OpenAPI 3.1:

- Contract source: `apps/solivio/src/server/api/contracts.ts`
- Generator: `scripts/generate-openapi.ts`
- Generated schema: `apps/docs/public/openapi/solivio.json`
- Docs reference route: `http://localhost:4321/api`
- Guide route for API contract notes: `http://localhost:4321/guides/api-contract`

Route handlers import the same Zod schemas used by the generator. Keep new
endpoints self-described in the contract file and validate request/response
boundaries through those schemas.

## Endpoints

### `GET /api/health`

Returns service status and database reachability. In development, the API falls back to the local Docker Compose database URL when `DATABASE_URL` is not set.

### `GET /api/products`

Returns mocked product candidates from `packages/domain`.

Future responsibilities:

- product import
- product CRUD
- availability state
- embeddings and semantic search

### `GET /api/requests`

Returns a mocked customer request.

### `POST /api/requests`

Accepts a draft customer request body:

```json
{
  "customerName": "Example customer",
  "customerText": "Need photovoltaic panels and storage for a small office."
}
```

The current implementation validates the body with the route contract and returns
a mocked accepted request object.

### `GET /api/offers`

Returns a mocked draft offer.

### `POST /api/offers`

Returns a newly timestamped mocked draft offer. This is the future boundary for structured offer drafts based on your data.
