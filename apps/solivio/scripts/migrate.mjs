import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

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

const pool = new pg.Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

try {
  console.log("[migrate] Applying migrations from ./drizzle");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Done");
} catch (error) {
  console.error("[migrate] Failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
