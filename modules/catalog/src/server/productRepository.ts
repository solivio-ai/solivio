import "server-only";

import { inArray, sql } from "drizzle-orm";

import { getDb } from "@solivio/sdk/runtime";

import { products } from "../data/schema.ts";

type Db = ReturnType<typeof getDb>;
type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type UpsertProductRow = {
  sku: string;
  name: string;
  description: string;
  source: string;
  embedding: number[] | null;
};

export type ProductSummaryRow = {
  id: string;
  sku: string | null;
  name: string;
  description: string;
};

export async function upsertMany(rows: UpsertProductRow[], tx?: Tx): Promise<void> {
  if (rows.length === 0) return;
  const conn = tx ?? getDb();

  await conn
    .insert(products)
    .values(
      rows.map((row) => ({
        sku: row.sku,
        name: row.name,
        description: row.description,
        source: row.source,
        embedding: row.embedding,
      })),
    )
    .onConflictDoUpdate({
      target: products.sku,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        source: sql`excluded.source`,
        embedding: sql`excluded.embedding`,
        updatedAt: new Date(),
      },
    });
}

export async function findIdsBySku(skus: string[], tx?: Tx): Promise<Map<string, string>> {
  if (skus.length === 0) return new Map();
  const conn = tx ?? getDb();

  const rows = await conn
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(inArray(products.sku, skus));

  return new Map(rows.map((r) => [r.sku, r.id]));
}

export async function getProductsByIds(ids: string[], tx?: Tx): Promise<ProductSummaryRow[]> {
  if (ids.length === 0) return [];
  const conn = tx ?? getDb();

  return await conn
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
    })
    .from(products)
    .where(inArray(products.id, ids));
}
