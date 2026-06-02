/**
 * Importers are input-surface capabilities a module can expose.
 * They are pure transformation functions: raw payload in, normalized records out.
 * The core receives the records and handles persistence, deduplication, and indexing.
 *
 * Importers are generic over the entity they produce. v0 wires only the
 * `product` target; `customer`/`request`/etc. are reserved for later.
 */

import type { ProductInput } from "./entities/product.js";

/** Canonical entity an importer produces. The core routes records by target. */
export type ImportTarget = "product";

/** `success` — all rows parsed; `partial` — some rows failed; `failed` — no records produced. */
export type ImportStatus = "success" | "partial" | "failed";

export interface ImportResult<TRecord = ProductInput> {
  status: ImportStatus;
  /** Normalized records ready for the core to persist. */
  records: TRecord[];
  errors: Array<{ index?: number; sku?: string; message: string }>;
}

export interface ImporterDefinition<TPayload = unknown, TRecord = ProductInput> {
  /** Unique name for this importer, e.g. "csv-products". */
  name: string;
  description: string;
  /** Canonical entity these records belong to; selects the core service that persists them. */
  target: ImportTarget;
  /** File types this importer accepts — passed directly to the HTML <input accept> attribute.
   *  e.g. [".csv", "text/csv"] */
  accept: string[];
  run: (payload: TPayload) => Promise<ImportResult<TRecord>>;
}
