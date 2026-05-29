import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "./timestamps";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    source: text("source").notNull().default("manual"),
    ...timestamps,
  },
  (table) => [uniqueIndex("customers_name_normalized_unique").on(sql`lower(${table.name})`)],
);
