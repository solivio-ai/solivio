import "server-only";

import type { CoreServices, OfferService, ProductService } from "@solivio/sdk";
import { getService } from "@solivio/sdk/runtime";
import {
  addProductToOffer,
  bulkAddProductsToOffer,
  removeOfferLineItem,
  updateOfferLineItem,
} from "@/server/offers/offerService";

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
  async addProduct(offerId, item) {
    const result = await addProductToOffer(
      offerId,
      item.productId,
      item.quantity,
      item.requestItem,
      undefined,
      item.rationale,
    );
    if (result === null) return { status: "not_found" };
    if (result === "duplicate") return { status: "duplicate" };
    if (result === "locked") return { status: "locked" };
    return { status: "ok", offer: result };
  },
  async updateLineItem(offerId, offerProductId, quantity) {
    const result = await updateOfferLineItem(offerProductId, offerId, quantity);
    if (result === null) return { status: "not_found" };
    if (result === "locked") return { status: "locked" };
    return { status: "ok", offer: result };
  },
  async removeLineItem(offerId, offerProductId) {
    const result = await removeOfferLineItem(offerProductId, offerId);
    if (result === "locked") return { status: "locked" };
    if (!result) return { status: "not_found" };
    return { status: "ok" };
  },
  async bulkAddProducts(offerId, items) {
    return bulkAddProductsToOffer(offerId, items);
  },
};

export const coreServices: CoreServices = { products, offers };
