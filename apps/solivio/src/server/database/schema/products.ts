import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { halfvec } from "./halfvec";
import { timestamps } from "./timestamps";

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
