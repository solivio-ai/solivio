import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { getAuth } from "@solivio/sdk/runtime";

import {
  findArticleById,
  findArticlesBySpace,
  updateArticle,
} from "../../../../../server/knowledgeBaseRepository.ts";

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

  const { parentId } = parsed.data;

  if (parentId !== null) {
    const [article, parent] = await Promise.all([
      findArticleById(articleId),
      findArticleById(parentId),
    ]);
    if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!parent || parent.spaceId !== article.spaceId) {
      return NextResponse.json({ error: "Invalid parent" }, { status: 422 });
    }
    // Reject if parentId is the article itself or a descendant of it.
    const spaceArticles = await findArticlesBySpace(article.spaceId);
    const byId = new Map(spaceArticles.map((a) => [a.id, a]));
    let cur: (typeof spaceArticles)[0] | undefined = byId.get(parentId);
    while (cur) {
      if (cur.id === articleId) {
        return NextResponse.json({ error: "Cycle detected" }, { status: 422 });
      }
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
  }

  const updated = await updateArticle(articleId, { parentId });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
