// Type-side wiring for dependsOn modules (erased at runtime).

import type { Offer } from "@solivio/domain";
import type {} from "@solivio/module-catalog/services.ts";
import type {} from "@solivio/module-customers/services.ts";
import type { Services } from "@solivio/sdk";

import type { GeneratedOffer } from "./ai/agents/offerGenerationAgent.ts";
import { generateOfferWithAgent } from "./ai/agents/offerGenerationAgent.ts";
import { getOfferDraft } from "./server/offerDraftStore.ts";
import type { PastOffer } from "./server/offerHistoryService.ts";
import { recentOffersForCustomer } from "./server/offerHistoryService.ts";
import {
  addProductToOffer,
  bulkAddProductsToOffer,
  getOffer,
  removeOfferLineItem,
  updateOfferLineItem,
} from "./server/offerService.ts";

/** Result of an offer mutation that returns the updated offer. */
export type OfferMutationResult =
  | { status: "ok"; offer: Offer }
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
  offer: Offer | null;
}

/**
 * The offers module's public API: offer reads for cross-module consumers
 * (offer-chat context) and the line-item mutations exposed to agent tools.
 */
export type { GeneratedOffer } from "./ai/agents/offerGenerationAgent.ts";
export type { PastOffer, PastOfferLineItem } from "./server/offerHistoryService.ts";

export interface OffersService {
  /**
   * Runs the offer-generation agent over a raw customer request and returns
   * the structured draft (matched items, unmatched fragments, notes) without
   * persisting anything.
   */
  generateOffer(input: {
    request: string;
    customerName?: string;
    customerId?: string | null;
  }): Promise<GeneratedOffer>;
  /** Recent accepted/imported offers for a customer (order history). */
  recentOffersForCustomer(input: { customerId: string; limit?: number }): Promise<PastOffer[]>;
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
    generateOffer: ({ request, customerName, customerId }) =>
      generateOfferWithAgent(request, customerName, customerId),
    getOffer: (id) => getOffer(id),
    recentOffersForCustomer: (input) => recentOffersForCustomer(input),
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
