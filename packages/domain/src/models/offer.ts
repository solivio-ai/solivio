export const OFFER_STATUS = {
  DRAFT: "draft",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  IMPORTED: "imported",
} as const;

export type OfferStatus = (typeof OFFER_STATUS)[keyof typeof OFFER_STATUS];

export type MatchSource = "exact" | "semantic" | "manual";

export type OfferItem = {
  id?: string;
  offerId?: string;
  productId: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  unitGrossPrice: number;
  totalNet: number;
  totalGross: number;
  requestItem: string;
  rationale: string;
  matchSource: MatchSource | null;
  matchScore: number | null;
  position: number;
  product?: {
    id: string;
    sku?: string;
    name: string;
    description?: string;
  } | null;
};

export type Offer = {
  id: string;
  customerId: string | null;
  requestId: string | null;
  userId: string | null;
  name: string;
  status: OfferStatus;
  currency: string;
  discountPercent: number;
  discountAmount: number;
  notes: string[];
  unmatched: OfferUnmatchedItem[];
  items: OfferItem[];
  createdAt: string;
  updatedAt: string;
  /** Resolved customer name when available, for display purposes. */
  customerName?: string | null;
  /** Resolved raw request text when available, for display purposes. */
  clientRequest?: string | null;
  /** Resolved display name of the user referenced by userId, when available. */
  userName?: string | null;
};

export type OfferUnmatchedItem = {
  id: string;
  item: string;
  reason: string;
  position?: number;
};

/** Input shape before persistence (agent / server post-processing). */
export type OfferUnmatchedItemInput = {
  item: string;
  reason: string;
};
