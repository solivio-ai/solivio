CREATE TABLE "offers_unmatched_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"item" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offers_unmatched_items" ADD CONSTRAINT "offers_unmatched_items_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offers_unmatched_items_offer_id_idx" ON "offers_unmatched_items" USING btree ("offer_id");--> statement-breakpoint
INSERT INTO "offers_unmatched_items" ("offer_id", "item", "reason", "position")
SELECT o."id", elem, '', (ord - 1)::integer
FROM "offers" o
CROSS JOIN LATERAL unnest(o."unmatched") WITH ORDINALITY AS t(elem, ord);--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN "unmatched";--> statement-breakpoint
UPDATE "offers_revisions"
SET "snapshot" = jsonb_set(
  "snapshot",
  '{unmatched}',
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('item', elem, 'reason', ''))
      FROM jsonb_array_elements_text("snapshot"->'unmatched') AS elem
    ),
    '[]'::jsonb
  )
)
WHERE jsonb_typeof("snapshot"->'unmatched') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements("snapshot"->'unmatched') AS e
    WHERE jsonb_typeof(e) = 'string'
  );