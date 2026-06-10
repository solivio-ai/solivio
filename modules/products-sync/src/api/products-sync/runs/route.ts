import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuth } from "@solivio/sdk/runtime";

import { listSyncRuns, runProductsSync } from "../../../server/syncService.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const auth = await getAuth().requireAdmin();
  if (auth.response) return auth.response;

  const runs = await listSyncRuns();
  return NextResponse.json({ runs });
}

const runNowSchema = z.object({ sourceUrl: z.string().optional() }).strict();

export async function POST(request: Request) {
  const auth = await getAuth().requireAdmin();
  if (auth.response) return auth.response;

  const body = runNowSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const run = await runProductsSync(body.data.sourceUrl);
    return NextResponse.json({ run }, { status: run.status === "succeeded" ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
