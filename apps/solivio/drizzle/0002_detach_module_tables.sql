-- Detach module-owned tables from the core journal.
--
-- `customers` and `requests` are now owned by the customers module
-- (modules/customers/src/data/migrations) — they are NOT dropped; this
-- migration only removes the cross-module FK constraints (cross-module
-- references are id-only by architecture rule) and forgets the tables
-- in the core snapshot.
ALTER TABLE "offers" DROP CONSTRAINT "offers_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "offers" DROP CONSTRAINT "offers_request_id_requests_id_fk";
