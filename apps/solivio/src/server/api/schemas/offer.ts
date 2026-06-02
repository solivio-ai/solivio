import { z } from "zod";

export const offerPathParamsSchema = z
  .object({
    offerId: z.string(),
  })
  .strict()
  .meta({ id: "OfferPathParams" });

export const offerProductPathParamsSchema = z
  .object({
    offerId: z.string(),
    offerProductId: z.string(),
  })
  .strict()
  .meta({ id: "OfferProductPathParams" });

// ── Enums ──────────────────────────────────────────────────────────────────────

export const offerStatusSchema = z
  .enum(["draft", "accepted", "rejected"])
  .meta({ id: "OfferStatus" });

export const matchSourceSchema = z
  .enum(["exact", "semantic", "manual"])
  .meta({ id: "MatchSource" });

// ── Line item ──────────────────────────────────────────────────────────────────

export const offerItemProductSchema = z
  .object({
    id: z.string(),
    sku: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
  })
  .strict()
  .meta({
    id: "OfferItemProduct",
    description: "Product snapshot used to render an offer line without frontend fixture lookup.",
  });

export const offerItemSchema = z
  .object({
    id: z.string().optional(),
    offerId: z.string().optional(),
    productId: z.string().nullable(),
    name: z.string(),
    description: z.string(),
    quantity: z.number().positive(),
    unitPriceNet: z.number().nonnegative(),
    vatRate: z.number().nonnegative(),
    unitGrossPrice: z.number().nonnegative(),
    totalNet: z.number().nonnegative(),
    totalGross: z.number().nonnegative(),
    requestItem: z.string(),
    rationale: z.string(),
    matchSource: matchSourceSchema.nullable(),
    matchScore: z.number().nullable(),
    position: z.number().int().nonnegative(),
    product: offerItemProductSchema.nullable().optional(),
  })
  .meta({
    id: "OfferItem",
    description: "A product line item included in an offer.",
  });

// ── Offer ──────────────────────────────────────────────────────────────────────

export const offerSchema = z
  .object({
    id: z.string().meta({ examples: ["offer-demo-001"] }),
    customerId: z.string().nullable(),
    requestId: z.string().nullable(),
    userId: z.string().nullable(),
    name: z.string(),
    status: offerStatusSchema,
    currency: z.string(),
    discountPercent: z.number().min(0).max(100),
    discountAmount: z.number().nonnegative(),
    notes: z.array(z.string()),
    unmatched: z.array(z.string()),
    items: z.array(offerItemSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    customerName: z.string().nullable().optional(),
    clientRequest: z.string().nullable().optional(),
    userName: z.string().nullable().optional(),
  })
  .meta({
    id: "Offer",
    description: "A draft or accepted offer for a customer request.",
  });

export const offerResponseSchema = z
  .object({
    offer: offerSchema,
  })
  .strict()
  .meta({ id: "OfferResponse" });

// ── Create / update payloads ───────────────────────────────────────────────────

export const createOfferRequestSchema = z
  .object({
    customerId: z.string().uuid().nullable().optional(),
    customerName: z.string().optional(),
    clientRequest: z.string().min(1),
  })
  .strict()
  .meta({
    id: "CreateOfferRequest",
    description: "Input accepted when generating a new draft offer.",
  });

export const addOfferProductRequestSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    requestItem: z.string().optional(),
  })
  .strict()
  .meta({
    id: "AddOfferProductRequest",
    description: "Product and quantity to add as a line item to an offer.",
  });

export const updateOfferLineItemRequestSchema = z
  .object({
    quantity: z.number().int().positive(),
  })
  .strict()
  .meta({
    id: "UpdateOfferLineItemRequest",
    description: "New quantity for an existing offer line item.",
  });

export const updateOfferItemRequestSchema = z
  .object({
    id: z.string().optional(),
    productId: z.string().nullable().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().positive().optional(),
    requestItem: z.string().optional(),
    rationale: z.string().optional(),
    matchSource: matchSourceSchema.nullable().optional(),
    matchScore: z.number().nullable().optional(),
  })
  .strict()
  .meta({
    id: "UpdateOfferItemRequest",
    description:
      "Editable fields for an offer item. Unit price and currency are read-only from the product catalog.",
  });

export const updateOfferRequestSchema = z
  .object({
    name: z.string().min(1).optional(),
    customerId: z.string().uuid().nullable().optional(),
    customerName: z.string().nullable().optional(),
    status: offerStatusSchema.optional(),
    currency: z.string().optional(),
    items: z.array(updateOfferItemRequestSchema).optional(),
    unmatched: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    discountAmount: z.number().nonnegative().optional(),
  })
  .strict()
  .meta({
    id: "UpdateOfferRequest",
    description: "Review edits that can be applied to a generated offer draft.",
  });

// ── Persisted shape (creation response) ────────────────────────────────────────

export const createdOfferLineItemSchema = offerItemSchema.meta({
  id: "CreatedOfferLineItem",
  description: "Persisted offer line returned immediately after offer creation.",
});

export const createdOfferSchema = offerSchema.meta({
  id: "CreatedOffer",
  description: "Persisted offer shape returned by creation endpoints.",
});

export const createdOfferResponseSchema = z
  .object({
    offer: createdOfferSchema,
  })
  .strict()
  .meta({ id: "CreatedOfferResponse" });

// ── Quick offer ────────────────────────────────────────────────────────────────

export const quickOfferItemSchema = z
  .object({
    productId: z.string(),
    productName: z.string().optional(),
    productSku: z.string().optional(),
    quantity: z.number().int().positive(),
  })
  .strict()
  .meta({
    id: "QuickOfferItem",
    description: "Manual product selection used to create a quick offer.",
  });

export const quickOfferRequestSchema = z
  .object({
    customerId: z.string().uuid().nullable().optional(),
    customerName: z.string().optional(),
    items: z.array(quickOfferItemSchema).min(1),
  })
  .strict()
  .meta({ id: "QuickOfferRequest" });
