# API Notes

The API routes run inside the single Next.js app at `http://localhost:3000/api/*` in development.

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

The current implementation returns a mocked accepted request object.

### `GET /api/offers`

Returns a mocked draft offer.

### `POST /api/offers`

Returns a newly timestamped mocked draft offer. This is the future boundary for AI-assisted offer generation.
