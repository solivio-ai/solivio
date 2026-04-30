import type { PdfOfferRequest } from "../lib/schema";

export const sampleOffer: PdfOfferRequest = {
  offer: {
    number: "OF/2026/04/001",
    issueDate: "2026-04-28",
    validUntil: "2026-05-28",
    currency: "PLN",
    discountPercent: 5,
  },
  seller: {
    name: "Nordic Instalacje Sp. z o.o.",
    address: "ul. Kwiatowa 18, 60-175 Poznań",
    nip: "7822913046",
    contact: "oferty@nordicinstalacje.pl | +48 61 441 82 19",
  },
  buyer: {
    name: "Elektroinwest Sp. z o.o.",
    address: "ul. Przemysłowa 8, 30-001 Kraków",
    nip: "6762500123",
    contact: "zaopatrzenie@elektroinwest.pl",
  },
  items: [
    {
      sku: "IV-011-00001",
      name: "Czujnik ruchu PIR SCHNEIDER SE-0001Z 360° 6m",
      description: "Zasilanie 12 V, montaż natynkowy, IP54, zasięg 6 m, kąt 360°",
      quantity: 10,
      unit: "szt.",
      unitPriceNet: 89.35,
      vatRate: 0.23,
    },
    {
      sku: "IV-011-00002",
      name: "Czujnik PIR ORNO OR-0002D 90° 16m",
      description: "Zasilanie 230 V, montaż natynkowy, IP20, zasięg 16 m, kąt 90°",
      quantity: 5,
      unit: "szt.",
      unitPriceNet: 57.86,
      vatRate: 0.23,
    },
    {
      sku: "IV-011-00003",
      name: "Detektor ruchu F&F FF-0003D 180° 10m",
      description: "Zasilanie 230 V, montaż podtynkowy, IP65, zasięg 10 m, kąt 180°",
      quantity: 8,
      unit: "szt.",
      unitPriceNet: 58.22,
      vatRate: 0.23,
    },
    {
      sku: "IV-011-00005",
      name: "Czujnik PIR LEGRAND LG-0005X 120° 16m",
      description: "Zasilanie 230 V, montaż podtynkowy, IP65, zasięg 16 m, kąt 120°",
      quantity: 3,
      unit: "szt.",
      unitPriceNet: 83.92,
      vatRate: 0.23,
    },
  ],
  terms: {
    delivery: "14 dni roboczych od potwierdzenia zamówienia",
    payment: "Przelew 14 dni od daty wystawienia faktury VAT",
    notes: "Dostępność towaru potwierdzona na dzień wystawienia oferty. Ceny netto, waluta PLN.",
  },
};
