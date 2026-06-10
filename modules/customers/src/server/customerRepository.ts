import "server-only";

import { asc, eq, ilike, sql } from "drizzle-orm";

import { normalizeCustomerName } from "@solivio/domain";
import { getDb } from "@solivio/sdk/runtime";

import { customers } from "../data/schema.ts";

type Db = ReturnType<typeof getDb>;
type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type CustomerRow = {
  id: string;
  name: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Escape LIKE/ILIKE wildcards so user input is matched literally. Without this,
 * `%` and `_` in a query become active wildcards (e.g. searching `_` matches
 * every row). Relies on Postgres' default backslash escape character.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function findCustomerByName(name: string, tx?: Tx): Promise<CustomerRow | null> {
  const conn = tx ?? getDb();
  const normalized = normalizeCustomerName(name);
  if (!normalized) return null;

  const [row] = await conn
    .select()
    .from(customers)
    .where(sql`LOWER(${customers.name}) = LOWER(${normalized})`)
    .limit(1);
  return row ?? null;
}

export async function findCustomerById(id: string, tx?: Tx): Promise<CustomerRow | null> {
  const conn = tx ?? getDb();
  const [row] = await conn.select().from(customers).where(eq(customers.id, id)).limit(1);
  return row ?? null;
}

export async function insertCustomer(
  data: { name: string; source?: string },
  tx?: Tx,
): Promise<CustomerRow> {
  const conn = tx ?? getDb();
  const name = normalizeCustomerName(data.name);
  if (!name) throw new Error("Customer name is required");

  const [row] = await conn
    .insert(customers)
    .values({ name, source: data.source ?? "manual" })
    .returning();
  return row;
}

/**
 * Find-or-create a customer by name, reporting whether a new row was inserted.
 * Callers that only need the row can use {@link upsertCustomerByName}.
 */
export async function upsertCustomerByNameDetailed(
  name: string,
  source: string = "manual",
  tx?: Tx,
): Promise<{ customer: CustomerRow; created: boolean }> {
  const normalized = normalizeCustomerName(name);
  if (!normalized) throw new Error("Customer name is required");

  if (!tx) {
    return getDb().transaction((transaction) =>
      upsertCustomerByNameDetailed(normalized, source, transaction),
    );
  }

  const existing = await findCustomerByName(normalized, tx);
  if (existing) return { customer: existing, created: false };

  // Customer not found — acquire an advisory lock before inserting so that
  // two concurrent transactions that both passed the check above don't both
  // insert a duplicate. The lock is advisory (no schema constraint) and
  // releases automatically when the surrounding transaction ends.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(lower(${normalized})))`);

  // Re-check: another transaction may have inserted between our first read
  // and lock acquisition.
  const existingAfterLock = await findCustomerByName(normalized, tx);
  if (existingAfterLock) return { customer: existingAfterLock, created: false };

  return { customer: await insertCustomer({ name: normalized, source }, tx), created: true };
}

export async function upsertCustomerByName(
  name: string,
  source: string = "manual",
  tx?: Tx,
): Promise<CustomerRow> {
  const { customer } = await upsertCustomerByNameDetailed(name, source, tx);
  return customer;
}

export async function listCustomers(limit: number = 100, tx?: Tx) {
  return searchCustomers("", limit, tx);
}

export async function searchCustomers(query: string = "", limit: number = 20, tx?: Tx) {
  const conn = tx ?? getDb();
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
  const normalized = normalizeCustomerName(query);

  if (!normalized) {
    return await conn.select().from(customers).orderBy(asc(customers.name)).limit(safeLimit);
  }

  return await conn
    .select()
    .from(customers)
    .where(ilike(customers.name, `%${escapeLikePattern(normalized)}%`))
    .orderBy(asc(customers.name))
    .limit(safeLimit);
}
