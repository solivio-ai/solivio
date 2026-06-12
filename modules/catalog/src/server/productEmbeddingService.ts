import "server-only";

import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

import type { ProductInput } from "@solivio/sdk";
import { getAi, getDb, getLogger } from "@solivio/sdk/runtime";

import { upsertPricesBatch } from "./productPriceRepository.ts";
import { findIdsBySku, upsertMany } from "./productRepository.ts";

export async function importProductsWithEmbeddings(
  rows: ProductInput[],
  model?: string,
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };

  // Semantic search is an enhancement, not a requirement: without an OpenAI
  // key (e.g. the default demo path or CI) products import with null
  // embeddings and text search still works.
  let embeddings: Array<number[] | null>;
  if (process.env.OPENAI_API_KEY?.trim()) {
    const result = await embedMany({
      model: openai.embedding(model ?? getAi().embeddingModelId()),
      values: rows.map((r) => `${r.sku} ${r.name} ${r.description}`),
    });
    embeddings = result.embeddings;
  } else {
    getLogger("catalog").warn(
      "OPENAI_API_KEY is not set — importing products without embeddings (semantic search disabled for these rows)",
    );
    embeddings = rows.map(() => null);
  }

  await getDb().transaction(async (tx) => {
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
