CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"manufacturer" text NOT NULL,
	"name_embedding" vector(1536) NOT NULL,
	"description_embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
CREATE INDEX "products_name_emb_idx" ON "products" USING hnsw ("name_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "products_desc_emb_idx" ON "products" USING hnsw ("description_embedding" vector_cosine_ops);