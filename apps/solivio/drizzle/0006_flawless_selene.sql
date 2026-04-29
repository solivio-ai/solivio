ALTER TABLE "offer_products" ALTER COLUMN "request_item" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_net" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_gross" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "vat_rate" numeric(5, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "currency" text NOT NULL;