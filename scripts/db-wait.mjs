import fs from "node:fs";

import pg from "pg";

// Load apps/solivio/.env.local without failing when it is missing — the
// preflight below prints a friendly fix instead of a raw Node error.
try {
  const { config: loadEnv } = await import("dotenv");
  loadEnv({ path: "apps/solivio/.env.local" });
  loadEnv({ path: "apps/solivio/.env" });
} catch {
  // dotenv unavailable: fall back to whatever the shell provides
}

const { Client } = pg;
const url = process.env.DATABASE_URL;

if (!url) {
  if (!fs.existsSync("apps/solivio/.env.local")) {
    console.error(
      "Missing apps/solivio/.env.local — create it first:\n\n" +
        "  cp apps/solivio/.env.example apps/solivio/.env.local\n\n" +
        "then re-run `yarn setup`.",
    );
  } else {
    console.error("DATABASE_URL is not set in apps/solivio/.env.local.");
  }
  process.exit(1);
}
const MAX = 30;

for (let i = 1; i <= MAX; i++) {
  try {
    const client = new Client({ connectionString: url });
    await client.connect();
    await client.end();
    if (i > 1) process.stdout.write("\n");
    console.log("Database is ready.");
    process.exit(0);
  } catch {
    process.stdout.write(i === 1 ? "Waiting for database" : ".");
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.error("\nDatabase did not become ready in time.");
process.exit(1);
