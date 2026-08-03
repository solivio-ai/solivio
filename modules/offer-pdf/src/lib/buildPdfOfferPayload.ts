import type { Offer } from "@solivio/domain";

import type { PdfOfferRequest } from "./schema";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildPdfOfferPayload(offer: Offer): PdfOfferRequest {
  const issueDate = new Date();

  return {
    offer: {
      number: `OFR-${offer.id.slice(0, 8).toUpperCase()}`,
      issueDate: toIsoDate(issueDate),
      validUntil: toIsoDate(addDays(issueDate, 14)),
      currency: offer.currency,
      discountPercent: offer.discountPercent,
    },
    seller: {
      name: "Nordfield Systems Sp. z o.o.",
      address: "ul. Przemyslowa 12, 00-001 Warszawa",
      nip: "525-000-00-00",
      contact: "handlowy@sprzedawca.example.com",
    },
    buyer: {
      name: offer.customerName?.trim() || "Customer",
      address: "ul. Klienta 7, 00-950 Warszawa",
      nip: "521-000-00-00",
      contact: "zakupy@klient.example.com",
    },
    items: offer.items.map((item) => ({
      sku: item.product?.sku,
      name: item.name || item.productId || "Item",
      description: item.description,
      quantity: item.quantity,
      unit: "szt.",
      unitPriceNet: item.unitPriceNet,
      vatRate: item.vatRate / 100,
    })),
    terms: {},
  };
}
