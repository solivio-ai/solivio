export type ProductImportRow = {
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
};

export type WorkflowStatus = "planned" | "mocked" | "ready";

export type WorkflowStep = {
  id: string;
  title: string;
  owner: "customer" | "system" | "sales";
  status: WorkflowStatus;
  description: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  availability: "available" | "limited" | "unavailable";
  priceNet: number;
  currency: "PLN" | "EUR";
  tags: string[];
  summary: string;
};

export type CustomerRequest = {
  id: string;
  customerName: string;
  source: "manual" | "chat" | "email";
  text: string;
  requirements: string[];
};

export type OfferItem = {
  offerProductId?: string;
  productId: string;
  quantity: number;
  requestItem?: string;
  rationale: string;
  confidence?: number;
  unitPriceNet?: number;
  currency?: Product["currency"];
  product?: {
    id: string;
    sku?: string;
    name: string;
    description?: string;
    manufacturer?: string;
    availability?: Product["availability"];
    priceNet?: number;
    currency?: Product["currency"];
    matchScore?: number;
    source: "demo" | "database" | "semantic-search";
  };
};

export type OfferDebugFragment = {
  requestFragment: string;
  query: string;
  quantity: number;
  topMatches: { id: string; sku: string; name: string; similarity: number }[];
};

export type Offer = {
  id: string;
  requestId: string;
  customerName?: string;
  clientRequest?: string;
  status: "draft" | "accepted";
  generatedAt: string;
  items: OfferItem[];
  notes: string[];
  unmatched?: string[];
  debugFragments?: OfferDebugFragment[];
};

export const workflowSteps: WorkflowStep[] = [
  {
    id: "request-intake",
    title: "Customer request",
    owner: "customer",
    status: "mocked",
    description: "Raw request text is captured in the system."
  },
  {
    id: "requirement-extraction",
    title: "Requirement extraction",
    owner: "system",
    status: "mocked",
    description: "The request is reduced to needs, constraints, and missing details."
  },
  {
    id: "product-matching",
    title: "Product matching",
    owner: "system",
    status: "planned",
    description: "Products are ranked by fit, availability, and replacement options."
  },
  {
    id: "offer-generation",
    title: "Draft offer",
    owner: "system",
    status: "mocked",
    description: "A draft offer is generated from the matched products."
  },
  {
    id: "sales-review",
    title: "Sales review",
    owner: "sales",
    status: "planned",
    description: "A salesperson edits, validates, and accepts the final offer."
  }
];

export const demoProducts: Product[] = [
  {
    id: "solar-panel-430",
    name: "Solar Panel 430 W",
    category: "photovoltaics",
    availability: "available",
    priceNet: 510,
    currency: "PLN",
    tags: ["solar", "panel", "roof", "energy"],
    summary: "High-efficiency roof panel for small commercial installations."
  },
  {
    id: "hybrid-inverter-8kw",
    name: "Hybrid Inverter 8 kW",
    category: "inverters",
    availability: "limited",
    priceNet: 6800,
    currency: "PLN",
    tags: ["inverter", "hybrid", "storage", "energy"],
    summary: "Hybrid inverter prepared for battery storage and grid fallback."
  },
  {
    id: "battery-storage-12kwh",
    name: "Battery Storage 12 kWh",
    category: "storage",
    availability: "available",
    priceNet: 14800,
    currency: "PLN",
    tags: ["battery", "storage", "backup", "energy"],
    summary: "Modular storage unit for load shifting and backup scenarios."
  },
  {
    id: "energy-monitor-pro",
    name: "Energy Monitor Pro",
    category: "monitoring",
    availability: "available",
    priceNet: 1250,
    currency: "PLN",
    tags: ["monitoring", "metering", "dashboard", "energy"],
    summary: "Metering and reporting module for customer-facing energy dashboards."
  }
];

export const demoRequest: CustomerRequest = {
  id: "request-demo-001",
  customerName: "Demo customer",
  source: "manual",
  text: "We need a photovoltaic setup for a small office. Please include battery storage and monitoring.",
  requirements: [
    "small commercial installation",
    "photovoltaic panels",
    "battery storage",
    "energy monitoring"
  ]
};

export const demoOffer: Offer = {
  id: "offer-demo-001",
  requestId: demoRequest.id,
  customerName: demoRequest.customerName,
  clientRequest: demoRequest.text,
  status: "draft",
  generatedAt: "2026-04-28T00:00:00.000Z",
  items: [
    {
      productId: "solar-panel-430",
      quantity: 24,
      rationale: "Covers the base photovoltaic requirement for a small office roof.",
      confidence: 94,
      unitPriceNet: 510,
      currency: "PLN",
      product: {
        id: demoProducts[0].id,
        name: demoProducts[0].name,
        availability: demoProducts[0].availability,
        priceNet: demoProducts[0].priceNet,
        currency: demoProducts[0].currency,
        source: "demo"
      }
    },
    {
      productId: "hybrid-inverter-8kw",
      quantity: 1,
      rationale: "Supports photovoltaic generation and future storage expansion.",
      confidence: 82,
      unitPriceNet: 6800,
      currency: "PLN",
      product: {
        id: demoProducts[1].id,
        name: demoProducts[1].name,
        availability: demoProducts[1].availability,
        priceNet: demoProducts[1].priceNet,
        currency: demoProducts[1].currency,
        source: "demo"
      }
    },
    {
      productId: "battery-storage-12kwh",
      quantity: 1,
      rationale: "Adds backup and load shifting capacity requested by the customer.",
      confidence: 91,
      unitPriceNet: 14800,
      currency: "PLN",
      product: {
        id: demoProducts[2].id,
        name: demoProducts[2].name,
        availability: demoProducts[2].availability,
        priceNet: demoProducts[2].priceNet,
        currency: demoProducts[2].currency,
        source: "demo"
      }
    },
    {
      productId: "energy-monitor-pro",
      quantity: 1,
      rationale: "Provides reporting for consumption and production monitoring.",
      confidence: 96,
      unitPriceNet: 1250,
      currency: "PLN",
      product: {
        id: demoProducts[3].id,
        name: demoProducts[3].name,
        availability: demoProducts[3].availability,
        priceNet: demoProducts[3].priceNet,
        currency: demoProducts[3].currency,
        source: "demo"
      }
    }
  ],
  notes: [
    "Availability must be checked before the offer is sent.",
    "Sales review should confirm roof size, installation region, and final quantities."
  ]
};
