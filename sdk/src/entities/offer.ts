/**
 * Read DTO for a working offer line item, as returned by `services.offers.*`.
 * A structural subset of the core's canonical offer item — the core may return
 * a richer object at runtime; modules should depend only on these fields.
 */
export interface OfferItemView {
  id?: string;
  productId: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  totalNet: number;
  totalGross: number;
  requestItem: string;
  rationale: string;
  position: number;
}

/**
 * Read DTO for a working (pre-acceptance) offer, as returned by
 * `services.offers.*`. Distinct from {@link OfferSnapshot}, which is the
 * immutable accepted snapshot passed to renderers. Structural subset of the
 * core's canonical offer.
 */
export interface OfferView {
  id: string;
  name: string;
  status: string;
  currency: string;
  discountPercent: number;
  notes: string[];
  unmatched: string[];
  items: OfferItemView[];
  createdAt: string;
  updatedAt: string;
  customerName?: string | null;
  clientRequest?: string | null;
}

export interface OfferSnapshotLineItem {
  productId: string;
  sku: string;
  name: string;
  /** Product description, useful for detailed renderers. */
  description?: string;
  requestItem: string | null;
  quantity: number;
  /** Unit of measure, e.g. "pcs", "szt.". */
  unit?: string;
  unitPriceNet: number;
  /** VAT rate as a decimal percentage, e.g. 23 for 23%. */
  vatRate: number;
  currency: string;
  rationale: string;
  position: number;
}

/**
 * Canonical accepted offer snapshot — the shape the core passes to every renderer.
 * Immutable: created at acceptance time, never mutated.
 */
export interface OfferSnapshot {
  id: string;
  /** Human-readable offer number, e.g. "OFR-ABC12345". */
  number: string;
  name: string;
  customerName: string | null;
  clientRequest: string | null;
  discountPercent: number;
  currency: string;
  lineItems: OfferSnapshotLineItem[];
  notes: string[];
  /** ISO date string, e.g. "2026-05-11". */
  issueDate: string;
  /** ISO date string. Defaults to issueDate + 14 days if omitted. */
  validUntil?: string;
}
