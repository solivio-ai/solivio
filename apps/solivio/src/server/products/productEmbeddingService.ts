import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { sql } from "drizzle-orm";
import type { ProductImportRow } from "@solivio/domain";
import { db } from "../database/db";
import { products } from "../database/schema";
import { type EmbeddingModelId } from "./embeddingModels";

export async function importProductsWithEmbeddings(
  rows: ProductImportRow[],
  model: EmbeddingModelId = "text-embedding-3-small"
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };

  // Single batch: first N values = names, last N values = descriptions
  const { embeddings } = await embedMany({
    model: openai.embedding(model),
    values: [...rows.map((r) => r.name), ...rows.map((r) => r.description)]
  });

  const nameEmbeddings = embeddings.slice(0, rows.length);
  const descriptionEmbeddings = embeddings.slice(rows.length);

  await db
    .insert(products)
    .values(
      rows.map((row, i) => ({
        sku: row.sku,
        name: row.name,
        description: row.description,
        manufacturer: row.manufacturer,
        nameEmbedding: nameEmbeddings[i],
        descriptionEmbedding: descriptionEmbeddings[i]
      }))
    )
    .onConflictDoUpdate({
      target: products.sku,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        manufacturer: sql`excluded.manufacturer`,
        nameEmbedding: sql`excluded.name_embedding`,
        descriptionEmbedding: sql`excluded.description_embedding`
      }
    });

  return { count: rows.length };
}
