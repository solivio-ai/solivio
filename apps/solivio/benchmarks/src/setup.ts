// Imported dynamically by run.ts AFTER DATABASE_URL has been pointed at the
// benchmark database — the Drizzle client reads the env var at module init.

import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { inArray, notInArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

import { db } from "../../src/server/database/db";
import { products } from "../../src/server/database/schema";
import { getDefaultEmbeddingModel } from "../../src/server/products/embeddingConfig";
import { upsertMany } from "../../src/server/products/productRepository";

type CatalogProduct = { sku: string; name: string; description: string };

export const BENCHMARK_DB_NAME = "solivio_benchmark";

/** Creates the benchmark database and pgvector extension if missing. */
/** Creates the benchmark database and pgvector extension if missing. */
export async function ensureBenchmarkDatabase(adminUrl: string, benchmarkUrl: string) {
  const dbName = new URL(benchmarkUrl).pathname.slice(1);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      dbName,
    ]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${dbName}`);
    }
  } finally {
    await admin.end();
  }

export async function runMigrations(migrationsFolder: string) {
  await migrate(db, { migrationsFolder });
}

/**
 * Makes the products table exactly mirror the benchmark catalog: removes
 * everything else, embeds only new or changed rows (same text format as
 * productEmbeddingService so search behaves like production imports).
 */
export async function syncCatalog(catalog: CatalogProduct[]): Promise<{ embedded: number }> {
  const catalogSkus = catalog.map((p) => p.sku);

  await db.delete(products).where(notInArray(products.sku, catalogSkus));

  const existing = await db
    .select({ sku: products.sku, name: products.name, description: products.description })
    .from(products)
    .where(inArray(products.sku, catalogSkus));
  const existingBySku = new Map(existing.map((p) => [p.sku, p]));

  const stale = catalog.filter((p) => {
    const current = existingBySku.get(p.sku);
    return !current || current.name !== p.name || current.description !== p.description;
  });
  if (stale.length === 0) return { embedded: 0 };

  const { embeddings } = await embedMany({
    model: openai.embedding(getDefaultEmbeddingModel()),
    values: stale.map((p) => `${p.sku} ${p.name} ${p.description}`),
  });

  await upsertMany(
    stale.map((product, i) => ({
      sku: product.sku,
      name: product.name,
      description: product.description,
      source: "benchmark",
      embedding: embeddings[i],
    })),
  );

  return { embedded: stale.length };
}
