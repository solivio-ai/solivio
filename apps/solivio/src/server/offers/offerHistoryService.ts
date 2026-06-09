import "server-only";

import type { OfferHistoryService, PastOffer } from "@solivio/sdk";

import { findRecentOffersByCustomer } from "./offerRepository";

export const offerHistoryService: OfferHistoryService = {
  async recentForCustomer({ customerId, limit = 10 }) {
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
  },
};
