import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@solivio/sdk/runtime";

import {
  knowledgeBaseArticles,
  knowledgeBaseConnections,
  knowledgeBaseImportRuns,
  knowledgeBaseSpaces,
} from "../../data/schema.ts";
import type { ImportPayload } from "../../lib/importSchema.ts";
import { insertArticle, setArticleTags, updateArticle } from "./articles.ts";
import { insertSpace, syncSpace } from "./spaces.ts";

export type ImportRunRow = typeof knowledgeBaseImportRuns.$inferSelect;

// ---------------------------------------------------------------------------
// Import — upsert a full payload (spaces + articles + connections + tags).
// ---------------------------------------------------------------------------

export async function upsertFromImport(payload: ImportPayload): Promise<{
  spacesUpserted: number;
  articlesUpserted: number;
  errors: number;
  spaceIds: string[];
}> {
  let spacesUpserted = 0;
  let articlesUpserted = 0;
  let errors = 0;
  const spaceIds: string[] = [];

  for (const spaceInput of payload.spaces) {
    let space: Awaited<ReturnType<typeof insertSpace>>;
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
      space = existing[0]
        ? await syncSpace(existing[0].id, spaceInput)
        : await insertSpace({ ...spaceInput, origin: payload.origin });
    } else {
      space = await insertSpace({ ...spaceInput, origin: payload.origin });
    }
    spacesUpserted++;
    spaceIds.push(space.id);

    // Single-pass article upsert: flattenArticles guarantees parents come before
    // children, so parentId is always resolvable from the map by the time a
    // child is processed.
    const externalIdToDbId = new Map<string, string>();

    for (const articleInput of spaceInput.articles) {
      const parentDbId = articleInput.parentExternalId
        ? (externalIdToDbId.get(articleInput.parentExternalId) ?? null)
        : null;

      try {
        let article: Awaited<ReturnType<typeof insertArticle>>;
        if (articleInput.externalId) {
          const existing = await db
            .select()
            .from(knowledgeBaseArticles)
            .where(
              and(
                eq(knowledgeBaseArticles.spaceId, space.id),
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
              parentId: parentDbId,
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
              parentId: parentDbId ?? undefined,
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
            parentId: parentDbId ?? undefined,
          });
        }
        await setArticleTags(article.id, articleInput.tags);
        articlesUpserted++;
      } catch {
        errors++;
      }
    }

    // Second pass: connections
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

  return { spacesUpserted, articlesUpserted, errors, spaceIds };
}

// ---------------------------------------------------------------------------
// Import runs
// ---------------------------------------------------------------------------

export async function createImportRun(origin: string): Promise<ImportRunRow> {
  const rows = await db
    .insert(knowledgeBaseImportRuns)
    .values({ origin, status: "running" })
    .returning();
  return rows[0]!;
}

export async function completeImportRun(
  id: string,
  result: { spacesCount: number; articlesUpserted: number; errors: number },
): Promise<void> {
  await db
    .update(knowledgeBaseImportRuns)
    .set({ status: "completed", finishedAt: new Date(), ...result })
    .where(eq(knowledgeBaseImportRuns.id, id));
}

export async function failImportRun(id: string, errorMessage: string): Promise<void> {
  await db
    .update(knowledgeBaseImportRuns)
    .set({ status: "failed", finishedAt: new Date(), errorMessage })
    .where(eq(knowledgeBaseImportRuns.id, id));
}

export async function listImportRuns(limit = 20): Promise<ImportRunRow[]> {
  return db
    .select()
    .from(knowledgeBaseImportRuns)
    .orderBy(desc(knowledgeBaseImportRuns.startedAt))
    .limit(limit);
}
