import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { customers } from "./customers";

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").references(() => customers.id),
    rawText: text("raw_text").notNull(),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("requests_customer_id_idx").on(table.customerId)],
);
