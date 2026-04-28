// schema.ts only contains Drizzle column definitions — no DB connection, safe to import on the client.
import { getTableColumns } from "drizzle-orm";

import { products } from "@/server/database/schema";

// Derive searchable columns directly from the schema: every `text` column in the products
// table is searchable. Adding a text column to the schema is all that's needed.
export const FIELD_COLUMNS = Object.fromEntries(
  Object.entries(getTableColumns(products)).filter(
    ([, col]) => col.getSQLType() === "text"
  )
);

export type SearchableField = Extract<keyof typeof FIELD_COLUMNS, string>;

export const ALL_SEARCHABLE_FIELDS = Object.keys(FIELD_COLUMNS) as SearchableField[];

/** Convert a camelCase or snake_case field slug to a human-readable label. */
export function fieldLabel(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
