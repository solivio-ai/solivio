import "server-only";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";

// Type-side: dependency services + this module's event declarations.
import type {} from "@solivio/module-catalog/services.ts";
import { db, emitEvent, getLogger, getModuleOptions, getService } from "@solivio/sdk/runtime";

import { productsSyncRuns } from "../data/schema.ts";
import type {} from "../events.ts";
import type { ProductsSyncOptions } from "../index.ts";

const sourceRecordSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  priceNet: z.number().nonnegative().default(0),
  priceGross: z.number().nonnegative().default(0),
  vatRate: z.number().nonnegative().default(23),
  currency: z.string().min(1).default("PLN"),
});

export type SyncRunRow = typeof productsSyncRuns.$inferSelect;

export async function listSyncRuns(limit = 20): Promise<SyncRunRow[]> {
  return db.select().from(productsSyncRuns).orderBy(desc(productsSyncRuns.startedAt)).limit(limit);
}

/**
 * Pulls products from the configured (or overridden) source URL and imports
 * them into the catalog, recording an auditable run row either way.
 */
export async function runProductsSync(sourceUrlOverride?: string): Promise<SyncRunRow> {
  const logger = getLogger("products-sync");
  const options = getModuleOptions<ProductsSyncOptions>("products-sync");
  const sourceUrl = sourceUrlOverride ?? options.sourceUrl;
  if (!sourceUrl) {
    throw new Error(
      "No source URL: set the module's sourceUrl option in solivio.config.ts or pass one explicitly",
    );
  }

  const [run] = await db
    .insert(productsSyncRuns)
    .values({ status: "running", source: sourceUrl })
    .returning();

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Source responded with ${response.status}`);
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) throw new Error("Source payload must be a JSON array");

    const records: Array<z.infer<typeof sourceRecordSchema>> = [];
    const errors: Array<{ index: number; message: string }> = [];
    payload.forEach((item, index) => {
      const parsed = sourceRecordSchema.safeParse(item);
      if (parsed.success) records.push(parsed.data);
      else errors.push({ index, message: "Invalid product record" });
    });

    const { count } = await getService("catalog").importProducts(records);

    const [finished] = await db
      .update(productsSyncRuns)
      .set({
        status: "succeeded",
        imported: count,
        stats: { received: payload.length, valid: records.length, rowErrors: errors.length },
        finishedAt: new Date(),
      })
      .where(eq(productsSyncRuns.id, run.id))
      .returning();

    await emitEvent("products-sync.run.completed", { runId: run.id, imported: count });
    logger.info("sync completed", { runId: run.id, imported: count });
    return finished;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const [failed] = await db
      .update(productsSyncRuns)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(productsSyncRuns.id, run.id))
      .returning();
    logger.error("sync failed", { runId: run.id, error: message });
    return failed;
  }
}
