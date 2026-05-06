import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { sql } from "drizzle-orm";

import type { ProductImportRow } from "@solivio/domain";

import { db } from "../database/db";
import { products } from "../database/schema";
import { getDefaultEmbeddingModel } from "./embeddingConfig";
import type { EmbeddingModelId } from "./embeddingModels";

export async function importProductsWithEmbeddings(
  rows: ProductImportRow[],
  model: EmbeddingModelId = getDefaultEmbeddingModel(),
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };

  // Embed SKU + name + description together so SKU lookups hit the same vector space.
  const { embeddings } = await embedMany({
    model: openai.embedding(model),
    values: rows.map((r) => `${r.sku} ${r.name} ${r.description}`),
  });

  await db
    .insert(products)
    .values(
      rows.map((row, i) => ({
        sku: row.sku,
        name: row.name,
        description: row.description,
        manufacturer: row.manufacturer,
        priceNet: row.priceNet,
        priceGross: row.priceGross,
        vatRate: row.vatRate,
        currency: row.currency,
        combinedEmbedding: embeddings[i],
      })),
    )
    .onConflictDoUpdate({
      target: products.sku,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        manufacturer: sql`excluded.manufacturer`,
        priceNet: sql`excluded.price_net`,
        priceGross: sql`excluded.price_gross`,
        vatRate: sql`excluded.vat_rate`,
        currency: sql`excluded.currency`,
        combinedEmbedding: sql`excluded.combined_embedding`,
      },
    });

  return { count: rows.length };
}
