import "server-only";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { db, emitEvent } from "@solivio/sdk/runtime";

import {
  knowledgeBaseArticles,
  knowledgeBaseArticleTags,
  knowledgeBaseChunks,
  knowledgeBaseConnections,
  knowledgeBaseEmbeddings,
  knowledgeBaseSpaces,
} from "../data/schema.ts";
import type { ImportPayload } from "../lib/importSchema.ts";

export type SpaceRow = typeof knowledgeBaseSpaces.$inferSelect;
export type ArticleRow = typeof knowledgeBaseArticles.$inferSelect;
export type ConnectionRow = typeof knowledgeBaseConnections.$inferSelect;

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

export async function findAllSpaces(): Promise<SpaceRow[]> {
  return db
    .select()
    .from(knowledgeBaseSpaces)
    .orderBy(asc(knowledgeBaseSpaces.sortOrder), asc(knowledgeBaseSpaces.createdAt));
}

export async function findSpaceById(id: string): Promise<SpaceRow | null> {
  const rows = await db
    .select()
    .from(knowledgeBaseSpaces)
    .where(eq(knowledgeBaseSpaces.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertSpace(input: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  origin?: string;
  externalId?: string;
}): Promise<SpaceRow> {
  const existing = await db.select({ id: knowledgeBaseSpaces.id }).from(knowledgeBaseSpaces);
  const rows = await db
    .insert(knowledgeBaseSpaces)
    .values({ ...input, sortOrder: existing.length })
    .returning();
  return rows[0]!;
}

export async function updateSpace(
  id: string,
  input: Partial<Pick<typeof knowledgeBaseSpaces.$inferInsert, "name" | "color" | "description">>,
): Promise<SpaceRow | null> {
  const rows = await db
    .update(knowledgeBaseSpaces)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(knowledgeBaseSpaces.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteSpace(id: string): Promise<void> {
  await db.delete(knowledgeBaseSpaces).where(eq(knowledgeBaseSpaces.id, id));
}

export async function updateSpaceSortOrders(
  updates: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sortOrder }) =>
      db
        .update(knowledgeBaseSpaces)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(knowledgeBaseSpaces.id, id)),
    ),
  );
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export async function findArticlesBySpace(spaceId: string): Promise<ArticleRow[]> {
  return db
    .select()
    .from(knowledgeBaseArticles)
    .where(eq(knowledgeBaseArticles.spaceId, spaceId))
    .orderBy(knowledgeBaseArticles.sortOrder, knowledgeBaseArticles.createdAt);
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
  await db.delete(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.id, id));
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export async function findConnectionsByArticle(articleId: string): Promise<ConnectionRow[]> {
  return db
    .select()
    .from(knowledgeBaseConnections)
    .where(eq(knowledgeBaseConnections.fromId, articleId));
}

export async function findConnectionsBySpace(spaceId: string): Promise<ConnectionRow[]> {
  return db
    .select({
      id: knowledgeBaseConnections.id,
      fromId: knowledgeBaseConnections.fromId,
      toId: knowledgeBaseConnections.toId,
      type: knowledgeBaseConnections.type,
      createdAt: knowledgeBaseConnections.createdAt,
      updatedAt: knowledgeBaseConnections.updatedAt,
    })
    .from(knowledgeBaseConnections)
    .innerJoin(knowledgeBaseArticles, eq(knowledgeBaseConnections.fromId, knowledgeBaseArticles.id))
    .where(eq(knowledgeBaseArticles.spaceId, spaceId));
}

export async function updateArticlePositions(
  updates: Array<{ id: string; x: number; y: number }>,
): Promise<void> {
  await Promise.all(
    updates.map(({ id, x, y }) =>
      db
        .update(knowledgeBaseArticles)
        .set({ positionX: x, positionY: y, updatedAt: new Date() })
        .where(eq(knowledgeBaseArticles.id, id)),
    ),
  );
}

// ---------------------------------------------------------------------------
// Import — upsert a full payload (spaces + articles + connections + tags).
// Returns counts of upserted rows and any skipped articles.
// ---------------------------------------------------------------------------

