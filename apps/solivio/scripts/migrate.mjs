import fs from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/**
 * Applies all migration journals in order:
 *   1. the frozen core journal (./drizzle, default __drizzle_migrations table —
 *      identical behavior to the pre-split runner, so deployed databases and
 *      fresh checkouts converge on the same history), then
 *   2. each enabled module's journal (from the generated manifest), each with
 *      its own drizzle_migrations_<module> table.
 *
 * A pg advisory lock serializes concurrent instances.
 */

try {
  const { config: loadEnv } = await import("dotenv");
  loadEnv({ path: ".env.local" });
  loadEnv({ path: ".env" });
} catch {
  // Production images receive DATABASE_URL from the container environment.
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL is required");
  process.exit(1);
}

const manifestPath = path.resolve("src/generated/db/migrations.json");
if (!fs.existsSync(manifestPath)) {
  console.error(
    "[migrate] Missing generated migration manifest — run `yarn generate` before `yarn db:migrate`.",
  );
  process.exit(1);
}
const moduleJournals = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const pool = new pg.Pool({ connectionString: databaseUrl });
const db = drizzle(pool);
const lockClient = await pool.connect();

try {
  await lockClient.query("SELECT pg_advisory_lock(hashtext('solivio_migrations'))");

  console.log("[migrate] Applying core migrations from ./drizzle");
  await migrate(db, { migrationsFolder: "./drizzle" });

  for (const journal of moduleJournals) {
    const folder = path.resolve("../..", journal.dir);
    if (!fs.existsSync(path.join(folder, "meta", "_journal.json"))) {
      console.log(`[migrate] Module "${journal.id}": no migrations yet, skipping`);
      continue;
    }
    console.log(`[migrate] Module "${journal.id}": applying ${journal.dir}`);
    await migrate(db, { migrationsFolder: folder, migrationsTable: journal.table });
  }

  console.log("[migrate] Done");
} catch (error) {
  console.error("[migrate] Failed:", error);
  process.exitCode = 1;
} finally {
  await lockClient
    .query("SELECT pg_advisory_unlock(hashtext('solivio_migrations'))")
    .catch(() => {});
  lockClient.release();
  await pool.end().catch(() => {});
}
