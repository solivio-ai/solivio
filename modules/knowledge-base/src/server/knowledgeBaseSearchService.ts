import "server-only";

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { desc, eq, sql } from "drizzle-orm";

import { db, getAi } from "@solivio/sdk/runtime";

import {
  knowledgeBaseArticles,
  knowledgeBaseChunks,
  knowledgeBaseEmbeddings,
  knowledgeBaseSpaces,
} from "../data/schema.ts";

export type ArticleSearchMatch = {
  articleId: string;
  articleTitle: string;
  spaceId: string;
  spaceName: string;
  headingPath: string | null;
  excerpt: string;
  similarity: number;
};

type SearchOptions = {
  spaceId?: string;
  limit?: number;
  minSimilarity?: number;
};

const DEFAULT_LIMIT = 5;
const DEFAULT_MIN_SIMILARITY = 0.3;

export async function searchArticles(
  query: string,
  options: SearchOptions = {},
): Promise<ArticleSearchMatch[]> {
  if (!query.trim()) return [];

  const { embedding } = await embed({
    model: openai.embedding(getAi().embeddingModelId()),
    value: query.trim(),
  });

  const pgVector = `[${embedding.join(",")}]`;
  const similarity = sql<number>`1 - (${knowledgeBaseEmbeddings.vector} <=> ${pgVector}::halfvec)`;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;

  // Fetch top chunks (3× limit to allow dedup by article).
  const rows = await db
    .select({
      articleId: knowledgeBaseArticles.id,
      articleTitle: knowledgeBaseArticles.title,
      spaceId: knowledgeBaseArticles.spaceId,
      spaceName: knowledgeBaseSpaces.name,
      headingPath: knowledgeBaseChunks.headingPath,
      excerpt: knowledgeBaseChunks.text,
      similarity,
    })
    .from(knowledgeBaseEmbeddings)
    .innerJoin(knowledgeBaseChunks, eq(knowledgeBaseChunks.id, knowledgeBaseEmbeddings.chunkId))
    .innerJoin(knowledgeBaseArticles, eq(knowledgeBaseArticles.id, knowledgeBaseChunks.articleId))
    .innerJoin(knowledgeBaseSpaces, eq(knowledgeBaseSpaces.id, knowledgeBaseArticles.spaceId))
    .where(options.spaceId ? eq(knowledgeBaseArticles.spaceId, options.spaceId) : undefined)
    .orderBy(desc(similarity))
    .limit(limit * 3);

  // Deduplicate: keep the best-scoring chunk per article.
  const seen = new Map<string, ArticleSearchMatch>();
  for (const row of rows) {
    const score = Number(row.similarity.toFixed(4));
    if (!seen.has(row.articleId)) {
      seen.set(row.articleId, { ...row, similarity: score });
    }
  }

  return [...seen.values()].filter((r) => r.similarity >= minSimilarity).slice(0, limit);
}
