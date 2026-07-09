import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@solivio/sdk/runtime";

import { knowledgeBaseArticles, knowledgeBaseConnections } from "../../data/schema.ts";

export type ConnectionRow = typeof knowledgeBaseConnections.$inferSelect;

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
