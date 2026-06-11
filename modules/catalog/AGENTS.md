# catalog module

Owns the product catalog: products and their prices.

- **Tables (owned):** `catalog_products`, `catalog_product_prices` — defined in `src/data/schema.ts` (with the `halfvec` pgvector helper in `src/data/halfvec.ts`). No other module may import them; cross-module references are id-only (e.g. `offers_items.product_id` has no FK).
- **Public API:** the `catalog` service in `src/services.ts` (`getService("catalog")`): `searchByPrompt`, `searchBatch`, `lookupBySkus`, `importProducts`, `getProductsByIds`, `getActivePricesForProducts`. Everything else in `src/server/` is module-private.
- **HTTP routes:** `POST /api/products/search`, `POST /api/products/text-search`, `POST /api/products/import` (admin). Contracts in `src/contracts/`.
- **Pages:** `/admin/products/upload` (admin-gated structurally).
- **AI:** embeddings use the deployment model via `getAi().embeddingModelId()`; the semantic-search agent (`src/server/productSearchAgent.ts`) honors `OPENAI_MODEL_PRODUCT_SEARCH` and the `VOLTAGENT_*` tracing env vars.
- Reach infrastructure only via `@solivio/sdk/runtime` (`getDb`, `getAi`, `getAuth`, `getImporter`, `getLogger`).
- After changing files here: `yarn generate && yarn check && yarn typecheck`.
