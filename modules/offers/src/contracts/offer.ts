import { z } from "zod";

import { OFFER_STATUS } from "@solivio/domain";
import { routeGroup } from "@solivio/sdk/contracts";

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
  .enum([OFFER_STATUS.DRAFT, OFFER_STATUS.ACCEPTED, OFFER_STATUS.REJECTED, OFFER_STATUS.IMPORTED])
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

export const offerUnmatchedItemInputSchema = z
  .object({
    item: z.string().min(1),
    reason: z.string(),
  })
  .strict()
  .meta({
    id: "OfferUnmatchedItemInput",
    description: "Unmatched fragment before persistence (no row id).",
  });

export const offerUnmatchedItemSchema = offerUnmatchedItemInputSchema
  .extend({
    id: z.uuid(),
    position: z.number().int().nonnegative().optional(),
  })
  .meta({
    id: "OfferUnmatchedItem",
    description: "Persisted unmatched request fragment. reason may be empty for legacy rows.",
  });

// ── Offer ──────────────────────────────────────────────────────────────────────

export const offerKbArticleSchema = z
  .object({
    articleId: z.string().uuid(),
    articleTitle: z.string(),
    spaceId: z.string().uuid(),
    spaceName: z.string(),
    relevance: z.string(),
  })
  .meta({
    id: "OfferKbArticle",
    description: "Knowledge base article referenced during offer generation.",
  });

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
    kbArticles: z.array(offerKbArticleSchema).optional().default([]),
    unmatched: z.array(offerUnmatchedItemSchema),
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
    status: z.enum(["draft", "accepted", "rejected"]).optional(),
    currency: z.string().optional(),
    items: z.array(updateOfferItemRequestSchema).optional(),
    unmatched: z.array(offerUnmatchedItemInputSchema).optional(),
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

// ── HTTP catalog (split so revision routes can be inserted between delete and `/quick`) ─

export const offerRoutesBeforeRevisions = [
  ...routeGroup({ tag: "Offers", requiresAuth: true }, [
    {
      method: "get",
      path: "/api/offers",
      operationId: "getDemoOffer",
      summary: "Get the demo draft offer",
      responses: {
        200: {
          description: "The current mocked draft offer.",
          schema: offerResponseSchema,
        },
      },
    },
    {
      method: "post",
      path: "/api/offers",
      operationId: "generateOffer",
      summary: "Generate a draft offer",
      description: "AI-assisted offer generation backed by the products table.",
      requestBody: {
        description: "Customer name and request text for the new offer.",
        required: false,
        schema: createOfferRequestSchema,
      },
      responses: {
        201: {
          description: "A newly persisted draft offer.",
          schema: createdOfferResponseSchema,
        },
        400: "The request body could not be parsed or validated.",
      },
    },
    {
      method: "get",
      path: "/api/offers/{offerId}",
      operationId: "getOffer",
      summary: "Get an offer",
      requestParams: offerPathParamsSchema,
      responses: {
        200: {
          description: "The requested offer.",
          schema: offerResponseSchema,
        },
        404: "The offer was not found.",
      },
    },
    {
      method: "patch",
      path: "/api/offers/{offerId}",
      operationId: "updateOffer",
      summary: "Update an offer",
      requestParams: offerPathParamsSchema,
      requestBody: {
        description: "Review edits to apply to the offer.",
        required: true,
        schema: updateOfferRequestSchema,
      },
      responses: {
        200: {
          description: "The updated offer.",
          schema: offerResponseSchema,
        },
        400: "The request body did not match the offer update contract.",
        404: "The offer was not found.",
      },
    },
    {
      method: "delete",
      path: "/api/offers/{offerId}",
      operationId: "deleteOffer",
      summary: "Delete an offer",
      requestParams: offerPathParamsSchema,
      responses: {
        204: {
          description: "The offer was deleted.",
        },
        404: "The offer was not found.",
      },
    },
  ]),
] as const satisfies readonly import("@solivio/sdk/contracts").ApiContract[];

export const offerRoutesAfterRevisions = [
  ...routeGroup({ tag: "Offers", requiresAuth: true }, [
    {
      method: "post",
      path: "/api/offers/quick",
      operationId: "createQuickOffer",
      summary: "Create a quick offer",
      requestBody: {
        description: "Manual product selections to turn into a draft offer.",
        required: true,
        schema: quickOfferRequestSchema,
      },
      responses: {
        201: {
          description: "A newly persisted manual offer.",
          schema: createdOfferResponseSchema,
        },
        400: "No product selections were provided.",
      },
    },
    {
      method: "post",
      path: "/api/offers/{offerId}/products",
      operationId: "addOfferProduct",
      summary: "Add a product to an offer",
      requestParams: offerPathParamsSchema,
      requestBody: {
        description: "Product and quantity to add as an offer line.",
        required: true,
        schema: addOfferProductRequestSchema,
      },
      responses: {
        201: {
          description: "The offer after adding the line item.",
          schema: offerResponseSchema,
        },
        400: "The request body was invalid.",
        404: "The offer or product was not found.",
        409: "The product is already in the offer.",
      },
    },
    {
      method: "patch",
      path: "/api/offers/{offerId}/products/{offerProductId}",
      operationId: "updateOfferProduct",
      summary: "Update an offer line item",
      requestParams: offerProductPathParamsSchema,
      requestBody: {
        description: "New quantity for the offer line item.",
        required: true,
        schema: updateOfferLineItemRequestSchema,
      },
      responses: {
        200: {
          description: "The offer after updating the line item.",
          schema: offerResponseSchema,
        },
        400: "The request body was invalid.",
        404: "The offer or line item was not found.",
      },
    },
    {
      method: "delete",
      path: "/api/offers/{offerId}/products/{offerProductId}",
      operationId: "deleteOfferProduct",
      summary: "Remove an offer line item",
      requestParams: offerProductPathParamsSchema,
      responses: {
        204: {
          description: "The line item was removed.",
        },
        404: "The offer or line item was not found.",
      },
    },
  ]),
] as const satisfies readonly import("@solivio/sdk/contracts").ApiContract[];

/** Offer CRUD and line-item routes (revision routes are inserted between the two halves in `routes.ts`). */
export const offerRoutes = [
  ...offerRoutesBeforeRevisions,
  ...offerRoutesAfterRevisions,
] as const satisfies readonly import("@solivio/sdk/contracts").ApiContract[];
