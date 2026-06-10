import "server-only";

import { findRecentOffersByCustomer } from "./offerRepository.ts";

export interface PastOfferLineItem {
  productId: string | null;
  sku: string | null;
  name: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  currency: string;
}

export interface PastOffer {
  offerId: string;
  name: string;
  status: string;
  createdAt: string;
  currency: string;
  lineItems: PastOfferLineItem[];
}

/** Recent accepted/imported offers for a customer, newest first. */
export async function recentOffersForCustomer({
  customerId,
  limit = 10,
}: {
  customerId: string;
  limit?: number;
}): Promise<PastOffer[]> {
  const rows = await findRecentOffersByCustomer(customerId, { limit });
  return rows.map(
    (row): PastOffer => ({
      offerId: row.id,
      name: row.name,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      currency: row.currency,
      lineItems: row.items.map((item) => ({
        productId: item.productId,
        sku: item.productSku,
        name: item.name,
        quantity: item.quantity,
        unitPriceNet: item.unitPriceNet,
        vatRate: item.vatRate,
        currency: row.currency,
      })),
    }),
  );
}
