import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "../database/db";
import { productPrices } from "../database/schema";

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

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
  tx: Tx = db,
): Promise<ProductPriceRow | null> {
  const [row] = await tx
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
  tx: Tx = db,
): Promise<Map<string, ProductPriceRow>> {
  if (productIds.length === 0) return new Map();
  const rows = await tx
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
    .where(
      and(inArray(productPrices.productId, productIds), eq(productPrices.currency, currency)),
    );
  return new Map(rows.map((row) => [row.productId, row]));
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
  tx: Tx = db,
): Promise<ProductPriceRow> {
  const existing = await findActivePrice(data.productId, data.currency, tx);
  if (existing) {
    const [updated] = await tx
      .update(productPrices)
      .set({
        net: data.net,
        gross: data.gross,
        vatRate: data.vatRate,
        source: data.source ?? existing.source,
        updatedAt: new Date(),
      })
      .where(eq(productPrices.id, existing.id))
      .returning({
        id: productPrices.id,
        productId: productPrices.productId,
        currency: productPrices.currency,
        net: productPrices.net,
        gross: productPrices.gross,
        vatRate: productPrices.vatRate,
        source: productPrices.source,
      });
    return updated;
  }

  const [inserted] = await tx
    .insert(productPrices)
    .values({
      productId: data.productId,
      currency: data.currency,
      net: data.net,
      gross: data.gross,
      vatRate: data.vatRate,
      source: data.source ?? "manual",
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
  return inserted;
}
