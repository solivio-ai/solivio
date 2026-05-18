import { pgTable, text, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "./timestamps";

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  source: text("source").notNull().default("manual"),
  ...timestamps,
});
