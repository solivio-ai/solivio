// Imported dynamically by run.ts AFTER DATABASE_URL has been pointed at the
// benchmark database and the module runtime has been booted — syncCatalog
// reaches the catalog through the same runtime accessors modules use.

import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { sql } from "drizzle-orm";
import { Client, escapeIdentifier } from "pg";

import type { OfferImportInput, ProductInput } from "@solivio/sdk";
import { getAi, getDb, getService } from "@solivio/sdk/runtime";

import { getChunker } from "../../../../modules/knowledge-base/src/lib/chunking/index.ts";
import type { ImportPayload } from "../../../../modules/knowledge-base/src/lib/importSchema.ts";
import { flattenPayload } from "../../../../modules/knowledge-base/src/lib/importSchema.ts";
import {
  findArticlesBySpace,
  findChunksByArticle,
  replaceChunks,
  upsertEmbeddings,
  upsertFromImport,
} from "../../../../modules/knowledge-base/src/server/knowledgeBaseRepository.ts";
import { importOffers } from "../../../../modules/offers/src/server/offerImportService.ts";

/** Creates the benchmark database if missing; migrations create extensions and schema. */
export async function ensureBenchmarkDatabase(adminUrl: string, benchmarkUrl: string) {
  // Decode %xx like the pg connection string parser does, so the name we
  // create matches the one the benchmark connection will open.
  const dbName = decodeURIComponent(new URL(benchmarkUrl).pathname.slice(1));
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) {
      // CREATE DATABASE cannot be parameterized — escape the identifier.
      await admin.query(`CREATE DATABASE ${escapeIdentifier(dbName)}`);
    }
  } finally {
    await admin.end();
  }
}

/**
 * Makes the products table exactly mirror the benchmark catalog: removes
 * everything else, then imports only new or changed rows through the catalog
 * service, so embeddings are produced by the same code path as production
 * imports. The table name is the catalog module's — raw SQL here keeps the
 * benchmark off the module's internal schema objects.
 */
export async function syncCatalog(catalog: ProductInput[]): Promise<{ embedded: number }> {
  const catalogSkus = catalog.map((p) => p.sku);
  const db = getDb();

  // drizzle's sql template expands a JS array into a parenthesized
  // parameter list, so IN/NOT IN is the natural operator here.
  await db.execute(sql`DELETE FROM catalog_products WHERE sku NOT IN ${catalogSkus}`);

  const existing = await db.execute(
    sql`SELECT sku, name, description, (embedding IS NULL) AS missing_embedding
        FROM catalog_products WHERE sku IN ${catalogSkus}`,
  );
  type ExistingRow = { sku: string; name: string; description: string; missing_embedding: boolean };
  const existingBySku = new Map((existing.rows as Array<ExistingRow>).map((p) => [p.sku, p]));

  const stale = catalog.filter((p) => {
    const current = existingBySku.get(p.sku);
    return (
      !current ||
      current.missing_embedding ||
      current.name !== p.name ||
      current.description !== p.description
    );
  });
  if (stale.length === 0) return { embedded: 0 };

  // catalog.csv carries prices already; importProducts produces embeddings the
  // same way production imports do.
  await getService("catalog").importProducts(stale);

  return { embedded: stale.length };
}

/**
 * Seeds historical orders as `imported` offers through the same code path the
 * app's order-import route uses (customers are upserted by name, product ids
 * resolved by SKU). The order-history agent tool recalls these via the offers
 * service. importOffers always inserts, so the dedicated benchmark DB's
 * fixture-sourced imported offers are cleared first to keep re-seeding
 * idempotent (items cascade on offer delete).
 */
export async function syncOrders(orders: OfferImportInput[]): Promise<{ created: number }> {
  await getDb().execute(sql`DELETE FROM offers WHERE status = 'imported'`);
  const { count } = await importOffers(orders);
  return { created: count };
}

/**
 * Seeds the benchmark knowledge base, then chunks and embeds it inline. The
 * app does chunking/embedding via persistent job subscribers, but the benchmark
 * runtime boots without the job engine, so we mirror the job sequence
 * (upsertFromImport → getChunker → replaceChunks → embed) synchronously.
 * upsertFromImport upserts by externalId+origin, so re-seeding is idempotent;
 * the KB is small enough to re-chunk/re-embed every run.
 */
export async function syncKB(
  payload: ImportPayload,
): Promise<{ spaces: number; articles: number; embeddedChunks: number }> {
  const result = await upsertFromImport(flattenPayload(payload));

  const hasKey = !!process.env.OPENAI_API_KEY?.trim();
  const model = getAi().embeddingModelId();
  let embeddedChunks = 0;

  for (const spaceId of result.spaceIds) {
    for (const article of await findArticlesBySpace(spaceId)) {
      if (!article.body.trim()) {
        await replaceChunks(article.id, []);
        continue;
      }
      const chunker = await getChunker(article.format);
      await replaceChunks(article.id, await chunker.split(article.body));
      if (!hasKey) continue;
      const chunks = await findChunksByArticle(article.id);
      if (chunks.length === 0) continue;
      const { embeddings } = await embedMany({
        model: openai.embedding(model),
        values: chunks.map((c) => c.text),
      });
      await upsertEmbeddings(
        chunks.map((chunk, i) => ({ chunkId: chunk.id, model, vector: embeddings[i]! })),
      );
      embeddedChunks += chunks.length;
    }
  }

  return {
    spaces: result.spacesUpserted,
    articles: result.articlesUpserted,
    embeddedChunks,
  };
}
