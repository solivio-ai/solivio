ALTER TABLE "offer_products" ADD COLUMN "unit_price_net" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "offer_products" ADD COLUMN "currency" text DEFAULT 'PLN';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_net" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "currency" text DEFAULT 'PLN';