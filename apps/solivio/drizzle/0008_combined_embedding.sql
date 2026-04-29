-- Products will be re-imported after this migration runs.
-- Truncate to avoid NOT NULL constraint on new column.
TRUNCATE TABLE offer_products;
--> statement-breakpoint
TRUNCATE TABLE products CASCADE;
--> statement-breakpoint
DROP INDEX IF EXISTS "products_name_emb_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "products_desc_emb_idx";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "name_embedding";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "description_embedding";
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "combined_embedding" vector(1536) NOT NULL;
--> statement-breakpoint
CREATE INDEX "products_combined_emb_idx" ON "products" USING hnsw ("combined_embedding" vector_cosine_ops);
