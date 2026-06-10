// Type-side: this module's own event declarations.

import type { ProductInput, Services } from "@solivio/sdk";
import { emitEvent } from "@solivio/sdk/runtime";

import type {} from "./events.ts";
import { importProductsWithEmbeddings } from "./server/productEmbeddingService.ts";
import type { ProductPriceRow } from "./server/productPriceRepository.ts";
import { findActivePricesForProducts } from "./server/productPriceRepository.ts";
import type { ProductSummaryRow } from "./server/productRepository.ts";
import { getProductsByIds } from "./server/productRepository.ts";
import type { ProductSearchMatch } from "./server/productSearchService.ts";
import {
  lookupProductsBySkus,
  searchProductsBatch,
  searchProductsByPrompt,
} from "./server/productSearchService.ts";

export type { ProductPriceRow, ProductSearchMatch, ProductSummaryRow };

export interface CatalogSearchOptions {
  /** Max results to return (clamped module-side). */
  limit?: number;
  /** Minimum similarity score in [0, 1] to include a match. */
  minSimilarity?: number;
}

/**
 * The catalog module's public API. Other modules and the host reach products
 * and prices exclusively through this service (`getService("catalog")`); the
 * tables and repositories are module-private. Cross-module rows reference
 * products by id only.
 */
export interface CatalogService {
  /** Semantic (embedding) catalog search for a single prompt. */
  searchByPrompt(query: string, opts?: CatalogSearchOptions): Promise<ProductSearchMatch[]>;
  /** Run several semantic queries at once; matches keyed by the original query. */
  searchBatch(
    queries: string[],
    opts?: CatalogSearchOptions,
  ): Promise<Map<string, ProductSearchMatch[]>>;
  /** Exact SKU lookup; matches keyed by SKU with similarity pinned to 1. */
  lookupBySkus(skus: string[]): Promise<Map<string, ProductSearchMatch>>;
  /** Embed and upsert imported product records (products + prices). */
  importProducts(records: ProductInput[]): Promise<{ count: number }>;
  /** Existence/display lookup for id-only cross-module references. */
  getProductsByIds(ids: string[]): Promise<ProductSummaryRow[]>;
  /** Active prices for the given products in a currency, keyed by product id. */
  getActivePricesForProducts(
    ids: string[],
    currency: string,
  ): Promise<Map<string, ProductPriceRow>>;
}

declare module "@solivio/sdk" {
  interface Services {
    catalog: CatalogService;
  }
}

function createCatalogService(): CatalogService {
  return {
    searchByPrompt: (query, opts) => searchProductsByPrompt(query, opts),
    searchBatch: (queries, opts) => searchProductsBatch(queries, opts),
    lookupBySkus: (skus) => lookupProductsBySkus(skus),
    importProducts: async (records) => {
      const result = await importProductsWithEmbeddings(records);
      await emitEvent("catalog.products.imported", { count: result.count });
      return result;
    },
    getProductsByIds: (ids) => getProductsByIds(ids),
    getActivePricesForProducts: (ids, currency) => findActivePricesForProducts(ids, currency),
  };
}

export const services = {
  catalog: (_deps: Services) => createCatalogService(),
};
