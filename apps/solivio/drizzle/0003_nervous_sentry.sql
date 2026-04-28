CREATE TABLE "offer_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "name" SET DEFAULT 'Draft';--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "client_request" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "notes" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_products" ADD CONSTRAINT "offer_products_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_products" ADD CONSTRAINT "offer_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;