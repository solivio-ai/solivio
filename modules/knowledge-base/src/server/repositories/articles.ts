import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db, emitEvent } from "@solivio/sdk/runtime";

import { knowledgeBaseArticles, knowledgeBaseArticleTags } from "../../data/schema.ts";

export type ArticleRow = typeof knowledgeBaseArticles.$inferSelect;

const MAP_BODY_PREVIEW_LENGTH = 150;

export async function findArticlesBySpace(spaceId: string): Promise<ArticleRow[]> {
  return db
    .select()
    .from(knowledgeBaseArticles)
    .where(eq(knowledgeBaseArticles.spaceId, spaceId))
    .orderBy(knowledgeBaseArticles.sortOrder, knowledgeBaseArticles.createdAt);
}

/** Lightweight variant for map/list views — truncates body in the DB query. */
export async function findArticlesBySpaceForMap(spaceId: string): Promise<ArticleRow[]> {
  const rows = await db
    .select({
      id: knowledgeBaseArticles.id,
      spaceId: knowledgeBaseArticles.spaceId,
      parentId: knowledgeBaseArticles.parentId,
      title: knowledgeBaseArticles.title,
      body: sql<string>`LEFT(${knowledgeBaseArticles.body}, ${MAP_BODY_PREVIEW_LENGTH})`,
      type: knowledgeBaseArticles.type,
      format: knowledgeBaseArticles.format,
      sortOrder: knowledgeBaseArticles.sortOrder,
      positionX: knowledgeBaseArticles.positionX,
      positionY: knowledgeBaseArticles.positionY,
      origin: knowledgeBaseArticles.origin,
      externalId: knowledgeBaseArticles.externalId,
      syncedAt: knowledgeBaseArticles.syncedAt,
      createdAt: knowledgeBaseArticles.createdAt,
      updatedAt: knowledgeBaseArticles.updatedAt,
    })
    .from(knowledgeBaseArticles)
    .where(eq(knowledgeBaseArticles.spaceId, spaceId))
    .orderBy(knowledgeBaseArticles.sortOrder, knowledgeBaseArticles.createdAt);
  return rows as ArticleRow[];
}

export async function findRootArticlesBySpace(spaceId: string): Promise<ArticleRow[]> {
  return db
    .select()
    .from(knowledgeBaseArticles)
    .where(and(eq(knowledgeBaseArticles.spaceId, spaceId), isNull(knowledgeBaseArticles.parentId)))
    .orderBy(knowledgeBaseArticles.sortOrder, knowledgeBaseArticles.createdAt);
}

export async function findArticleById(id: string): Promise<ArticleRow | null> {
  const rows = await db
    .select()
    .from(knowledgeBaseArticles)
    .where(eq(knowledgeBaseArticles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertArticle(
  input: typeof knowledgeBaseArticles.$inferInsert,
): Promise<ArticleRow> {
  const rows = await db.insert(knowledgeBaseArticles).values(input).returning();
  const article = rows[0]!;
  await emitEvent("knowledge-base.article.created", {
    articleId: article.id,
    spaceId: article.spaceId,
  });
  return article;
}

export async function updateArticle(
  id: string,
  input: Partial<
    Pick<
      typeof knowledgeBaseArticles.$inferInsert,
      "title" | "body" | "type" | "parentId" | "sortOrder" | "positionX" | "positionY"
    >
  >,
): Promise<ArticleRow | null> {
  const rows = await db
    .update(knowledgeBaseArticles)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(knowledgeBaseArticles.id, id))
    .returning();
  const article = rows[0] ?? null;
  // Only re-index when content changes; skip position-only updates (drag on map).
  if (article && (input.body !== undefined || input.title !== undefined)) {
    await emitEvent("knowledge-base.article.updated", {
      articleId: article.id,
      spaceId: article.spaceId,
    });
  }
  return article;
}

export async function deleteArticle(id: string): Promise<void> {
  const rows = await db
    .select({ spaceId: knowledgeBaseArticles.spaceId })
    .from(knowledgeBaseArticles)
    .where(eq(knowledgeBaseArticles.id, id))
    .limit(1);
  await db.delete(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.id, id));
  if (rows[0]) {
    await emitEvent("knowledge-base.article.deleted", { spaceId: rows[0].spaceId });
  }
}

export async function updateArticlePositions(
  spaceId: string,
  updates: Array<{ id: string; x: number; y: number }>,
): Promise<void> {
  await Promise.all(
    updates.map(({ id, x, y }) =>
      db
        .update(knowledgeBaseArticles)
        .set({ positionX: x, positionY: y, updatedAt: new Date() })
        .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.spaceId, spaceId))),
    ),
  );
}

export async function setArticleTags(articleId: string, tags: string[]): Promise<void> {
  await db
    .delete(knowledgeBaseArticleTags)
    .where(eq(knowledgeBaseArticleTags.articleId, articleId));
  if (tags.length === 0) return;
  await db
    .insert(knowledgeBaseArticleTags)
    .values(tags.map((tag) => ({ articleId, tag })))
    .onConflictDoNothing();
}

export async function findTagsByArticle(articleId: string): Promise<string[]> {
  const rows = await db
    .select({ tag: knowledgeBaseArticleTags.tag })
    .from(knowledgeBaseArticleTags)
    .where(eq(knowledgeBaseArticleTags.articleId, articleId));
  return rows.map((r) => r.tag);
}
