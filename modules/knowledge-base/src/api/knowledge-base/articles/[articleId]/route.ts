import { NextResponse } from "next/server";

import { getAuth } from "@solivio/sdk/runtime";

import { deleteArticle, findArticleById } from "../../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ articleId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  const { articleId } = await params;
  const article = await findArticleById(articleId);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteArticle(articleId);
  return new NextResponse(null, { status: 204 });
}
