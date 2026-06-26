import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { getAuth } from "@solivio/sdk/runtime";

import { insertArticle } from "../../../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(1),
  body: z.string().optional().default(""),
  type: z.enum(["article", "directory"]),
  parentId: z.string().uuid().nullable().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

type RouteParams = { params: Promise<{ spaceId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  const { spaceId } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const article = await insertArticle({
    spaceId,
    title: parsed.data.title,
    body: parsed.data.body,
    type: parsed.data.type,
    parentId: parsed.data.parentId ?? null,
    positionX: parsed.data.positionX ?? null,
    positionY: parsed.data.positionY ?? null,
  });
  return NextResponse.json({
    ...article,
    updatedAt: article.updatedAt.toISOString(),
    createdAt: article.createdAt.toISOString(),
  });
}
