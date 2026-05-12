import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "../database/db";
import { customers } from "../database/schema";

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export type CustomerRow = {
  id: string;
  name: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function findCustomerByName(name: string, tx: Tx = db): Promise<CustomerRow | null> {
  const [row] = await tx
    .select()
    .from(customers)
    .where(sql`LOWER(${customers.name}) = LOWER(${name})`)
    .limit(1);
  return row ?? null;
}

export async function findCustomerById(id: string, tx: Tx = db): Promise<CustomerRow | null> {
  const [row] = await tx.select().from(customers).where(eq(customers.id, id)).limit(1);
  return row ?? null;
}

export async function insertCustomer(
  data: { name: string; source?: string },
  tx: Tx = db,
): Promise<CustomerRow> {
  const [row] = await tx
    .insert(customers)
    .values({ name: data.name, source: data.source ?? "manual" })
    .returning();
  return row;
}

export async function upsertCustomerByName(
  name: string,
  source: string = "manual",
  tx: Tx = db,
): Promise<CustomerRow> {
  const existing = await findCustomerByName(name, tx);
  if (existing) return existing;
  return insertCustomer({ name, source }, tx);
}

export async function listCustomers(limit: number = 100, tx: Tx = db) {
  return await tx.select().from(customers).orderBy(customers.name).limit(limit);
}
