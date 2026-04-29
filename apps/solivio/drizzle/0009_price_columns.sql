-- Products will be re-imported after this migration runs.
-- Truncate to satisfy NOT NULL on new and tightened price columns.
TRUNCATE TABLE offer_products;
--> statement-breakpoint
TRUNCATE TABLE products CASCADE;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price_net" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price_net" SET DATA TYPE numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price_net" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "currency" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "currency" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_gross" numeric(12, 2) NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "vat_rate" numeric(5, 2) NOT NULL;
