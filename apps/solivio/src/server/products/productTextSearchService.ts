import "server-only";

import { count, ilike, or } from "drizzle-orm";

import type { SearchableField } from "@/features/product-search/searchableFields";
import { ALL_SEARCHABLE_FIELDS } from "@/features/product-search/searchableFields";

import { db } from "../database/db";
import { products } from "../database/schema";
import { FIELD_COLUMNS } from "./searchableProductColumns";

export type ProductTextSearchResult = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
};

export type ProductTextSearchPage = {
  products: ProductTextSearchResult[];
  totalCount: number;
};

type Options = {
  limit?: number;
  offset?: number;
  searchFields?: SearchableField[];
};

export async function searchProductsByText(
  query: string,
  { limit = 20, offset = 0, searchFields }: Options = {},
): Promise<ProductTextSearchPage> {
  const trimmed = query.trim();
  if (!trimmed) return { products: [], totalCount: 0 };

  const fields = searchFields && searchFields.length > 0 ? searchFields : ALL_SEARCHABLE_FIELDS;

  const pattern = `%${trimmed}%`;
  const conditions = fields.map((f) => ilike(FIELD_COLUMNS[f], pattern));
  const where = or(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        manufacturer: products.manufacturer,
      })
      .from(products)
      .where(where)
      .limit(Math.min(limit, 20))
      .offset(offset),
    db.select({ value: count() }).from(products).where(where),
  ]);

  return {
    products: rows,
    totalCount: totalRows[0]?.value ?? 0,
  };
}
