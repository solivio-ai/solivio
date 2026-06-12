// Imported dynamically by run.ts AFTER DATABASE_URL has been pointed at the
// benchmark database and the module runtime has been booted — syncCatalog
// reaches the catalog through the same runtime accessors modules use.

import { sql } from "drizzle-orm";
import { Client, escapeIdentifier } from "pg";

import { getDb, getService } from "@solivio/sdk/runtime";

type CatalogProduct = { sku: string; name: string; description: string };

// The benchmark catalog has no price data and scoring ignores prices; the
// catalog import contract requires them, so every product gets this
// placeholder price row.
const PLACEHOLDER_PRICE = { priceNet: 100, priceGross: 123, vatRate: 23, currency: "PLN" };

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
export async function syncCatalog(catalog: CatalogProduct[]): Promise<{ embedded: number }> {
  const catalogSkus = catalog.map((p) => p.sku);
  const db = getDb();

  // drizzle's sql template expands a JS array into a parenthesized
  // parameter list, so IN/NOT IN is the natural operator here.
  await db.execute(sql`DELETE FROM catalog_products WHERE sku NOT IN ${catalogSkus}`);

  const existing = await db.execute(
    sql`SELECT sku, name, description, (embedding IS NULL) AS missing_embedding
        FROM catalog_products WHERE sku IN ${catalogSkus}`,
  );
  type ExistingRow = CatalogProduct & { missing_embedding: boolean };
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

  await getService("catalog").importProducts(
    stale.map((product) => ({ ...product, ...PLACEHOLDER_PRICE })),
  );

  return { embedded: stale.length };
}
