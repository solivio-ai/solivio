-- Adopts the pre-existing `products` and `product_prices` tables into this
-- module's journal. On already-deployed databases the core baseline created
-- them, so everything here is guarded to be a no-op; on databases where the
-- baseline ever stops creating them, this migration builds them from scratch.
-- The `halfvec` column and HNSW index require the pgvector extension, which
-- the database bootstrap provides (infra/postgres).
CREATE TABLE IF NOT EXISTS "product_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"net" numeric(12, 2) NOT NULL,
	"gross" numeric(14, 4) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT 23 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"embedding" halfvec(3072),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_prices_product_id_idx" ON "product_prices" USING btree ("product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_prices_product_currency_unique" ON "product_prices" USING btree ("product_id","currency");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_embedding_idx" ON "products" USING hnsw ("embedding" halfvec_cosine_ops);
