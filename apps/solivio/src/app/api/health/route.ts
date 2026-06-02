import { NextResponse } from "next/server";

import { healthResponseSchema } from "@/server/api/schemas";

import { checkDatabase } from "../../../server/database/checkDatabase";

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
