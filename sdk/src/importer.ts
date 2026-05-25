/**
 * Importers are input-surface capabilities a module can expose.
 * They are pure transformation functions: raw payload in, normalized records out.
 * The core receives the records and handles persistence, deduplication, and indexing.
 *
 * In future - importer will also be used not only for products, but also for other entities like
 * clients, offers, requests, etc.
 */

import type { ProductInput } from "./entities/product.js";

/** `success` — all rows parsed; `partial` — some rows failed; `failed` — no records produced. */
export type ImportStatus = "success" | "partial" | "failed";

export interface ImportResult {
  status: ImportStatus;
  /** Normalized product records ready for the core to persist. */
  records: ProductInput[];
  errors: Array<{ index?: number; sku?: string; message: string }>;
}

export interface ImporterDefinition<TPayload = unknown> {
  /** Unique name for this importer, e.g. "csv-products". */
  name: string;
  description: string;
  /** File types this importer accepts — passed directly to the HTML <input accept> attribute.
   *  e.g. [".csv", "text/csv"] */
  accept: string[];
  run: (payload: TPayload) => Promise<ImportResult>;
}
