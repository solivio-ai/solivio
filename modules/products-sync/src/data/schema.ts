import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const productsSyncRuns = pgTable(
  "products_sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").$type<"running" | "succeeded" | "failed">().notNull().default("running"),
    source: text("source").notNull(),
    imported: integer("imported").notNull().default(0),
    stats: jsonb("stats"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("products_sync_runs_started_at_idx").on(table.startedAt)],
);
