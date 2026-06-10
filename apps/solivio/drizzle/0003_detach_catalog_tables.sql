-- Detach module-owned tables from the core journal.
--
-- `products` and `product_prices` are now owned by the catalog module
-- (modules/catalog/src/data/migrations) — they are NOT dropped; this
-- migration only removes the cross-module FK constraint (cross-module
-- references are id-only by architecture rule) and forgets the tables
-- in the core snapshot.
ALTER TABLE "offer_items" DROP CONSTRAINT "offer_items_product_id_products_id_fk";
