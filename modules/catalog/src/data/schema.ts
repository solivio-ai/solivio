import { index, numeric, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "@solivio/sdk/db";

import { halfvec } from "./halfvec.ts";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    source: text("source").notNull().default("manual"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    embedding: halfvec("embedding", { dimensions: 3072 }),
    ...timestamps,
  },
  (table) => [
    index("products_embedding_idx").using("hnsw", table.embedding.op("halfvec_cosine_ops")),
  ],
);

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
