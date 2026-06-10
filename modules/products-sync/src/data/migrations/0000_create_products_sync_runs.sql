CREATE TABLE "products_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"source" text NOT NULL,
	"imported" integer DEFAULT 0 NOT NULL,
	"stats" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "products_sync_runs_started_at_idx" ON "products_sync_runs" USING btree ("started_at");