// ── Catalog: products & prices ─────────────────────────────────────────────────

export type ProductImportRow = {
  sku: string;
  name: string;
  description: string;
  priceNet: number;
  priceGross: number;
  vatRate: number;
  currency: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  source: ProductSource;
  prices: ProductPrice[];
};

export type ProductSource = "manual" | "import" | string;

export type ProductPrice = {
  id: string;
  productId: string;
  currency: string;
  net: number;
  gross: number;
  vatRate: number;
  source: string;
};

// ── Customers ──────────────────────────────────────────────────────────────────

export type CustomerSource = "manual" | "import" | string;

export type Customer = {
  id: string;
  name: string;
  source: CustomerSource;
};

// ── Requests (customer inquiries) ──────────────────────────────────────────────

export type RequestSource = "manual" | "chat" | "email" | string;

export type CustomerRequest = {
  id: string;
  customerId: string | null;
  rawText: string;
  source: RequestSource;
};

// ── Offers ─────────────────────────────────────────────────────────────────────

export type OfferStatus = "draft" | "accepted" | "rejected";

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
  unmatched: string[];
  items: OfferItem[];
  createdAt: string;
  updatedAt: string;
  /** Resolved customer name when available, for display purposes. */
  customerName?: string | null;
  /** Resolved raw request text when available, for display purposes. */
  clientRequest?: string | null;
  createdBy?: { id: string; name: string } | null;
  updatedBy?: { id: string; name: string } | null;
};

// ── Offer revisions (snapshots) ────────────────────────────────────────────────

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
  unmatched: string[];
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

// ── Workflow status (UI metadata, unrelated to schema) ─────────────────────────

export type WorkflowStatus = "planned" | "mocked" | "ready";

export type WorkflowStep = {
  id: string;
  title: string;
  owner: "customer" | "system" | "sales";
  status: WorkflowStatus;
  description: string;
};

// ── Demo fixtures ──────────────────────────────────────────────────────────────

export const demoCustomer: Customer = {
  id: "customer-demo-001",
  name: "Demo customer",
  source: "manual",
};

export const demoProducts: Product[] = [
  {
    id: "solar-panel-430",
    sku: "SOLAR-430",
    name: "Solar Panel 430 W",
    description: "High-efficiency roof panel for small commercial installations.",
    source: "manual",
    prices: [
      {
        id: "price-solar-panel-430",
        productId: "solar-panel-430",
        currency: "PLN",
        net: 510,
        gross: 627.3,
        vatRate: 23,
        source: "manual",
      },
    ],
  },
  {
    id: "hybrid-inverter-8kw",
    sku: "INV-8KW",
    name: "Hybrid Inverter 8 kW",
    description: "Hybrid inverter prepared for battery storage and grid fallback.",
    source: "manual",
    prices: [
      {
        id: "price-hybrid-inverter-8kw",
        productId: "hybrid-inverter-8kw",
        currency: "PLN",
        net: 6800,
        gross: 8364,
        vatRate: 23,
        source: "manual",
      },
    ],
  },
  {
    id: "battery-storage-12kwh",
    sku: "BAT-12KWH",
    name: "Battery Storage 12 kWh",
    description: "Modular storage unit for load shifting and backup scenarios.",
    source: "manual",
    prices: [
      {
        id: "price-battery-storage-12kwh",
        productId: "battery-storage-12kwh",
        currency: "PLN",
        net: 14800,
        gross: 18204,
        vatRate: 23,
        source: "manual",
      },
    ],
  },
  {
    id: "energy-monitor-pro",
    sku: "MON-PRO",
    name: "Energy Monitor Pro",
    description: "Metering and reporting module for customer-facing energy dashboards.",
    source: "manual",
    prices: [
      {
        id: "price-energy-monitor-pro",
        productId: "energy-monitor-pro",
        currency: "PLN",
        net: 1250,
        gross: 1537.5,
        vatRate: 23,
        source: "manual",
      },
    ],
  },
];

export const demoRequest: CustomerRequest = {
  id: "request-demo-001",
  customerId: demoCustomer.id,
  rawText:
    "We need a photovoltaic setup for a small office. Please include battery storage and monitoring.",
  source: "manual",
};

const demoItemsBase: Array<{
  productId: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  rationale: string;
  matchScore: number;
}> = [
  {
    productId: "solar-panel-430",
    quantity: 24,
    unitPriceNet: 510,
    vatRate: 23,
    rationale: "Covers the base photovoltaic requirement for a small office roof.",
    matchScore: 0.94,
  },
  {
    productId: "hybrid-inverter-8kw",
    quantity: 1,
    unitPriceNet: 6800,
    vatRate: 23,
    rationale: "Supports photovoltaic generation and future storage expansion.",
    matchScore: 0.82,
  },
  {
    productId: "battery-storage-12kwh",
    quantity: 1,
    unitPriceNet: 14800,
    vatRate: 23,
    rationale: "Adds backup and load shifting capacity requested by the customer.",
    matchScore: 0.91,
  },
  {
    productId: "energy-monitor-pro",
    quantity: 1,
    unitPriceNet: 1250,
    vatRate: 23,
    rationale: "Provides reporting for consumption and production monitoring.",
    matchScore: 0.96,
  },
];

export const demoOffer: Offer = {
  id: "offer-demo-001",
  customerId: demoCustomer.id,
  requestId: demoRequest.id,
  userId: null,
  name: "Demo photovoltaic offer",
  status: "draft",
  currency: "PLN",
  discountPercent: 0,
  discountAmount: 0,
  notes: [
    "Availability must be checked before the offer is sent.",
    "Sales review should confirm roof size, installation region, and final quantities.",
  ],
  unmatched: [],
  customerName: demoCustomer.name,
  clientRequest: demoRequest.rawText,
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
  items: demoItemsBase.map((it, idx) => {
    const product = demoProducts.find((p) => p.id === it.productId);
    const unitGross = it.unitPriceNet * (1 + it.vatRate / 100);
    return {
      productId: it.productId,
      name: product?.name ?? "",
      description: product?.description ?? "",
      quantity: it.quantity,
      unitPriceNet: it.unitPriceNet,
      vatRate: it.vatRate,
      unitGrossPrice: unitGross,
      totalNet: it.quantity * it.unitPriceNet,
      totalGross: it.quantity * unitGross,
      requestItem: "",
      rationale: it.rationale,
      matchSource: "semantic" as MatchSource,
      matchScore: it.matchScore,
      position: idx,
      product: product
        ? { id: product.id, sku: product.sku, name: product.name, description: product.description }
        : null,
    };
  }),
};

export const workflowSteps: WorkflowStep[] = [
  {
    id: "request-intake",
    title: "Customer request",
    owner: "customer",
    status: "mocked",
    description: "Raw request text is captured in the system.",
  },
  {
    id: "requirement-extraction",
    title: "Requirement extraction",
    owner: "system",
    status: "mocked",
    description: "The request is reduced to needs, constraints, and missing details.",
  },
  {
    id: "product-matching",
    title: "Product matching",
    owner: "system",
    status: "planned",
    description: "Products are ranked by fit, availability, and replacement options.",
  },
  {
    id: "offer-generation",
    title: "Draft offer",
    owner: "system",
    status: "mocked",
    description: "A draft offer is generated from the matched products.",
  },
  {
    id: "sales-review",
    title: "Sales review",
    owner: "sales",
    status: "planned",
    description: "A salesperson edits, validates, and accepts the final offer.",
  },
];
