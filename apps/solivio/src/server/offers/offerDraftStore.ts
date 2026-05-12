import "server-only";

import type { Offer, OfferItem } from "@solivio/domain";
import { demoOffer } from "@solivio/domain";

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
    items?: Array<Partial<OfferItem> & { productId: string | null; name: string }>;
    unmatched?: string[];
    discountPercent?: number;
    discountAmount?: number;
  },
) {
  const offer = getOfferDraft(id);
  if (!offer) return null;

  const existingItems = new Map(
    offer.items.filter((i) => i.productId).map((item) => [item.productId!, item]),
  );

  const nextItems: OfferItem[] = update.items
    ? update.items.map((itemUpdate, index) => {
        const existing = itemUpdate.productId ? existingItems.get(itemUpdate.productId) : undefined;
        const base: OfferItem = existing ?? {
          productId: itemUpdate.productId,
          name: itemUpdate.name,
          description: itemUpdate.description ?? "",
          quantity: itemUpdate.quantity ?? 1,
          unitPriceNet: itemUpdate.unitPriceNet ?? 0,
          vatRate: itemUpdate.vatRate ?? 23,
          unitGrossPrice: itemUpdate.unitGrossPrice ?? 0,
          totalNet: itemUpdate.totalNet ?? 0,
          totalGross: itemUpdate.totalGross ?? 0,
          requestItem: itemUpdate.requestItem ?? "",
          rationale: itemUpdate.rationale ?? "Manually added",
          matchSource: itemUpdate.matchSource ?? "manual",
          matchScore: itemUpdate.matchScore ?? null,
          position: index,
          product: itemUpdate.product,
        };
        return {
          ...base,
          ...itemUpdate,
          position: index,
        };
      })
    : offer.items;

  const nextOffer: Offer = {
    ...offer,
    status: update.status ?? offer.status,
    name: update.name ?? offer.name,
    customerName:
      update.customerName !== undefined ? update.customerName : offer.customerName,
    clientRequest:
      update.clientRequest !== undefined ? update.clientRequest : offer.clientRequest,
    unmatched: update.unmatched ?? offer.unmatched,
    discountPercent: update.discountPercent ?? offer.discountPercent,
    discountAmount: update.discountAmount ?? offer.discountAmount,
    items: nextItems,
  };

  offerDrafts.set(id, nextOffer);
  return nextOffer;
}
