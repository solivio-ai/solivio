// Type-side wiring for dependsOn modules (erased at runtime).

import type { Offer } from "@solivio/domain";
import type {} from "@solivio/module-catalog/services.ts";
import type {} from "@solivio/module-customers/services.ts";
import type {
  BulkAddResult,
  OfferDeleteResult,
  OfferLineItemInput,
  OfferMutationResult,
  Services,
} from "@solivio/sdk";

import { getOfferDraft } from "./server/offerDraftStore.ts";
import {
  addProductToOffer,
  bulkAddProductsToOffer,
  getOffer,
  removeOfferLineItem,
  updateOfferLineItem,
} from "./server/offerService.ts";

/**
 * The offers module's public API: offer reads for cross-module consumers
 * (offer-chat context) and the line-item mutations exposed to agent tools.
 */
export interface OffersService {
  getOffer(id: string): Promise<Offer | null>;
  /** In-memory draft fallback used while a generated offer is unsaved. */
  getDraft(offerId: string): Offer | null;
  addProduct(offerId: string, item: OfferLineItemInput): Promise<OfferMutationResult>;
  updateLineItem(
    offerId: string,
    offerProductId: string,
    quantity: number,
  ): Promise<OfferMutationResult>;
  removeLineItem(offerId: string, offerProductId: string): Promise<OfferDeleteResult>;
  bulkAddProducts(offerId: string, items: OfferLineItemInput[]): Promise<BulkAddResult>;
}

declare module "@solivio/sdk" {
  interface Services {
    offers: OffersService;
  }
}

function createOffersService(): OffersService {
  return {
    getOffer: (id) => getOffer(id),
    getDraft: (offerId) => getOfferDraft(offerId),
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
    bulkAddProducts: (offerId, items) => bulkAddProductsToOffer(offerId, items),
  };
}

export const services = {
  offers: (_deps: Services) => createOffersService(),
};
