import { index, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    manufacturer: text("manufacturer").notNull(),
    nameEmbedding: vector("name_embedding", { dimensions: 1536 }).notNull(),
    descriptionEmbedding: vector("description_embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("products_name_emb_idx").using("hnsw", table.nameEmbedding.op("vector_cosine_ops")),
    index("products_desc_emb_idx").using(
      "hnsw",
      table.descriptionEmbedding.op("vector_cosine_ops")
    )
  ]
);
