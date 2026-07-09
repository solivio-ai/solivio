import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@solivio/sdk/runtime";

import { knowledgeBaseChunks, knowledgeBaseEmbeddings } from "../../data/schema.ts";

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
