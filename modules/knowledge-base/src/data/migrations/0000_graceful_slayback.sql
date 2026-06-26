CREATE TABLE "knowledge_base_article_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"parent_id" uuid,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'article' NOT NULL,
	"format" text DEFAULT 'plain' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"position_x" real,
	"position_y" real,
	"origin" text,
	"external_id" text,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "knowledge_base_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"type" text DEFAULT 'related' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_id" uuid NOT NULL,
	"model" text NOT NULL,
	"vector" halfvec(3072),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_base_embeddings_chunk_id_unique" UNIQUE("chunk_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"origin" text DEFAULT 'json-import' NOT NULL,
	"spaces_count" integer DEFAULT 0 NOT NULL,
	"articles_upserted" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"origin" text,
	"external_id" text,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_base_article_tags" ADD CONSTRAINT "knowledge_base_article_tags_article_id_knowledge_base_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_articles" ADD CONSTRAINT "knowledge_base_articles_space_id_knowledge_base_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."knowledge_base_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_articles" ADD CONSTRAINT "knowledge_base_articles_parent_id_knowledge_base_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_chunks" ADD CONSTRAINT "knowledge_base_chunks_article_id_knowledge_base_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_connections" ADD CONSTRAINT "knowledge_base_connections_from_id_knowledge_base_articles_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_connections" ADD CONSTRAINT "knowledge_base_connections_to_id_knowledge_base_articles_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."knowledge_base_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_embeddings" ADD CONSTRAINT "knowledge_base_embeddings_chunk_id_knowledge_base_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."knowledge_base_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_base_article_tags_article_id_idx" ON "knowledge_base_article_tags" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_base_article_tags_unique_idx" ON "knowledge_base_article_tags" USING btree ("article_id","tag");--> statement-breakpoint
CREATE INDEX "knowledge_base_articles_space_id_idx" ON "knowledge_base_articles" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_articles_parent_id_idx" ON "knowledge_base_articles" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_chunks_article_id_idx" ON "knowledge_base_chunks" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_connections_from_id_idx" ON "knowledge_base_connections" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_connections_to_id_idx" ON "knowledge_base_connections" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_base_connections_unique_idx" ON "knowledge_base_connections" USING btree ("from_id","to_id","type");--> statement-breakpoint
CREATE INDEX "knowledge_base_embeddings_vector_idx" ON "knowledge_base_embeddings" USING hnsw ("vector" halfvec_cosine_ops);