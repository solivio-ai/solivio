import { products } from "../data/schema.ts";

/**
 * Product columns exposed to keyword search. The app's product-search UI keeps
 * its own client-side copy of the field list (it cannot import module code);
 * the API contract is the shared source of truth for accepted values.
 */
export const ALL_SEARCHABLE_FIELDS = ["sku", "name", "description"] as const;

export type SearchableField = (typeof ALL_SEARCHABLE_FIELDS)[number];

export const FIELD_COLUMNS = {
  sku: products.sku,
  name: products.name,
  description: products.description,
};
