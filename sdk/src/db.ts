import { timestamp } from "drizzle-orm/pg-core";

/**
 * Shared Drizzle column helpers for module-owned tables
 * (`modules/<id>/src/data/schema.ts`).
 */

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
