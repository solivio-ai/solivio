import { NextResponse } from "next/server";

import { checkDatabase } from "../../../server/database/checkDatabase";

export async function GET() {
  const database = await checkDatabase();

  return NextResponse.json({
    app: "solivio",
    status: "ok",
    database,
    timestamp: new Date().toISOString()
  });
}

export const runtime = "nodejs";
