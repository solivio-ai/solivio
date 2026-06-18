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

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { productPrices, products } from "../modules/catalog/src/data/schema.ts";
import { csvCustomerImporter } from "../modules/csv-import/src/lib/customerImporter.ts";
import { csvProductImporter } from "../modules/csv-import/src/lib/productImporter.ts";
import { customers } from "../modules/customers/src/data/schema.ts";
import {
  knowledgeBaseArticles,
  knowledgeBaseSpaces,
} from "../modules/knowledge-base/src/data/schema.ts";

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
const mainSpace = await db
  .insert(knowledgeBaseSpaces)
  .values({ name: "Main", description: "General company knowledge", color: "#134E4A" })
  .onConflictDoNothing()
  .returning({ id: knowledgeBaseSpaces.id });

const regulationsSpace = await db
  .insert(knowledgeBaseSpaces)
  .values({
    name: "Regulations & Standards",
    description: "Legal requirements and compliance standards",
    color: "#F6C215",
  })
  .onConflictDoNothing()
  .returning({ id: knowledgeBaseSpaces.id });

if (mainSpace[0]) {
  const sid = mainSpace[0].id;
  const [onboarding] = await db
    .insert(knowledgeBaseArticles)
    .values({
      spaceId: sid,
      title: "Getting Started",
      body: "Welcome to the Solivio knowledge base. This space contains general company knowledge shared across all teams.",
      type: "article",
      sortOrder: 0,
    })
    .onConflictDoNothing()
    .returning({ id: knowledgeBaseArticles.id });

  if (onboarding) {
    await db
      .insert(knowledgeBaseArticles)
      .values([
        {
          spaceId: sid,
          parentId: onboarding.id,
          title: "Discount Policy",
          body: "Standard discounts are capped at 15% without manager approval. Volume discounts above 10k PLN require sign-off from Sales Lead.",
          type: "policy",
          sortOrder: 1,
        },
        {
          spaceId: sid,
          parentId: onboarding.id,
          title: "Offer Template",
          body: "Use this template for all outbound offers. Include: product summary, pricing breakdown, validity date (30 days), and contact details.",
          type: "template",
          sortOrder: 2,
        },
      ])
      .onConflictDoNothing();
  }

  await db
    .insert(knowledgeBaseArticles)
    .values({
      spaceId: sid,
      title: "Sales Process",
      body: "Our standard sales process: 1. Receive customer request. 2. Extract requirements with AI. 3. Match products. 4. Generate offer draft. 5. Review and send.",
      type: "directive",
      sortOrder: 10,
    })
    .onConflictDoNothing();
}

if (regulationsSpace[0]) {
  const sid = regulationsSpace[0].id;
  const [ceRoot] = await db
    .insert(knowledgeBaseArticles)
    .values({
      spaceId: sid,
      title: "CE Marking Requirements",
      body: "All products sold in the EU must carry a CE mark. This declares conformity with EU health, safety, and environmental requirements.",
      type: "directive",
      sortOrder: 0,
    })
    .onConflictDoNothing()
    .returning({ id: knowledgeBaseArticles.id });

  if (ceRoot) {
    await db
      .insert(knowledgeBaseArticles)
      .values([
        {
          spaceId: sid,
          parentId: ceRoot.id,
          title: "Low Voltage Directive",
          body: "LVD 2014/35/EU applies to electrical equipment operating between 50–1000V AC or 75–1500V DC. Requires Declaration of Conformity.",
          type: "article",
          sortOrder: 1,
        },
        {
          spaceId: sid,
          parentId: ceRoot.id,
          title: "EMC Directive",
          body: "Directive 2014/30/EU covers electromagnetic compatibility. Products must not cause interference and must have adequate immunity.",
          type: "article",
          sortOrder: 2,
        },
      ])
      .onConflictDoNothing();
  }

  await db
    .insert(knowledgeBaseArticles)
    .values({
      spaceId: sid,
      title: "GDPR Data Handling",
      body: "Customer data is processed under GDPR Article 6(1)(b) — contract performance. Retention: 5 years after last transaction. Erasure requests handled within 30 days.",
      type: "policy",
      sortOrder: 10,
    })
    .onConflictDoNothing();
}

console.log("✓ knowledge base seeded (2 spaces with example articles)");

console.log("\nSign in and open the dashboard — try /offers/new or the product search.");
process.exit(0);
