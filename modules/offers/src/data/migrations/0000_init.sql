CREATE TABLE "offers_items" (
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
CREATE TABLE "offers_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
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
ALTER TABLE "offers_items" ADD CONSTRAINT "offers_items_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers_revisions" ADD CONSTRAINT "offers_revisions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offers_items_offer_id_idx" ON "offers_items" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "offers_revisions_offer_id_idx" ON "offers_revisions" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_revisions_offer_revision_unique" ON "offers_revisions" USING btree ("offer_id","revision_number");--> statement-breakpoint
CREATE INDEX "offers_customer_id_idx" ON "offers" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "offers_request_id_idx" ON "offers" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");