import "server-only";

import { eq, inArray } from "drizzle-orm";

import { getDb } from "@solivio/sdk/runtime";

import { requests } from "../data/schema.ts";

type Db = ReturnType<typeof getDb>;
type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type RequestRow = {
  id: string;
  customerId: string | null;
  rawText: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function insertRequest(
  data: { customerId: string | null; rawText: string; source?: string },
  tx?: Tx,
): Promise<RequestRow> {
  const conn = tx ?? getDb();
  const [row] = await conn
    .insert(requests)
    .values({
      customerId: data.customerId,
      rawText: data.rawText,
      source: data.source ?? "manual",
    })
    .returning();
  return row;
}

export async function findRequestById(id: string, tx?: Tx): Promise<RequestRow | null> {
  const conn = tx ?? getDb();
  const [row] = await conn.select().from(requests).where(eq(requests.id, id)).limit(1);
  return row ?? null;
}

export async function findRequestsByIds(
  ids: string[],
  tx?: Tx,
): Promise<Array<{ id: string; rawText: string }>> {
  if (ids.length === 0) return [];
  const conn = tx ?? getDb();
  return conn
    .select({ id: requests.id, rawText: requests.rawText })
    .from(requests)
    .where(inArray(requests.id, ids));
}
