import { z } from "zod";

import { matchSourceSchema, offerSchema, offerStatusSchema } from "./offer";

export const offerRevisionSnapshotItemSchema = z
  .object({
    productId: z.string().nullable(),
    sku: z.string().nullable(),
    name: z.string(),
    description: z.string(),
    requestItem: z.string(),
    quantity: z.number().positive(),
    unitPriceNet: z.number().nonnegative(),
    vatRate: z.number().nonnegative(),
    unitGrossPrice: z.number().nonnegative(),
    totalNet: z.number().nonnegative(),
    totalGross: z.number().nonnegative(),
    rationale: z.string(),
    matchSource: matchSourceSchema.nullable(),
    matchScore: z.number().nullable(),
    position: z.number().int().nonnegative(),
  })
  .strict()
  .meta({
    id: "OfferRevisionSnapshotItem",
    description: "Line item captured in an offer revision snapshot.",
  });

export const offerRevisionSnapshotSchema = z
  .object({
    name: z.string(),
    customerId: z.string().nullable(),
    customerName: z.string().nullable(),
    requestId: z.string().nullable(),
    clientRequest: z.string().nullable(),
    status: offerStatusSchema,
    currency: z.string(),
    discountPercent: z.number().min(0).max(100).default(0),
    discountAmount: z.number().nonnegative().default(0),
    notes: z.array(z.string()),
    unmatched: z.array(z.string()),
    items: z.array(offerRevisionSnapshotItemSchema),
  })
  .strict()
  .meta({
    id: "OfferRevisionSnapshot",
    description: "Stored offer state that can be restored later.",
  });

export const offerRevisionUserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .strict()
  .meta({ id: "OfferRevisionUser" });

export const offerRevisionSchema = z
  .object({
    id: z.string(),
    offerId: z.string(),
    revisionNumber: z.number().int().positive(),
    snapshot: offerRevisionSnapshotSchema.optional(),
    createdBy: offerRevisionUserSchema.nullable(),
    createdAt: z.string().datetime(),
    acceptedAt: z.string().datetime().nullable().optional(),
  })
  .strict()
  .meta({
    id: "OfferRevision",
    description: "Saved revision metadata and optional snapshot for an offer.",
  });

export const offerRevisionResponseSchema = z
  .object({
    revision: offerRevisionSchema,
  })
  .strict()
  .meta({ id: "OfferRevisionResponse" });

export const offerRevisionsResponseSchema = z
  .object({
    revisions: z.array(offerRevisionSchema),
  })
  .strict()
  .meta({ id: "OfferRevisionsResponse" });

export const restoreOfferRevisionResponseSchema = z
  .object({
    offer: offerSchema.nullable(),
    revision: offerRevisionSchema,
  })
  .strict()
  .meta({ id: "RestoreOfferRevisionResponse" });
