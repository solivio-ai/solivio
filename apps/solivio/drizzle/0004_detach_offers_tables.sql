-- Detach module-owned tables from the core journal.
--
-- `offers`, `offer_items`, `offer_revisions` are now owned by the offers
-- module and `offer_chat_threads`, `offer_chat_messages` by the offer-chat
-- module (each with its own migration journal). The tables are NOT dropped;
-- this migration only removes the cross-module/owner FK constraints
-- (cross-module references are id-only by architecture rule) and forgets the
-- tables in the core snapshot. Intra-module FKs (offer_items→offers,
-- offer_revisions→offers, offer_chat_messages→offer_chat_threads) remain.
ALTER TABLE "offers" DROP CONSTRAINT "offers_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "offer_chat_threads" DROP CONSTRAINT "offer_chat_threads_offer_id_offers_id_fk";
