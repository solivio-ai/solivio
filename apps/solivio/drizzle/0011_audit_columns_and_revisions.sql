ALTER TABLE "offers" ADD COLUMN "created_by" text REFERENCES "user"("id");
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "updated_by" text REFERENCES "user"("id");
--> statement-breakpoint
CREATE TABLE "offer_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text REFERENCES "user"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "offer_revisions_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX "offer_revisions_offer_id_idx" ON "offer_revisions" ("offer_id");
