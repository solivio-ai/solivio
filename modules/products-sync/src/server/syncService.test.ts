import { afterEach, describe, expect, test } from "vitest";

import type {} from "@solivio/module-catalog/services.ts";
import type { SolivioRuntime } from "@solivio/sdk/runtime";

import {
  createCapturingLogger,
  installTestRuntime,
  resetTestRuntime,
} from "../../../../tests/support/runtime.ts";
import type { SyncRunRow } from "./syncService.ts";
import { runProductsSync } from "./syncService.ts";

type ProductsSyncRun = SyncRunRow;

describe("products-sync service", () => {
  afterEach(() => {
    resetTestRuntime();
  });

  test("imports valid source records, records stats, and emits completion event", async () => {
    const db = createProductsSyncDb();
    const logger = createCapturingLogger();
    const importedRecords: unknown[] = [];
    const completedEvents: unknown[] = [];
    const sourceUrl = dataUrl([
      { sku: "SYNC-1", name: "Synced product" },
      { sku: "", name: "Invalid product" },
    ]);

    installTestRuntime({
      db: db.client,
      logger: logger.logger,
      moduleOptions: { "products-sync": { sourceUrl } },
      services: {
        catalog: {
          importProducts: async (records: unknown[]) => {
            importedRecords.push(...records);
            return { count: records.length };
          },
        },
      },
      subscribers: [
        {
          id: "test.products-sync.completed",
          event: "products-sync.run.completed",
          handler: (payload: unknown) => {
            completedEvents.push(payload);
          },
        },
      ],
    });

    const run = await runProductsSync();

    expect(run.status).toBe("succeeded");
    expect(run.imported).toBe(1);
    expect(run.stats).toEqual({ received: 2, valid: 1, rowErrors: 1 });
    expect(importedRecords).toEqual([
      {
        sku: "SYNC-1",
        name: "Synced product",
        description: "",
        priceNet: 0,
        priceGross: 0,
        vatRate: 23,
        currency: "PLN",
      },
    ]);
    expect(
      logger.entries.some(
        (entry) =>
          entry.moduleId === "products-sync" &&
          entry.level === "info" &&
          entry.message === "sync completed",
      ),
    ).toBe(true);
    expect(completedEvents).toEqual([{ runId: run.id, imported: 1 }]);
  });

  test("records a failed run when the source payload is not an array", async () => {
    const db = createProductsSyncDb();
    const logger = createCapturingLogger();
    const completedEvents: unknown[] = [];

    installTestRuntime({
      db: db.client,
      logger: logger.logger,
      moduleOptions: { "products-sync": { sourceUrl: dataUrl({ sku: "not-an-array" }) } },
      services: {
        catalog: {
          importProducts: async () => {
            throw new Error("catalog should not be called for invalid payloads");
          },
        },
      },
      subscribers: [
        {
          id: "test.products-sync.completed",
          event: "products-sync.run.completed",
          handler: (payload: unknown) => {
            completedEvents.push(payload);
          },
        },
      ],
    });

    const run = await runProductsSync();

    expect(run.status).toBe("failed");
    expect(run.error).toBe("Source payload must be a JSON array");
    expect(completedEvents).toEqual([]);
    expect(
      logger.entries.some(
        (entry) =>
          entry.moduleId === "products-sync" &&
          entry.level === "error" &&
          entry.message === "sync failed",
      ),
    ).toBe(true);
  });

  test("fails before creating a run when no source URL is configured", async () => {
    const db = createProductsSyncDb();

    installTestRuntime({
      db: db.client,
      moduleOptions: { "products-sync": {} },
      services: {
        catalog: {
          importProducts: async () => ({ count: 0 }),
        },
      },
    });

    await expect(runProductsSync()).rejects.toThrow(
      /No source URL: set the module's sourceUrl option/,
    );
    expect(db.runs).toHaveLength(0);
  });
});

function dataUrl(payload: unknown): string {
  return `data:application/json,${encodeURIComponent(JSON.stringify(payload))}`;
}

function createProductsSyncDb() {
  const runs: ProductsSyncRun[] = [];

  return {
    runs,
    client: {
      insert: () => ({
        values: (values: Partial<ProductsSyncRun>) => {
          const run = {
            id: `run-${runs.length + 1}`,
            status: values.status ?? "running",
            source: values.source ?? "test-source",
            imported: values.imported ?? 0,
            stats: values.stats ?? null,
            error: values.error ?? null,
            startedAt: values.startedAt ?? new Date("2026-01-01T00:00:00.000Z"),
            finishedAt: values.finishedAt ?? null,
          } satisfies ProductsSyncRun;
          runs.push(run);
          return { returning: async () => [run] };
        },
      }),
      update: () => ({
        set: (patch: Partial<ProductsSyncRun>) => ({
          where: () => ({
            returning: async () => {
              const run = runs.at(-1);
              if (!run) throw new Error("No products-sync run exists to update");
              Object.assign(run, patch);
              return [run];
            },
          }),
        }),
      }),
      select: () => ({
        from: () => ({
          orderBy: () => ({
            limit: async (limit: number) => runs.slice(0, limit),
          }),
        }),
      }),
    } as unknown as SolivioRuntime["db"],
  };
}
