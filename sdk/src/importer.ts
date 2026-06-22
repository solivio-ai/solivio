/**
 * Importers are input-surface capabilities a module can expose.
 * They are pure transformation functions: raw payload in, normalized records out.
 * The core receives the records and handles persistence, deduplication, and indexing.
 *
 * Importers are generic over the entity they produce. The core routes records
 * by target and owns persistence, deduplication, and indexing.
 */

import type { CustomerInput, OfferImportInput, ProductInput } from "./entities/index.ts";

/** Canonical entity an importer produces. The core routes records by target. */
export type ImportTarget = "product" | "customer" | "offer" | "knowledge-base";

/** `success` — all rows parsed; `partial` — some rows failed; `failed` — no records produced. */
export type ImportStatus = "success" | "partial" | "failed";

export interface ImportRowError {
  index?: number;
  /** Product importers can attach the source SKU for easier troubleshooting. */
  sku?: string;
  /** Customer importers can attach the parsed name for easier troubleshooting. */
  name?: string;
  message: string;
}

export interface ImportResult<TRecord = unknown> {
  status: ImportStatus;
  /** Normalized records ready for the core to persist. */
  records: TRecord[];
  errors: ImportRowError[];
}

export interface ImporterDefinition<TPayload = unknown, TRecord = unknown> {
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

export type AnyImporterDefinition = ImporterDefinition<unknown, unknown>;
export type ProductImporterDefinition = ImporterDefinition<unknown, ProductInput>;
export type CustomerImporterDefinition = ImporterDefinition<unknown, CustomerInput>;
export type OfferImporterDefinition = ImporterDefinition<unknown, OfferImportInput>;
