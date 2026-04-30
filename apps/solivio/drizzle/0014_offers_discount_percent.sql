ALTER TABLE "offers" ADD COLUMN "discount_percent" numeric(5, 2) NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_discount_percent_range" CHECK ("discount_percent" BETWEEN 0 AND 100);
