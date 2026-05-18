import { index, numeric, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { products } from "./products";
import { timestamps } from "./timestamps";

export const productPrices = pgTable(
  "product_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    net: numeric("net", { precision: 12, scale: 2, mode: "number" }).notNull(),
    gross: numeric("gross", { precision: 14, scale: 4, mode: "number" }).notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(23),
    source: text("source").notNull().default("manual"),
    ...timestamps,
  },
  (table) => [
    index("product_prices_product_id_idx").on(table.productId),
    uniqueIndex("product_prices_product_currency_unique").on(table.productId, table.currency),
  ],
);
