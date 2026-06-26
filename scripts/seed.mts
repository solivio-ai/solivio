#!/usr/bin/env tsx
/**
 * Loads example data for a fresh local install:
 *
 *   yarn seed
 *
 * Imports examples/import/products-example-100.csv and clients-example.csv
 * through the same CSV importers the app uses, then writes directly to the
 * database. Products and KB articles are embedded when OPENAI_API_KEY is set.
 * Idempotent: re-running updates existing rows by SKU / reuses customers by name.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { productPrices, products } from "../modules/catalog/src/data/schema.ts";
import { csvCustomerImporter } from "../modules/csv-import/src/lib/customerImporter.ts";
import { csvProductImporter } from "../modules/csv-import/src/lib/productImporter.ts";
import { customers } from "../modules/customers/src/data/schema.ts";
import {
  knowledgeBaseArticles,
  knowledgeBaseChunks,
  knowledgeBaseConnections,
  knowledgeBaseEmbeddings,
  knowledgeBaseSpaces,
} from "../modules/knowledge-base/src/data/schema.ts";
import { getChunker } from "../modules/knowledge-base/src/lib/chunking/index.ts";
import {
  flattenPayload,
  importPayloadSchema,
} from "../modules/knowledge-base/src/lib/importSchema.ts";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const { config: loadEnv } = await import("dotenv");
  loadEnv({ path: path.join(repoRoot, "apps/solivio/.env.local") });
  loadEnv({ path: path.join(repoRoot, "apps/solivio/.env") });
} catch {
  // shell-provided env
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — run `yarn setup` first.");
  process.exit(1);
}
const db = drizzle(process.env.DATABASE_URL);

const read = (file: string) =>
  fs.readFileSync(path.join(repoRoot, "examples/import", file), "utf8");

// ── Products + prices ──────────────────────────────────────────────────────────
const productResult = await csvProductImporter.run(read("products-example-100.csv"));
if (productResult.status === "failed") {
  console.error("Product example file failed to parse:", productResult.errors.slice(0, 3));
  process.exit(1);
}

// Embed products exactly as the catalog import service does (same model and
// input string as importProductsWithEmbeddings), so seeded vectors are
// compatible with query-time embeddings and semantic catalog search works.
// Without a key, products import with null embeddings and text search still works.
const PRODUCT_EMBEDDING_MODEL = "text-embedding-3-large";
const productEmbeddings = new Map<string, number[]>();
if (process.env.OPENAI_API_KEY?.trim()) {
  const BATCH_SIZE = 100;
  for (let i = 0; i < productResult.records.length; i += BATCH_SIZE) {
    const batch = productResult.records.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: openai.embedding(PRODUCT_EMBEDDING_MODEL),
      values: batch.map((r) => `${r.sku} ${r.name} ${r.description}`),
    });
    batch.forEach((r, j) => {
      productEmbeddings.set(r.sku, embeddings[j]!);
    });
  }
}

for (const row of productResult.records) {
  const embedding = productEmbeddings.get(row.sku) ?? null;
  const [product] = await db
    .insert(products)
    .values({
      sku: row.sku,
      name: row.name,
      description: row.description,
      source: "seed",
      embedding,
    })
    .onConflictDoUpdate({
      target: products.sku,
      set: { name: row.name, description: row.description, embedding, updatedAt: new Date() },
    })
    .returning({ id: products.id });
  await db
    .insert(productPrices)
    .values({
      productId: product.id,
      currency: row.currency,
      net: row.priceNet,
      gross: row.priceGross,
      vatRate: row.vatRate,
      source: "seed",
    })
    .onConflictDoUpdate({
      target: [productPrices.productId, productPrices.currency],
      set: {
        net: row.priceNet,
        gross: row.priceGross,
        vatRate: row.vatRate,
        updatedAt: new Date(),
      },
    });
}
console.log(
  `✓ ${productResult.records.length} products (with prices) seeded` +
    (productEmbeddings.size > 0
      ? ` (${productEmbeddings.size} embedded, ${PRODUCT_EMBEDDING_MODEL})`
      : " (embeddings skipped — set OPENAI_API_KEY to enable semantic search)"),
);

// ── Customers ──────────────────────────────────────────────────────────────────
const customerResult = await csvCustomerImporter.run(read("clients-example.csv"));
if (customerResult.status === "failed") {
  console.error("Customer example file failed to parse:", customerResult.errors.slice(0, 3));
  process.exit(1);
}
let createdCustomers = 0;
for (const row of customerResult.records) {
  const inserted = await db
    .insert(customers)
    .values({ name: row.name, source: "seed" })
    .onConflictDoNothing()
    .returning({ id: customers.id });
  // No unique constraint on name — emulate find-or-create.
  if (inserted.length > 0) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(customers)
      .where(sql`LOWER(${customers.name}) = LOWER(${row.name})`);
    if (count > 1) {
      await db.delete(customers).where(sql`${customers.id} = ${inserted[0].id}`);
    } else {
      createdCustomers += 1;
    }
  }
}
console.log(`✓ ${createdCustomers} customers seeded (${customerResult.records.length} in file)`);

// ── Knowledge Base ─────────────────────────────────────────────────────────────
const kbRaw = JSON.parse(read("knowledge-base-example.json"));
const kbParsed = importPayloadSchema.safeParse(kbRaw);
if (!kbParsed.success) {
  console.error("KB example file failed to parse:", kbParsed.error.issues.length, "issues");
  process.exit(1);
}
const kbPayload = flattenPayload(kbParsed.data);

let kbSpaceCount = 0;
let kbArticleCount = 0;
// Global map used for cross-space connection wiring in the second pass.
const globalExternalIdToDbId = new Map<string, string>();
// Articles to chunk/embed after insertion.
const seededArticles: Array<{ id: string; body: string; format: "markdown" | "plain" | "csv" }> =
  [];

for (const spaceInput of kbPayload.spaces) {
  const existingSpace = spaceInput.externalId
    ? (
        await db
          .select({ id: knowledgeBaseSpaces.id })
          .from(knowledgeBaseSpaces)
          .where(
            and(
              eq(knowledgeBaseSpaces.origin, "seed"),
              eq(knowledgeBaseSpaces.externalId, spaceInput.externalId),
            ),
          )
          .limit(1)
      )[0]
    : undefined;

  let spaceId: string;
  if (existingSpace) {
    spaceId = existingSpace.id;
    await db
      .update(knowledgeBaseSpaces)
      .set({
        name: spaceInput.name,
        description: spaceInput.description,
        color: spaceInput.color,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeBaseSpaces.id, spaceId));
  } else {
    const [inserted] = await db
      .insert(knowledgeBaseSpaces)
      .values({
        name: spaceInput.name,
        description: spaceInput.description,
        color: spaceInput.color,
        icon: spaceInput.icon,
        origin: "seed",
        externalId: spaceInput.externalId,
        sortOrder: kbSpaceCount,
      })
      .returning({ id: knowledgeBaseSpaces.id });
    spaceId = inserted!.id;
  }
  kbSpaceCount++;

  for (const articleInput of spaceInput.articles) {
    const parentId = articleInput.parentExternalId
      ? (globalExternalIdToDbId.get(articleInput.parentExternalId) ?? null)
      : null;

    let articleId: string;

    if (articleInput.externalId) {
      const existing = (
        await db
          .select({ id: knowledgeBaseArticles.id })
          .from(knowledgeBaseArticles)
          .where(
            and(
              eq(knowledgeBaseArticles.spaceId, spaceId),
              eq(knowledgeBaseArticles.origin, "seed"),
              eq(knowledgeBaseArticles.externalId, articleInput.externalId),
            ),
          )
          .limit(1)
      )[0];

      if (existing) {
        articleId = existing.id;
        await db
          .update(knowledgeBaseArticles)
          .set({
            title: articleInput.title,
            body: articleInput.body,
            type: articleInput.type,
            parentId,
            updatedAt: new Date(),
          })
          .where(eq(knowledgeBaseArticles.id, articleId));
      } else {
        const [ins] = await db
          .insert(knowledgeBaseArticles)
          .values({
            spaceId,
            title: articleInput.title,
            body: articleInput.body,
            type: articleInput.type,
            sortOrder: articleInput.sortOrder,
            origin: "seed",
            externalId: articleInput.externalId,
            parentId,
          })
          .returning({ id: knowledgeBaseArticles.id });
        articleId = ins!.id;
      }
      globalExternalIdToDbId.set(articleInput.externalId, articleId);
    } else {
      const [ins] = await db
        .insert(knowledgeBaseArticles)
        .values({
          spaceId,
          title: articleInput.title,
          body: articleInput.body,
          type: articleInput.type,
          sortOrder: articleInput.sortOrder,
          origin: "seed",
          parentId,
        })
        .returning({ id: knowledgeBaseArticles.id });
      articleId = ins!.id;
    }
    kbArticleCount++;
    const looksLikeMarkdown =
      /^#{1,6}\s/m.test(articleInput.body) || /\|.*\|.*\|/.test(articleInput.body);
    seededArticles.push({
      id: articleId,
      body: articleInput.body,
      format: looksLikeMarkdown ? "markdown" : "plain",
    });
  }
}

// Second pass: wire connections after all articles are inserted (cross-space refs need global map).
for (const spaceInput of kbPayload.spaces) {
  for (const articleInput of spaceInput.articles) {
    if (!articleInput.externalId || !articleInput.connections.length) continue;
    const fromDbId = globalExternalIdToDbId.get(articleInput.externalId);
    if (!fromDbId) continue;
    for (const conn of articleInput.connections) {
      const toDbId = globalExternalIdToDbId.get(conn.toExternalId);
      if (!toDbId) continue;
      await db
        .insert(knowledgeBaseConnections)
        .values({ fromId: fromDbId, toId: toDbId, type: conn.type })
        .onConflictDoNothing();
    }
  }
}

console.log(`✓ ${kbSpaceCount} KB spaces, ${kbArticleCount} articles seeded`);

// ── KB chunking ────────────────────────────────────────────────────────────────
let totalChunks = 0;
const articleIds = seededArticles.map((a) => a.id);
if (articleIds.length > 0) {
  // Delete stale chunks for all seeded articles (cascade deletes embeddings too).
  await db.delete(knowledgeBaseChunks).where(inArray(knowledgeBaseChunks.articleId, articleIds));
}
for (const article of seededArticles) {
  if (!article.body.trim()) continue;
  const chunker = await getChunker(article.format);
  const chunks = await chunker.split(article.body);
  if (chunks.length === 0) continue;
  await db.insert(knowledgeBaseChunks).values(
    chunks.map((c, i) => ({
      articleId: article.id,
      chunkIndex: i,
      text: c.text,
      headingPath: c.headingPath ?? null,
    })),
  );
  totalChunks += chunks.length;
}
console.log(`✓ ${totalChunks} chunks created for ${seededArticles.length} articles`);

// ── KB embeddings (requires OPENAI_API_KEY) ────────────────────────────────────
if (!process.env.OPENAI_API_KEY?.trim()) {
  console.log("  (embeddings skipped — set OPENAI_API_KEY to enable semantic search)");
} else {
  const EMBEDDING_MODEL = "text-embedding-3-large";
  const BATCH_SIZE = 100;

  const allChunks = articleIds.length
    ? await db
        .select({ id: knowledgeBaseChunks.id, text: knowledgeBaseChunks.text })
        .from(knowledgeBaseChunks)
        .where(inArray(knowledgeBaseChunks.articleId, articleIds))
    : [];

  let embeddedCount = 0;
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values: batch.map((c) => c.text),
    });
    await db
      .insert(knowledgeBaseEmbeddings)
      .values(
        batch.map((chunk, j) => ({
          chunkId: chunk.id,
          model: EMBEDDING_MODEL,
          vector: embeddings[j]!,
        })),
      )
      .onConflictDoUpdate({
        target: knowledgeBaseEmbeddings.chunkId,
        set: { model: EMBEDDING_MODEL, vector: sql`excluded.vector`, updatedAt: new Date() },
      });
    embeddedCount += batch.length;
    process.stdout.write(`  embedding ${embeddedCount}/${allChunks.length}...\r`);
  }
  console.log(`✓ ${embeddedCount} embeddings generated (${EMBEDDING_MODEL})`);
}

console.log("\nSign in and open the dashboard — try /offers/new or the product search.");
process.exit(0);
