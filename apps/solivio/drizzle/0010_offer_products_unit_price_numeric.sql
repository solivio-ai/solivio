ALTER TABLE "offer_products" ALTER COLUMN "unit_price_net" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "offer_products" ALTER COLUMN "unit_price_net" SET DATA TYPE numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "offer_products" ALTER COLUMN "unit_price_net" SET DEFAULT 0;
