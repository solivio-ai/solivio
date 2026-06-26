import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { getAuth } from "@solivio/sdk/runtime";

import { updateArticlePositions } from "../../../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";

const positionsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string().uuid(),
      x: z.number(),
      y: z.number(),
    }),
  ),
});

type RouteParams = { params: Promise<{ spaceId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  await params;
  const body = await request.json();
  const parsed = positionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await updateArticlePositions(parsed.data.positions);
  return NextResponse.json({ ok: true });
}
