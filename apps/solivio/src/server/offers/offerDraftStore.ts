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
    name?: string;
    customerName?: string | null;
    clientRequest?: string | null;
    items?: Array<{
      productId: string;
      quantity?: number;
      rationale?: string;
      requestItem?: string;
      confidence?: number;
      product?: Offer["items"][number]["product"];
    }>;
    unmatched?: string[];
    discountPercent?: number;
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
            product: itemUpdate.product
          };
        }

        return {
          ...existingItem,
          quantity: itemUpdate.quantity ?? existingItem.quantity,
          rationale: itemUpdate.rationale ?? existingItem.rationale,
          requestItem: itemUpdate.requestItem ?? existingItem.requestItem,
          confidence: itemUpdate.confidence ?? existingItem.confidence,
          product: itemUpdate.product ?? existingItem.product
        };
      })
    : offer.items;

  const nextOffer: Offer = {
    ...offer,
    status: update.status ?? offer.status,
    name: update.name ?? offer.name,
    customerName:
      update.customerName !== undefined
        ? (update.customerName ?? undefined)
        : offer.customerName,
    clientRequest:
      update.clientRequest !== undefined
        ? (update.clientRequest ?? undefined)
        : offer.clientRequest,
    unmatched: update.unmatched ?? offer.unmatched,
    discountPercent: update.discountPercent ?? offer.discountPercent,
    items: nextItems
  };

  offerDrafts.set(id, nextOffer);
  return nextOffer;
}
