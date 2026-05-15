import { sql } from "drizzle-orm";
import { check, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { Offer } from "@solivio/domain";

import { users } from "./auth";
import { customers } from "./customers";
import { requests } from "./requests";

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").references(() => customers.id),
    requestId: uuid("request_id").references(() => requests.id),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull().default("Draft"),
    status: text("status").$type<Offer["status"]>().notNull().default("draft"),
    currency: text("currency").notNull(),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    notes: text("notes").array().notNull().default([]),
    unmatched: text("unmatched").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("offers_discount_percent_range", sql`${table.discountPercent} BETWEEN 0 AND 100`),
    check("offers_discount_amount_nonneg", sql`${table.discountAmount} >= 0`),
    index("offers_customer_id_idx").on(table.customerId),
    index("offers_request_id_idx").on(table.requestId),
    index("offers_status_idx").on(table.status),
  ],
);
