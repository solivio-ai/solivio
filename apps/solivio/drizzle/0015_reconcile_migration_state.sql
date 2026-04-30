ALTER TABLE "products" ALTER COLUMN "price_gross" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "vat_rate" SET DEFAULT 0;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"offer_revisions"'::regclass
      AND conname = 'offer_revisions_offer_id_fk'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"offer_revisions"'::regclass
      AND conname = 'offer_revisions_offer_id_offers_id_fk'
  ) THEN
    ALTER TABLE "offer_revisions"
      RENAME CONSTRAINT "offer_revisions_offer_id_fk"
      TO "offer_revisions_offer_id_offers_id_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"offer_revisions"'::regclass
      AND conname = 'offer_revisions_created_by_fkey'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"offer_revisions"'::regclass
      AND conname = 'offer_revisions_created_by_user_id_fk'
  ) THEN
    ALTER TABLE "offer_revisions"
      RENAME CONSTRAINT "offer_revisions_created_by_fkey"
      TO "offer_revisions_created_by_user_id_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"offers"'::regclass
      AND conname = 'offers_created_by_fkey'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"offers"'::regclass
      AND conname = 'offers_created_by_user_id_fk'
  ) THEN
    ALTER TABLE "offers"
      RENAME CONSTRAINT "offers_created_by_fkey"
      TO "offers_created_by_user_id_fk";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"offers"'::regclass
      AND conname = 'offers_updated_by_fkey'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"offers"'::regclass
      AND conname = 'offers_updated_by_user_id_fk'
  ) THEN
    ALTER TABLE "offers"
      RENAME CONSTRAINT "offers_updated_by_fkey"
      TO "offers_updated_by_user_id_fk";
  END IF;
END $$;
