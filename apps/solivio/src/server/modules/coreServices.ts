import "server-only";

import type { CoreServices, OfferService, ProductService } from "@solivio/sdk";
import { getService } from "@solivio/sdk/runtime";

/**
 * Concrete implementation of the SDK's CoreServices contract over the app's
 * canonical services. This is the only place module-facing handles bind to app
 * internals — modules themselves see only the SDK interfaces. Product
 * operations delegate to the catalog module's service.
 */
const products: ProductService = {
  async search(query, opts) {
    return getService("catalog").searchByPrompt(query, {
      limit: opts?.limit,
      minSimilarity: opts?.minSimilarity,
    });
  },
  async searchBatch(queries, opts) {
    const map = await getService("catalog").searchBatch(queries, {
      limit: opts?.limit,
      minSimilarity: opts?.minSimilarity,
    });
    return Object.fromEntries(map);
  },
  async import(records) {
    return getService("catalog").importProducts(records);
  },
};

const offers: OfferService = {
  addProduct: (offerId, item) => getService("offers").addProduct(offerId, item),
  updateLineItem: (offerId, offerProductId, quantity) =>
    getService("offers").updateLineItem(offerId, offerProductId, quantity),
  removeLineItem: (offerId, offerProductId) =>
    getService("offers").removeLineItem(offerId, offerProductId),
  bulkAddProducts: (offerId, items) => getService("offers").bulkAddProducts(offerId, items),
};

export const coreServices: CoreServices = { products, offers };
