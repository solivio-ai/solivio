import { index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { offers } from "./offers";
import { products } from "./products";

export const offerItems = pgTable(
  "offer_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("offer_items_offer_id_idx").on(table.offerId)],
);
