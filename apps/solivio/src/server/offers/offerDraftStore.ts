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
      unitPriceNet?: number;
      currency?: Offer["items"][number]["currency"];
    }>;
  }
) {
  const offer = getOfferDraft(id);
  if (!offer) return null;

  const itemUpdates = new Map(update.items?.map((item) => [item.productId, item]) ?? []);
  const nextOffer: Offer = {
    ...offer,
    status: update.status ?? offer.status,
    items: offer.items.map((item) => {
      const itemUpdate = itemUpdates.get(item.productId);
      if (!itemUpdate) return item;

      return {
        ...item,
        quantity: itemUpdate.quantity ?? item.quantity,
        unitPriceNet: itemUpdate.unitPriceNet ?? item.unitPriceNet,
        currency: itemUpdate.currency ?? item.currency
      };
    })
  };

  offerDrafts.set(id, nextOffer);
  return nextOffer;
}
