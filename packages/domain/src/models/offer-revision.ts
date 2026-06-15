import type { MatchSource, OfferStatus, OfferUnmatchedItemInput } from "./offer";

export type OfferRevisionSnapshotItem = {
  productId: string | null;
  sku: string | null;
  name: string;
  description: string;
  requestItem: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  unitGrossPrice: number;
  totalNet: number;
  totalGross: number;
  rationale: string;
  matchSource: MatchSource | null;
  matchScore: number | null;
  position: number;
};

export type OfferRevisionSnapshot = {
  name: string;
  customerId: string | null;
  customerName: string | null;
  requestId: string | null;
  clientRequest: string | null;
  status: OfferStatus;
  currency: string;
  discountPercent: number;
  discountAmount: number;
  notes: string[];
  unmatched: OfferUnmatchedItemInput[];
  items: OfferRevisionSnapshotItem[];
};

export type OfferRevision = {
  id: string;
  offerId: string;
  revisionNumber: number;
  snapshot?: OfferRevisionSnapshot;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  acceptedAt: string | null;
};
