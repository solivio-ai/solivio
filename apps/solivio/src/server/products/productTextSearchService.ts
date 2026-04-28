import "server-only";

import { ilike, or } from "drizzle-orm";

import { db } from "../database/db";
import { products } from "../database/schema";
import {
  ALL_SEARCHABLE_FIELDS,
  FIELD_COLUMNS,
  type SearchableField,
} from "@/features/product-search/searchableFields";

export type ProductTextSearchResult = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
};

type Options = {
  limit?: number;
  offset?: number;
  searchFields?: SearchableField[];
};

export async function searchProductsByText(
  query: string,
  { limit = 20, offset = 0, searchFields }: Options = {}
): Promise<ProductTextSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const fields =
    searchFields && searchFields.length > 0 ? searchFields : ALL_SEARCHABLE_FIELDS;

  const pattern = `%${trimmed}%`;
  const conditions = fields.map((f) => ilike(FIELD_COLUMNS[f], pattern));

  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      manufacturer: products.manufacturer,
    })
    .from(products)
    .where(or(...conditions))
    .limit(Math.min(limit, 20))
    .offset(offset);
}
