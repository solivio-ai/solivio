#!/usr/bin/env tsx
/**
 * Loads example data for a fresh local install:
 *
 *   yarn seed
 *
 * Imports examples/import/products-example-100.csv and clients-example.csv
 * through the same CSV importers the app uses, then writes directly to the
 * database (embeddings are skipped — semantic search needs an OPENAI_API_KEY
 * and a real import via the admin upload pages). Idempotent: re-running
 * updates existing rows by SKU / reuses customers by name.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { productPrices, products } from "../modules/catalog/src/data/schema.ts";
import { csvCustomerImporter } from "../modules/csv-import/src/lib/customerImporter.ts";
import { csvProductImporter } from "../modules/csv-import/src/lib/productImporter.ts";
import { customers } from "../modules/customers/src/data/schema.ts";
import {
  knowledgeBaseArticles,
  knowledgeBaseConnections,
  knowledgeBaseSpaces,
} from "../modules/knowledge-base/src/data/schema.ts";
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
for (const row of productResult.records) {
  const [product] = await db
    .insert(products)
    .values({ sku: row.sku, name: row.name, description: row.description, source: "seed" })
    .onConflictDoUpdate({
      target: products.sku,
      set: { name: row.name, description: row.description, updatedAt: new Date() },
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
console.log(`✓ ${productResult.records.length} products (with prices) seeded`);

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
    // suppress unused-variable warning — articleId used by connections pass below
    void articleId;
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

console.log("\nSign in and open the dashboard — try /offers/new or the product search.");
process.exit(0);
