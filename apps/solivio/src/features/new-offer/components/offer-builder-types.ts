export type DraftLine = {
  offerProductId?: string;
  productId: string;
  sku?: string;
  name: string;
  description?: string;
  manufacturer?: string;
  availability?: string;
  source?: string;
  quantity: number;
  requestItem?: string;
  unitPrice: number;
  currency: string;
  rationale: string;
};

export type SaveState = "idle" | "saving" | "saved" | "error";

export const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("pl-PL", {
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
