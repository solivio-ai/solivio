import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { eq, inArray, sql } from "drizzle-orm";

import type { ProductImportRow } from "@solivio/domain";

import { db } from "../database/db";
import { productPrices, products } from "../database/schema";
import { getDefaultEmbeddingModel } from "./embeddingConfig";
import type { EmbeddingModelId } from "./embeddingModels";

export async function importProductsWithEmbeddings(
  rows: ProductImportRow[],
  model: EmbeddingModelId = getDefaultEmbeddingModel(),
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };

  const { embeddings } = await embedMany({
    model: openai.embedding(model),
    values: rows.map((r) => `${r.sku} ${r.name} ${r.description}`),
  });

  await db.transaction(async (tx) => {
    await tx
      .insert(products)
      .values(
        rows.map((row, i) => ({
          sku: row.sku,
          name: row.name,
          description: row.description,
          source: "import",
          embedding: embeddings[i],
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

    const skuList = rows.map((r) => r.sku);
    const productRows = await tx
      .select({ id: products.id, sku: products.sku })
      .from(products)
      .where(inArray(products.sku, skuList));

    const idBySku = new Map(productRows.map((r) => [r.sku, r.id]));

    for (const row of rows) {
      const productId = idBySku.get(row.sku);
      if (!productId) continue;

      const existing = await tx
        .select({ id: productPrices.id })
        .from(productPrices)
        .where(
          sql`${productPrices.productId} = ${productId} AND ${productPrices.currency} = ${row.currency}`,
        )
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(productPrices)
          .set({
            net: row.priceNet,
            gross: row.priceGross,
            vatRate: row.vatRate,
            source: "import",
            updatedAt: new Date(),
          })
          .where(eq(productPrices.id, existing[0].id));
      } else {
        await tx.insert(productPrices).values({
          productId,
          currency: row.currency,
          net: row.priceNet,
          gross: row.priceGross,
          vatRate: row.vatRate,
          source: "import",
        });
      }
    }
  });

  return { count: rows.length };
}
