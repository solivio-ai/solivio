CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "catalog_product_prices" (
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
CREATE TABLE "catalog_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"embedding" halfvec(3072),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "catalog_product_prices" ADD CONSTRAINT "catalog_product_prices_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_product_prices_product_id_idx" ON "catalog_product_prices" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_prices_product_currency_unique" ON "catalog_product_prices" USING btree ("product_id","currency");--> statement-breakpoint
CREATE INDEX "catalog_products_embedding_idx" ON "catalog_products" USING hnsw ("embedding" halfvec_cosine_ops);
