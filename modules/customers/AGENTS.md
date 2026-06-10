# customers module

Owns customers and customer requests (intake records).

- **Tables (owned):** `customers`, `requests` — defined in `src/data/schema.ts`. No other module may import them; cross-module references are id-only.
- **Public API:** the `customers` service in `src/services.ts` (`getService("customers")`): `findById`, `upsertByName`, `resolveCustomer`, `searchCustomers`, `createRequest`, `findRequestById`. Everything else in `src/server/` is module-private.
- **HTTP routes:** `GET/POST /api/customers`, `POST /api/customers/import` (admin). Contracts in `src/contracts/`.
- **Pages:** `/admin/customers/upload` (admin-gated structurally).
- **Selection errors:** throw `CustomerSelectionError` from `@solivio/domain`; consumers catch by `instanceof`.
- Reach infrastructure only via `@solivio/sdk/runtime` (`getDb`, `getAuth`, `getImporter`, `getLogger`).
- After changing files here: `yarn generate && yarn check && yarn typecheck`.
