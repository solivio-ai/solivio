import "server-only";

import { eq } from "drizzle-orm";

import { db } from "../database/db";
import { requests } from "../database/schema";

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

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
  tx: Tx = db,
): Promise<RequestRow> {
  const [row] = await tx
    .insert(requests)
    .values({
      customerId: data.customerId,
      rawText: data.rawText,
      source: data.source ?? "manual",
    })
    .returning();
  return row;
}

export async function findRequestById(id: string, tx: Tx = db): Promise<RequestRow | null> {
  const [row] = await tx.select().from(requests).where(eq(requests.id, id)).limit(1);
  return row ?? null;
}
