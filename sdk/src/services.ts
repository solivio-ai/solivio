/**
 * Canonical core services — the typed boundary modules use to read and request
 * changes to canonical state. Modules NEVER import app internals or touch the
 * database directly; everything canonical goes through these handles.
 *
 * The SDK declares these as interfaces only; the core supplies the
 * implementation and injects it via {@link ModuleContext.services}. These shapes
 * are the load-bearing part of the module contract.
 */
import type { OfferView, ProductInput, ProductMatch } from "./entities/index.ts";

export interface ProductSearchOptions {
  /** Max results to return. */
  limit?: number;
  /** Minimum similarity score in [0, 1] to include a match. */
  minSimilarity?: number;
}

export interface ProductService {
  /** Semantic catalog search. */
  search(query: string, opts?: ProductSearchOptions): Promise<ProductMatch[]>;
  /** Run several queries at once; returns matches keyed by the original query. */
  searchBatch(
    queries: string[],
    opts?: ProductSearchOptions,
  ): Promise<Record<string, ProductMatch[]>>;
  /**
   * Persist imported product records. The core owns dedup, embedding, and
   * pricing — importers return rows, they never write the database.
   */
  import(records: ProductInput[]): Promise<{ count: number }>;
}

/** Result of an offer mutation that returns the updated offer. */
export type OfferMutationResult =
  | { status: "ok"; offer: OfferView }
  | { status: "not_found" }
  | { status: "locked" }
  | { status: "duplicate" };

/** Result of an offer mutation with no returned offer. */
export type OfferDeleteResult = { status: "ok" } | { status: "not_found" } | { status: "locked" };

export interface OfferLineItemInput {
  productId: string;
  quantity: number;
  requestItem?: string;
  rationale?: string;
}

export interface BulkAddItemResult {
  productId: string;
  status: "added" | "duplicate" | "not_found" | "locked";
}

export interface BulkAddResult {
  results: BulkAddItemResult[];
  offer: OfferView | null;
}

export interface OfferService {
  addProduct(offerId: string, item: OfferLineItemInput): Promise<OfferMutationResult>;
  updateLineItem(
    offerId: string,
    offerProductId: string,
    quantity: number,
  ): Promise<OfferMutationResult>;
  removeLineItem(offerId: string, offerProductId: string): Promise<OfferDeleteResult>;
  bulkAddProducts(offerId: string, items: OfferLineItemInput[]): Promise<BulkAddResult>;
}

/**
 * The set of canonical service handles available on {@link ModuleContext}.
 * Grows with the pipeline; additive growth does not bump the ABI version.
 */
export interface CoreServices {
  products: ProductService;
  offers: OfferService;
}
