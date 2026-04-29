import type { Offer } from "@solivio/domain";

export type DraftLine = {
  offerProductId?: string;
  productId: string;
  sku?: string;
  name: string;
  description?: string;
  manufacturer?: string;
  availability?: NonNullable<Offer["items"][number]["product"]>["availability"];
  source?: NonNullable<Offer["items"][number]["product"]>["source"];
  quantity: number;
  requestItem?: string;
  unitPrice: number;
  currency: "PLN" | "EUR";
  rationale: string;
};

export type SaveState = "idle" | "saving" | "saved" | "error";

export const formatCurrency = (amount: number, currency: DraftLine["currency"]) =>
  new Intl.NumberFormat("pl-PL", {
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
