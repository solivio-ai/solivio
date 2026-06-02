import { NextResponse } from "next/server";
import { z } from "zod";

import { checkDatabase } from "../../../server/database/checkDatabase";

const databaseStatusSchema = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("not-configured") }).strict(),
    z
      .object({
        status: z.literal("reachable"),
        source: z.enum(["env", "development-default"]),
        serverVersion: z.string(),
        vectorVersion: z.string(),
      })
      .strict(),
    z
      .object({
        status: z.literal("unreachable"),
        message: z.string(),
      })
      .strict(),
  ])
  .meta({
    id: "DatabaseStatus",
    description: "Database readiness information returned by the health endpoint.",
  });

const healthResponseSchema = z
  .object({
    app: z.literal("solivio"),
    status: z.literal("ok"),
    database: databaseStatusSchema,
    timestamp: z.string().datetime(),
  })
  .strict()
  .meta({ id: "HealthResponse" });

/**
 * Check service health
 * @operationId getHealth
 * @tag System
 * @response 200:healthResponseSchema:The app is reachable and reports database readiness.
 * @openapi
 */
export async function GET() {
  const database = await checkDatabase();

  return NextResponse.json(
    healthResponseSchema.parse({
      app: "solivio",
      status: "ok",
      database,
      timestamp: new Date().toISOString(),
    }),
  );
}

export const runtime = "nodejs";
