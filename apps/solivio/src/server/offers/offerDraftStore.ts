import "server-only";

import { demoOffer, type Offer } from "@solivio/domain";

type OfferStore = Map<string, Offer>;

const globalWithOffers = globalThis as typeof globalThis & {
  __solivioOfferDrafts?: OfferStore;
};

const offerDrafts = globalWithOffers.__solivioOfferDrafts ?? new Map<string, Offer>();
globalWithOffers.__solivioOfferDrafts = offerDrafts;

export function saveOfferDraft(offer: Offer) {
  offerDrafts.set(offer.id, offer);
  return offer;
}

export function getOfferDraft(id: string) {
  return offerDrafts.get(id) ?? (id === demoOffer.id ? demoOffer : null);
}

export function updateOfferDraft(
  id: string,
  update: {
    status?: Offer["status"];
    items?: Array<{
      productId: string;
      quantity?: number;
      rationale?: string;
      requestItem?: string;
      confidence?: number;
      unitPriceNet?: number;
      currency?: Offer["items"][number]["currency"];
      product?: Offer["items"][number]["product"];
    }>;
    unmatched?: string[];
  }
) {
  const offer = getOfferDraft(id);
  if (!offer) return null;

  const existingItems = new Map(offer.items.map((item) => [item.productId, item]));
  const nextItems: Offer["items"] = update.items
    ? update.items.map((itemUpdate) => {
        const existingItem = existingItems.get(itemUpdate.productId);

        if (!existingItem) {
          return {
            productId: itemUpdate.productId,
            quantity: itemUpdate.quantity ?? 1,
            rationale: itemUpdate.rationale ?? "Manually added",
            requestItem: itemUpdate.requestItem,
            confidence: itemUpdate.confidence,
            unitPriceNet: itemUpdate.unitPriceNet,
            currency: itemUpdate.currency,
            product: itemUpdate.product
          };
        }

        return {
          ...existingItem,
          quantity: itemUpdate.quantity ?? existingItem.quantity,
          rationale: itemUpdate.rationale ?? existingItem.rationale,
          requestItem: itemUpdate.requestItem ?? existingItem.requestItem,
          confidence: itemUpdate.confidence ?? existingItem.confidence,
          unitPriceNet: itemUpdate.unitPriceNet ?? existingItem.unitPriceNet,
          currency: itemUpdate.currency ?? existingItem.currency,
          product: itemUpdate.product ?? existingItem.product
        };
      })
    : offer.items;

  const nextOffer: Offer = {
    ...offer,
    status: update.status ?? offer.status,
    unmatched: update.unmatched ?? offer.unmatched,
    items: nextItems
  };

  offerDrafts.set(id, nextOffer);
  return nextOffer;
}
