import pg from "pg";

const { Client } = pg;
const url = process.env.DATABASE_URL;
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
