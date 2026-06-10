import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

/**
 * Verifies migration continuity for already-deployed databases:
 *
 *   1. creates a scratch database and applies ONLY the frozen baseline
 *      (core journal entries that existed before the per-module split),
 *      simulating the deployed demo database, then
 *   2. runs the real runner (core journal + module journals) against it and
 *      asserts it completes and converges on the expected state.
 */

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appDir = path.join(repoRoot, "apps/solivio");

try {
  const { config: loadEnv } = await import("dotenv");
  loadEnv({ path: path.join(appDir, ".env.local") });
  loadEnv({ path: path.join(appDir, ".env") });
} catch {
  // CI provides DATABASE_URL directly.
}

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("[continuity] DATABASE_URL is required");
  process.exit(1);
}

const SCRATCH_DB = "solivio_continuity_check";
/** Baseline = journal entries that predate the per-module split. Frozen forever. */
const BASELINE_MAX_IDX = 1;

const adminPool = new pg.Pool({ connectionString: baseUrl });
const scratchUrl = new URL(baseUrl);
scratchUrl.pathname = `/${SCRATCH_DB}`;

let failed = false;
try {
  await adminPool.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB}`);
  await adminPool.query(`CREATE DATABASE ${SCRATCH_DB}`);

  const scratchPool = new pg.Pool({ connectionString: scratchUrl.href });
  try {
    await scratchPool.query("CREATE EXTENSION IF NOT EXISTS vector");

    // 1. Simulate the deployed database: baseline entries only.
    const tempDrizzle = fs.mkdtempSync(path.join(os.tmpdir(), "solivio-baseline-"));
    fs.cpSync(path.join(appDir, "drizzle"), tempDrizzle, { recursive: true });
    const journalPath = path.join(tempDrizzle, "meta/_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    journal.entries = journal.entries.filter((entry) => entry.idx <= BASELINE_MAX_IDX);
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));

    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(drizzle(scratchPool), { migrationsFolder: tempDrizzle });
    console.log("[continuity] Baseline applied (simulated deployed database)");
    fs.rmSync(tempDrizzle, { recursive: true, force: true });

    // 2. Run the real runner on top of it.
    execFileSync("node", ["scripts/migrate.mjs"], {
      cwd: appDir,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: scratchUrl.href },
    });

    // 3. Assert convergence.
    const tables = await scratchPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const names = new Set(tables.rows.map((row) => row.table_name));
    for (const required of ["customers", "requests", "offers", "products"]) {
      if (!names.has(required)) throw new Error(`Missing table "${required}" after migration`);
    }
    const fks = await scratchPool.query(
      "SELECT conname FROM pg_constraint WHERE conname IN ('offers_customer_id_customers_id_fk', 'offers_request_id_requests_id_fk')",
    );
    if (fks.rowCount !== 0) {
      throw new Error("Cross-module FK constraints were not dropped by the detach migration");
    }
    console.log("[continuity] OK — deployed databases migrate cleanly onto the split journals");
  } finally {
    await scratchPool.end().catch(() => {});
  }
} catch (error) {
  console.error("[continuity] FAILED:", error.message ?? error);
  failed = true;
} finally {
  await adminPool.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB}`).catch(() => {});
  await adminPool.end().catch(() => {});
}
process.exit(failed ? 1 : 0);
