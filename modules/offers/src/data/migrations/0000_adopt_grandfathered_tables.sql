-- Adopts the pre-existing `offers`, `offer_items`, and `offer_revisions`
-- tables into this module's journal. Everything is guarded to be a no-op on
-- databases where the core baseline already created them; on fresh databases
-- where the baseline ever stops creating them, this builds them from scratch.
CREATE TABLE IF NOT EXISTS "offer_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"quantity" numeric(12, 3) DEFAULT 1 NOT NULL,
	"unit_price_net" numeric(12, 2) DEFAULT 0 NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT 23 NOT NULL,
	"unit_gross_price" numeric(14, 4) DEFAULT 0 NOT NULL,
	"total_net" numeric(14, 4) DEFAULT 0 NOT NULL,
	"total_gross" numeric(14, 4) DEFAULT 0 NOT NULL,
	"request_item" text DEFAULT '' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"match_source" text,
	"match_score" numeric(6, 4),
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offer_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"request_id" uuid,
	"user_id" text,
	"name" text DEFAULT 'Draft' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'PLN' NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"notes" text[] DEFAULT '{}' NOT NULL,
	"unmatched" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_discount_percent_range" CHECK ("offers"."discount_percent" BETWEEN 0 AND 100),
	CONSTRAINT "offers_discount_amount_nonneg" CHECK ("offers"."discount_amount" >= 0)
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "offer_revisions" ADD CONSTRAINT "offer_revisions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_items_offer_id_idx" ON "offer_items" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_revisions_offer_id_idx" ON "offer_revisions" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "offer_revisions_offer_revision_unique" ON "offer_revisions" USING btree ("offer_id","revision_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offers_customer_id_idx" ON "offers" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offers_request_id_idx" ON "offers" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offers_status_idx" ON "offers" USING btree ("status");