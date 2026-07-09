import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@solivio/sdk/runtime";

import { knowledgeBaseSpaces } from "../../data/schema.ts";

export type SpaceRow = typeof knowledgeBaseSpaces.$inferSelect;

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

// Used by upsertFromImport — updates sync metadata on an existing space.
export async function syncSpace(
  id: string,
  input: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  },
): Promise<SpaceRow> {
  const rows = await db
    .update(knowledgeBaseSpaces)
    .set({ ...input, syncedAt: new Date(), updatedAt: new Date() })
    .where(eq(knowledgeBaseSpaces.id, id))
    .returning();
  return rows[0]!;
}