export async function upsertFromImport(payload: ImportPayload): Promise<{
  spacesUpserted: number;
  articlesUpserted: number;
  errors: number;
}> {
  let spacesUpserted = 0;
  let articlesUpserted = 0;
  let errors = 0;

  for (const spaceInput of payload.spaces) {
    // Upsert space by externalId+origin when available, else always insert.
    let space: SpaceRow;
    if (spaceInput.externalId) {
      const existing = await db
        .select()
        .from(knowledgeBaseSpaces)
        .where(
          and(
            eq(knowledgeBaseSpaces.origin, payload.origin),
            eq(knowledgeBaseSpaces.externalId, spaceInput.externalId),
          ),
        )
        .limit(1);
      if (existing[0]) {
        const updated = await db
          .update(knowledgeBaseSpaces)
          .set({
            name: spaceInput.name,
            description: spaceInput.description,
            color: spaceInput.color,
            icon: spaceInput.icon,
            syncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(knowledgeBaseSpaces.id, existing[0].id))
          .returning();
        space = updated[0]!;
      } else {
        space = await insertSpace({
          ...spaceInput,
          origin: payload.origin,
          externalId: spaceInput.externalId,
        });
      }
    } else {
      space = await insertSpace({ ...spaceInput, origin: payload.origin });
    }
    spacesUpserted++;

    // Two-pass article upsert: first create/update all rows, then wire parentId
    // and connections using the externalId→dbId map.
    const externalIdToDbId = new Map<string, string>();

    for (const articleInput of spaceInput.articles) {
      try {
        let article: ArticleRow;
        if (articleInput.externalId) {
          const existing = await db
            .select()
            .from(knowledgeBaseArticles)
            .where(
              and(
                eq(knowledgeBaseArticles.origin, payload.origin),
                eq(knowledgeBaseArticles.externalId, articleInput.externalId),
              ),
            )
            .limit(1);
          if (existing[0]) {
            article = (await updateArticle(existing[0].id, {
              title: articleInput.title,
              body: articleInput.body,
              type: articleInput.type,
              sortOrder: articleInput.sortOrder,
            }))!;
          } else {
            article = await insertArticle({
              spaceId: space.id,
              title: articleInput.title,
              body: articleInput.body,
              type: articleInput.type,
              sortOrder: articleInput.sortOrder,
              origin: payload.origin,
              externalId: articleInput.externalId,
            });
          }
          externalIdToDbId.set(articleInput.externalId, article.id);
        } else {
          article = await insertArticle({
            spaceId: space.id,
            title: articleInput.title,
            body: articleInput.body,
            type: articleInput.type,
            sortOrder: articleInput.sortOrder,
            origin: payload.origin,
          });
        }
        await setArticleTags(article.id, articleInput.tags);
        articlesUpserted++;
      } catch {
        errors++;
      }
    }

    // Second pass: wire parentId
    for (const articleInput of spaceInput.articles) {
      if (!articleInput.externalId || !articleInput.parentExternalId) continue;
      const articleDbId = externalIdToDbId.get(articleInput.externalId);
      const parentDbId = externalIdToDbId.get(articleInput.parentExternalId);
      if (articleDbId && parentDbId) {
        await updateArticle(articleDbId, { parentId: parentDbId });
      }
    }

    // Third pass: connections
    for (const articleInput of spaceInput.articles) {
      if (!articleInput.externalId) continue;
      const fromDbId = externalIdToDbId.get(articleInput.externalId);
      if (!fromDbId) continue;
      for (const conn of articleInput.connections) {
        const toDbId = externalIdToDbId.get(conn.toExternalId);
        if (!toDbId) continue;
        await db
          .insert(knowledgeBaseConnections)
          .values({ fromId: fromDbId, toId: toDbId, type: conn.type })
          .onConflictDoNothing();
      }
    }
  }

  return { spacesUpserted, articlesUpserted, errors };
}

// ---------------------------------------------------------------------------
// Chunks
// ---------------------------------------------------------------------------

export type ChunkRow = typeof knowledgeBaseChunks.$inferSelect;

export async function replaceChunks(
  articleId: string,
  chunks: Array<{ text: string; headingPath: string | null }>,
): Promise<ChunkRow[]> {
  await db.delete(knowledgeBaseChunks).where(eq(knowledgeBaseChunks.articleId, articleId));
  if (chunks.length === 0) return [];
  const rows = await db
    .insert(knowledgeBaseChunks)
    .values(
      chunks.map((c, i) => ({
        articleId,
        chunkIndex: i,
        text: c.text,
        headingPath: c.headingPath,
      })),
    )
    .returning();
  return rows;
}

export async function findChunksByArticle(articleId: string): Promise<ChunkRow[]> {
  return db
    .select()
    .from(knowledgeBaseChunks)
    .where(eq(knowledgeBaseChunks.articleId, articleId))
    .orderBy(asc(knowledgeBaseChunks.chunkIndex));
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export async function upsertEmbeddings(
  entries: Array<{ chunkId: string; model: string; vector: number[] }>,
): Promise<void> {
  if (entries.length === 0) return;
  // Delete stale embeddings for all affected chunks, then insert fresh ones.
  await db.delete(knowledgeBaseEmbeddings).where(
    inArray(
      knowledgeBaseEmbeddings.chunkId,
      entries.map((e) => e.chunkId),
    ),
  );
  await db
    .insert(knowledgeBaseEmbeddings)
    .values(entries.map((e) => ({ chunkId: e.chunkId, model: e.model, vector: e.vector })));
}
