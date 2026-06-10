---
title: Modules
description: How Solivio modules work and how a deployment chooses which ones run.
---

Solivio is a **modular monolith**: almost every feature — the product catalog,
customers, offers, the review chat, CSV import, external sync — is a module
under `modules/` in the repository. Modules are TypeScript source packages
**compiled into the app at build time**: a generator (`yarn generate`) reads
the deployment manifest `solivio.config.ts`, discovers each enabled module's
pages, API routes, services, events, jobs, translations, and database
migrations by file convention, and wires them into the Next.js app.

The published image ships with the first-party module set enabled:

- `catalog` — products, prices, embeddings, and semantic search.
- `customers` — customers and intake requests.
- `offers` — offer drafts, line items, revisions, PDF rendering, and all
  offer-facing UI including the dashboard.
- `offer-chat` — the offer-review assistant (threads, messages, streaming).
- `csv-import` — CSV importer capabilities for products and customers.
- `products-sync` — scheduled sync of products from an external source.

## Enabling and configuring modules

`solivio.config.ts` at the repository root is the single source of truth:

```ts
import { defineConfig } from "@solivio/sdk/config";

export default defineConfig({
  modules: [
    "catalog",
    "customers",
    "offers",
    "offer-chat",
    "csv-import",
    ["products-sync", { sourceUrl: "https://example.com/products.json", cron: "0 3 * * *" }],
  ],
  slots: {
    "product.importer": "csv-import/csv-products",
    "customer.importer": "csv-import/csv-customers",
  },
});
```

- Entries are in-tree directory names (`modules/<id>`) or npm package names
  for out-of-tree modules.
- The `[name, { …options }]` form passes options, validated against the
  module's schema at generate time.
- `slots` bind exclusive capabilities (e.g. which importer handles the
  `product` target) when more than one module provides them.

Changing the config requires regenerating and rebuilding the image — that is
the deliberate trade of the build-time model: modules get the full surface
(pages, API routes, database tables, translations) instead of being limited to
runtime-loadable plugins.

## Out-of-tree modules

A third-party module is an npm package with the same shape as an in-tree
module: TypeScript source under `src/`, a `defineModule({...})` manifest at
`src/index.ts`, and `"solivio": { "module": true }` in its `package.json`.
Install it, add the package name to `solivio.config.ts`, run `yarn generate`,
and rebuild:

```bash
yarn add @acme/solivio-module-erp-sync
# add "@acme/solivio-module-erp-sync" to solivio.config.ts modules
yarn generate && yarn build
```

## Database migrations

Each module owns its tables and ships its own migration journal
(`modules/<id>/src/data/migrations`). The app image applies the core journal
and every enabled module's journal in order on startup, so enabling a module
with tables needs no manual database work.

## Building a module

Module authoring (anatomy, services, events, jobs, UI, boundaries) is
documented in the repository: `docs/module-system.md` and `docs/codegen.md`,
with `modules/products-sync` as the reference example exercising every module
surface.
