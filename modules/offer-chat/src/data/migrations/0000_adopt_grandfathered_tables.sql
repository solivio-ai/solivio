-- Adopts the pre-existing `offer_chat_threads` and `offer_chat_messages`
-- tables into this module's journal. Everything is guarded to be a no-op on
-- databases where the core baseline already created them.
CREATE TABLE IF NOT EXISTS "offer_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offer_chat_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"title" text DEFAULT 'New chat' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "offer_chat_messages" ADD CONSTRAINT "offer_chat_messages_thread_id_offer_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."offer_chat_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_chat_messages_thread_id_idx" ON "offer_chat_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_chat_messages_created_at_idx" ON "offer_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_chat_threads_offer_id_idx" ON "offer_chat_threads" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_chat_threads_created_at_idx" ON "offer_chat_threads" USING btree ("created_at");