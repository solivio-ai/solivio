import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { customers } from "./customers";
import { timestamps } from "./timestamps";

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").references(() => customers.id),
    rawText: text("raw_text").notNull(),
    source: text("source").notNull().default("manual"),
    ...timestamps,
  },
  (table) => [index("requests_customer_id_idx").on(table.customerId)],
);
