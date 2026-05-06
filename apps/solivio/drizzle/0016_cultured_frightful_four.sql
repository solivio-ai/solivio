DROP INDEX "products_combined_emb_idx";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "combined_embedding" SET DATA TYPE halfvec(3072);--> statement-breakpoint
CREATE INDEX "products_combined_emb_idx" ON "products" USING hnsw ("combined_embedding" halfvec_cosine_ops);