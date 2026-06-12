import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@solivio/sdk/runtime";

import { productPrices } from "../data/schema.ts";

type Db = ReturnType<typeof getDb>;
type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type ProductPriceRow = {
  id: string;
  productId: string;
  currency: string;
  net: number;
  gross: number;
  vatRate: number;
  source: string;
};

export async function findActivePrice(
  productId: string,
  currency: string,
  tx?: Tx,
): Promise<ProductPriceRow | null> {
  const conn = tx ?? getDb();
  const [row] = await conn
    .select({
      id: productPrices.id,
      productId: productPrices.productId,
      currency: productPrices.currency,
      net: productPrices.net,
      gross: productPrices.gross,
      vatRate: productPrices.vatRate,
      source: productPrices.source,
    })
    .from(productPrices)
    .where(and(eq(productPrices.productId, productId), eq(productPrices.currency, currency)))
    .limit(1);
  return row ?? null;
}

export async function findActivePricesForProducts(
  productIds: string[],
  currency: string,
  tx?: Tx,
): Promise<Map<string, ProductPriceRow>> {
  if (productIds.length === 0) return new Map();
  const conn = tx ?? getDb();
  const rows = await conn
    .select({
      id: productPrices.id,
      productId: productPrices.productId,
      currency: productPrices.currency,
      net: productPrices.net,
      gross: productPrices.gross,
      vatRate: productPrices.vatRate,
      source: productPrices.source,
    })
    .from(productPrices)
    .where(and(inArray(productPrices.productId, productIds), eq(productPrices.currency, currency)));
  return new Map(rows.map((row) => [row.productId, row]));
}

export type UpsertPriceRow = {
  productId: string;
  currency: string;
  net: number;
  gross: number;
  vatRate: number;
  source?: string;
};

export async function upsertPricesBatch(rows: UpsertPriceRow[], tx?: Tx): Promise<void> {
  if (rows.length === 0) return;
  const conn = tx ?? getDb();

  await conn
    .insert(productPrices)
    .values(
      rows.map((row) => ({
        productId: row.productId,
        currency: row.currency,
        net: row.net,
        gross: row.gross,
        vatRate: row.vatRate,
        source: row.source ?? "manual",
      })),
    )
    .onConflictDoUpdate({
      target: [productPrices.productId, productPrices.currency],
      set: {
        net: sql`excluded.net`,
        gross: sql`excluded.gross`,
        vatRate: sql`excluded.vat_rate`,
        source: sql`excluded.source`,
        updatedAt: new Date(),
      },
    });
}

export async function upsertPrice(
  data: {
    productId: string;
    currency: string;
    net: number;
    gross: number;
    vatRate: number;
    source?: string;
  },
  tx?: Tx,
): Promise<ProductPriceRow> {
  const conn = tx ?? getDb();
  const [row] = await conn
    .insert(productPrices)
    .values({
      productId: data.productId,
      currency: data.currency,
      net: data.net,
      gross: data.gross,
      vatRate: data.vatRate,
      source: data.source ?? "manual",
    })
    .onConflictDoUpdate({
      target: [productPrices.productId, productPrices.currency],
      set: {
        net: sql`excluded.net`,
        gross: sql`excluded.gross`,
        vatRate: sql`excluded.vat_rate`,
        source: sql`excluded.source`,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: productPrices.id,
      productId: productPrices.productId,
      currency: productPrices.currency,
      net: productPrices.net,
      gross: productPrices.gross,
      vatRate: productPrices.vatRate,
      source: productPrices.source,
    });
  return row;
}
