import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuth } from "@solivio/sdk/runtime";

import {
  deleteArticle,
  findArticleById,
  updateArticle,
} from "../../../../server/knowledgeBaseRepository.ts";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ articleId: string }> };

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().optional(),
  type: z.enum(["article", "directory"]).optional(),
});

export async function GET(_request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  const { articleId } = await params;
  const article = await findArticleById(articleId);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  const { articleId } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const article = await updateArticle(articleId, parsed.data);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  await getAuth().requireAuth();
  const { articleId } = await params;
  const article = await findArticleById(articleId);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteArticle(articleId);
  return new NextResponse(null, { status: 204 });
}
