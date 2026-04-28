import { Client } from "pg";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const localDatabaseUrl = "postgresql://solivio:solivio@localhost:5432/solivio";

export async function GET() {
  const database = await checkDatabase();

  return NextResponse.json({
    app: "solivio-api",
    status: "ok",
    database,
    timestamp: new Date().toISOString()
  });
}

async function checkDatabase() {
  const databaseUrl =
    process.env.DATABASE_URL ?? (process.env.NODE_ENV === "development" ? localDatabaseUrl : undefined);

  if (!databaseUrl) {
    return {
      status: "not-configured" as const
    };
  }

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 750
  });

  try {
    await client.connect();

    const result = await client.query<{
      server_version: string;
      vector_version: string | null;
    }>(`
      SELECT
        current_setting('server_version') AS server_version,
        (
          SELECT extversion
          FROM pg_extension
          WHERE extname = 'vector'
        ) AS vector_version
    `);

    const row = result.rows[0];

    return {
      status: "reachable" as const,
      source: process.env.DATABASE_URL ? ("env" as const) : ("development-default" as const),
      serverVersion: row.server_version,
      vectorVersion: row.vector_version ?? "not-installed"
    };
  } catch (error) {
    return {
      status: "unreachable" as const,
      message: error instanceof Error ? error.message : "Unable to connect to database"
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
