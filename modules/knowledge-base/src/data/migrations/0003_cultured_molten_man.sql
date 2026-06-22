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
