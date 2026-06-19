CREATE TABLE "knowledge_base_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"heading_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_base_embeddings" DROP CONSTRAINT "knowledge_base_embeddings_article_id_unique";--> statement-breakpoint
ALTER TABLE "knowledge_base_embeddings" DROP CONSTRAINT "knowledge_base_embeddings_article_id_knowledge_base_articles_id_fk";
--> statement-breakpoint
ALTER TABLE "knowledge_base_articles" ADD COLUMN "format" text DEFAULT 'markdown' NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base_embeddings" ADD COLUMN "chunk_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base_chunks" ADD CONSTRAINT "knowledge_base_chunks_article_id_knowledge_base_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_base_chunks_article_id_idx" ON "knowledge_base_chunks" USING btree ("article_id");--> statement-breakpoint
ALTER TABLE "knowledge_base_embeddings" ADD CONSTRAINT "knowledge_base_embeddings_chunk_id_knowledge_base_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."knowledge_base_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_embeddings" DROP COLUMN "article_id";--> statement-breakpoint
ALTER TABLE "knowledge_base_embeddings" ADD CONSTRAINT "knowledge_base_embeddings_chunk_id_unique" UNIQUE("chunk_id");