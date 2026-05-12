export interface OfferSnapshotLineItem {
  productId: string;
  sku: string;
  name: string;
  /** Product description, useful for detailed renderers. */
  description?: string;
  requestItem: string;
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
