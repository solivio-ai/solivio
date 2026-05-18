import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

import type { ProductInput } from "@solivio/sdk";

import { db } from "../database/db";
import { getDefaultEmbeddingModel } from "./embeddingConfig";
import type { EmbeddingModelId } from "./embeddingModels";
import { upsertPricesBatch } from "./productPriceRepository";
import { findIdsBySku, upsertMany } from "./productRepository";

export async function importProductsWithEmbeddings(
  rows: ProductInput[],
  model: EmbeddingModelId = getDefaultEmbeddingModel(),
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };

  const { embeddings } = await embedMany({
    model: openai.embedding(model),
    values: rows.map((r) => `${r.sku} ${r.name} ${r.description}`),
  });

  await db.transaction(async (tx) => {
    await upsertMany(
      rows.map((row, i) => ({
        sku: row.sku,
        name: row.name,
        description: row.description,
        source: "import",
        embedding: embeddings[i],
      })),
      tx,
    );

    const idBySku = await findIdsBySku(
      rows.map((r) => r.sku),
      tx,
    );

    await upsertPricesBatch(
      rows.flatMap((row) => {
        const productId = idBySku.get(row.sku);
        if (!productId) return [];
        return [
          {
            productId,
            currency: row.currency,
            net: row.priceNet,
            gross: row.priceGross,
            vatRate: row.vatRate,
            source: "import",
          },
        ];
      }),
      tx,
    );
  });

  return { count: rows.length };
}
