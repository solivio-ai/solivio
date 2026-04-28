import "server-only";

import { ilike, or } from "drizzle-orm";

import { db } from "../database/db";
import { products } from "../database/schema";

export type ProductTextSearchResult = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
};

const DEFAULT_LIMIT = 10;

export async function searchProductsByText(
  query: string,
  limit = DEFAULT_LIMIT,
  offset = 0
): Promise<ProductTextSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = `%${trimmed}%`;

  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      manufacturer: products.manufacturer,
    })
    .from(products)
    .where(
      or(
        ilike(products.name, pattern),
        ilike(products.sku, pattern),
        ilike(products.manufacturer, pattern),
        ilike(products.description, pattern)
      )
    )
    .limit(Math.min(limit, 20))
    .offset(offset);
}
