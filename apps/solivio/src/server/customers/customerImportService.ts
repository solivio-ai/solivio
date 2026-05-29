import "server-only";

import { z } from "zod";

import type { CustomerInput, ImportRowError } from "@solivio/sdk";

import { db } from "../database/db";
import { normalizeCustomerName, upsertCustomerByName } from "./customerRepository";

const customerImportRecordSchema = z
  .object({
    name: z.string().transform(normalizeCustomerName).pipe(z.string().min(1)),
    source: z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1))
      .optional(),
  })
  .strict();

export async function importCustomers(records: unknown[]): Promise<{
  count: number;
  errors: ImportRowError[];
}> {
  if (records.length === 0) return { count: 0, errors: [] };

  const errors: ImportRowError[] = [];
  const valid: CustomerInput[] = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    const parsed = customerImportRecordSchema.safeParse(record);
    if (!parsed.success) {
      errors.push({ index, message: "Invalid customer record" });
      return;
    }

    const key = parsed.data.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    valid.push(parsed.data);
  });

  if (valid.length === 0) return { count: 0, errors };

  await db.transaction(async (tx) => {
    for (const customer of valid) {
      await upsertCustomerByName(customer.name, customer.source ?? "import", tx);
    }
  });

  return { count: valid.length, errors };
}
