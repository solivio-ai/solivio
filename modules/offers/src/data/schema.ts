import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { Offer, OfferKbArticle, OfferRevisionSnapshot } from "@solivio/domain";
import { timestamps } from "@solivio/sdk/db";

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Cross-module/owner references are id-only (no FK constraint): customers
    // and requests belong to the customers module; users belong to core auth.
    customerId: uuid("customer_id"),
    requestId: uuid("request_id"),
    userId: text("user_id"),
    name: text("name").notNull().default("Draft"),
    status: text("status").$type<Offer["status"]>().notNull().default("draft"),
    currency: text("currency").notNull().default("PLN"),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    notes: text("notes").array().notNull().default([]),
    kbArticles: jsonb("kb_articles").$type<OfferKbArticle[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [
    check("offers_discount_percent_range", sql`${table.discountPercent} BETWEEN 0 AND 100`),
    check("offers_discount_amount_nonneg", sql`${table.discountAmount} >= 0`),
    index("offers_customer_id_idx").on(table.customerId),
    index("offers_request_id_idx").on(table.requestId),
    index("offers_status_idx").on(table.status),
  ],
);

export const offerItems = pgTable(
  "offers_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    // Cross-module references are id-only (no FK constraint): the catalog
    // module owns the products table and its own migration journal.
    productId: uuid("product_id"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull().default(1),
    unitPriceNet: numeric("unit_price_net", { precision: 12, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(23),
    unitGrossPrice: numeric("unit_gross_price", { precision: 14, scale: 4, mode: "number" })
      .notNull()
      .default(0),
    totalNet: numeric("total_net", { precision: 14, scale: 4, mode: "number" })
      .notNull()
      .default(0),
    totalGross: numeric("total_gross", { precision: 14, scale: 4, mode: "number" })
      .notNull()
      .default(0),
    requestItem: text("request_item").notNull().default(""),
    rationale: text("rationale").notNull().default(""),
    matchSource: text("match_source"),
    matchScore: numeric("match_score", { precision: 6, scale: 4, mode: "number" }),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("offers_items_offer_id_idx").on(table.offerId)],
);

export const offerUnmatchedItems = pgTable(
  "offers_unmatched_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    item: text("item").notNull(),
    reason: text("reason").notNull().default(""),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("offers_unmatched_items_offer_id_idx").on(table.offerId)],
);

export const offerRevisions = pgTable(
  "offers_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    snapshot: jsonb("snapshot").$type<OfferRevisionSnapshot>().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("offers_revisions_offer_id_idx").on(table.offerId),
    uniqueIndex("offers_revisions_offer_revision_unique").on(table.offerId, table.revisionNumber),
  ],
);
