import { defineConfig } from "@solivio/sdk/config";

/**
 * Deployment module configuration — the single source of truth for which
 * modules are enabled. Read by `yarn generate` (never at runtime): changing
 * this file requires regenerating and rebuilding the app.
 *
 * Entries are in-tree directory names (`modules/<id>`) or npm package names
 * for out-of-tree modules; use `[ref, { ...options }]` to pass options.
 */
export default defineConfig({
  modules: [
    "catalog",
    "customers",
    "offers",
    "offer-chat",
    "csv-import",
    "order-history",
    "products-sync",
  ],
  slots: {
    "product.importer": "csv-import/csv-products",
    "customer.importer": "csv-import/csv-customers",
    "offer.importer": "csv-import/csv-orders",
  },
});
