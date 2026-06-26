import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { getAuth } from "@solivio/sdk/runtime";

import { updateArticle } from "../../../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";

const schema = z.object({
  parentId: z.string().uuid().nullable(),
});

type RouteParams = { params: Promise<{ articleId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  const { articleId } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const article = await updateArticle(articleId, { parentId: parsed.data.parentId });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(article);
}
