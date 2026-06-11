# products-sync module

The reference "sync/external" module: exercises every module surface —
options schema, own prefixed table + migration, a
cron-schedulable job, an event, an admin API route, an admin page with nav
entry, ACL permissions, and i18n.

- **Table (owned):** `products_sync_runs` (module-prefixed, as all module tables must be).
- **Job:** `products-sync.run` — schedule resolved at boot from the module's
  `cron` option; run manually via `POST /api/products-sync/runs`.
- **Flow:** fetch `sourceUrl` (JSON array) → validate rows → catalog
  `importProducts` → record run row → emit `products-sync.run.completed`.
- Depends on `catalog` (service only; id-only data references).
