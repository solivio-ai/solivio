import "server-only";

import { inArray, sql } from "drizzle-orm";

import { db } from "../database/db";
import { products } from "../database/schema";

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export type UpsertProductRow = {
  sku: string;
  name: string;
  description: string;
  source: string;
  embedding: number[];
};

export async function upsertMany(rows: UpsertProductRow[], tx: Tx = db): Promise<void> {
  if (rows.length === 0) return;

  await tx
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

export async function findIdsBySku(skus: string[], tx: Tx = db): Promise<Map<string, string>> {
  if (skus.length === 0) return new Map();

  const rows = await tx
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(inArray(products.sku, skus));

  return new Map(rows.map((r) => [r.sku, r.id]));
}
