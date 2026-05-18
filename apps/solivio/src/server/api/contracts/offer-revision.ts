import { z } from "zod";

import { routeGroup } from "./common";
import { matchSourceSchema, offerPathParamsSchema, offerSchema, offerStatusSchema } from "./offer";

export const offerRevisionPathParamsSchema = z
  .object({
    offerId: z.string(),
    revisionId: z.string(),
  })
  .strict()
  .meta({ id: "OfferRevisionPathParams" });

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

export const offerRevisionRoutes = [
  ...routeGroup({ tag: "Offers", requiresAuth: true }, [
    {
      method: "get",
      path: "/api/offers/{offerId}/revisions",
      operationId: "listOfferRevisions",
      summary: "List offer revisions",
      requestParams: offerPathParamsSchema,
      responses: {
        200: {
          description: "Revision history for the offer.",
          schema: offerRevisionsResponseSchema,
        },
      },
    },
    {
      method: "post",
      path: "/api/offers/{offerId}/revisions",
      operationId: "saveOfferRevision",
      summary: "Save an offer revision",
      requestParams: offerPathParamsSchema,
      responses: {
        201: {
          description: "The saved offer revision.",
          schema: offerRevisionResponseSchema,
        },
        404: "The offer was not found.",
      },
    },
    {
      method: "get",
      path: "/api/offers/{offerId}/revisions/{revisionId}",
      operationId: "getOfferRevision",
      summary: "Get an offer revision",
      requestParams: offerRevisionPathParamsSchema,
      responses: {
        200: {
          description: "The requested offer revision.",
          schema: offerRevisionResponseSchema,
        },
        404: "The revision was not found.",
      },
    },
    {
      method: "post",
      path: "/api/offers/{offerId}/revisions/{revisionId}/restore",
      operationId: "restoreOfferRevision",
      summary: "Restore an offer revision",
      requestParams: offerRevisionPathParamsSchema,
      responses: {
        200: {
          description: "The restored offer and the revision created by the restore action.",
          schema: restoreOfferRevisionResponseSchema,
        },
        404: "The revision was not found.",
      },
    },
  ]),
] as const satisfies readonly import("./common").ApiContract[];
