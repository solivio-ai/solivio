import type { ZodObject, ZodType } from "zod";
import { z } from "zod";

import { pdfOfferRequestSchema } from "../../features/offer-pdf/lib/schema";

export type ApiMethod = "delete" | "get" | "patch" | "post";

export type ApiContentContract = Record<string, { schema?: ZodType }>;

export type ApiResponseContract = {
  content?: ApiContentContract;
  description: string;
  schema?: ZodType;
};

export type ApiRequestBodyContract = {
  description: string;
  required?: boolean;
  schema: ZodType;
};

export type ApiContract = {
  description?: string;
  method: ApiMethod;
  operationId: string;
  path: string;
  requestParams?: ZodObject;
  requestQuery?: ZodObject;
  requestBody?: ApiRequestBodyContract;
  responses: Record<number, ApiResponseContract>;
  requiresAuth?: boolean;
  summary: string;
  tags: string[];
};

export const apiTags = [
  {
    name: "Auth",
    description: "Better Auth session and identity routes.",
  },
  {
    name: "System",
    description: "Operational status and readiness checks.",
  },
  {
    name: "Products",
    description: "Product candidate data used by matching.",
  },
  {
    name: "Requests",
    description: "Customer request intake and requirement extraction.",
  },
  {
    name: "Offers",
    description: "Draft offer generation boundaries.",
  },
  {
    name: "Chat",
    description: "AI chat streams and persisted offer review conversations.",
  },
  {
    name: "Documents",
    description: "PDF offer rendering endpoints.",
  },
] as const;

export const availabilitySchema = z
  .enum(["available", "limited", "unavailable"])
  .meta({ id: "Availability" });

export const currencySchema = z.enum(["PLN", "EUR"]).meta({ id: "Currency" });

export const productSchema = z
  .object({
    id: z.string().meta({ examples: ["solar-panel-430"] }),
    name: z.string().meta({ examples: ["Solar Panel 430 W"] }),
    category: z.string().meta({ examples: ["photovoltaics"] }),
    availability: availabilitySchema,
    priceNet: z.number().nonnegative(),
    currency: currencySchema,
    tags: z.array(z.string()),
    summary: z.string(),
  })
  .strict()
  .meta({
    id: "Product",
    description: "A product candidate that can be matched into an offer.",
  });

export const productsResponseSchema = z
  .object({
    products: z.array(productSchema),
  })
  .strict()
  .meta({ id: "ProductsResponse" });

export const productSearchRequestSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1)
      .meta({
        examples: ["Need a battery-ready photovoltaic setup for a small office."],
      }),
    limit: z.number().int().positive().max(10).optional(),
  })
  .strict()
  .meta({
    id: "ProductSearchRequest",
    description: "Prompt used for semantic product matching.",
  });

export const productSearchMatchSchema = z
  .object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
    description: z.string(),
    manufacturer: z.string(),
    nameSimilarity: z.number().min(-1).max(1),
    descriptionSimilarity: z.number().min(-1).max(1),
    similarity: z.number().min(-1).max(1),
  })
  .strict()
  .meta({
    id: "ProductSearchMatch",
    description: "A database product matched semantically against the prompt.",
  });

export const productSearchResponseSchema = z
  .object({
    prompt: z.string(),
    answer: z.string(),
    products: z.array(productSearchMatchSchema),
  })
  .strict()
  .meta({
    id: "ProductSearchResponse",
    description: "Semantic product matches plus an agent summary.",
  });

export const customerRequestSourceSchema = z
  .enum(["manual", "chat", "email"])
  .meta({ id: "CustomerRequestSource" });

export const customerRequestSchema = z
  .object({
    id: z.string().meta({ examples: ["request-demo-001"] }),
    customerName: z.string().meta({ examples: ["Demo customer"] }),
    source: customerRequestSourceSchema,
    text: z.string(),
    requirements: z.array(z.string()),
  })
  .strict()
  .meta({
    id: "CustomerRequest",
    description: "Raw customer request text plus extracted requirements.",
  });

export const createCustomerRequestRequestSchema = z
  .object({
    customerName: z.string().optional(),
    customerText: z.string().optional(),
  })
  .strict()
  .meta({
    id: "CreateCustomerRequestRequest",
    description: "Draft request input accepted by the mocked intake boundary.",
  });

export const customerRequestResponseSchema = z
  .object({
    request: customerRequestSchema,
  })
  .strict()
  .meta({ id: "CustomerRequestResponse" });

export const offerStatusSchema = z.enum(["draft", "accepted"]).meta({ id: "OfferStatus" });

export const offerItemProductSchema = z
  .object({
    id: z.string(),
    sku: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    manufacturer: z.string().optional(),
    availability: availabilitySchema.optional(),
    priceNet: z.number().nonnegative().optional(),
    currency: currencySchema.optional(),
    matchScore: z.number().min(-1).max(1).optional(),
    source: z.enum(["demo", "database", "semantic-search"]),
  })
  .strict()
  .meta({
    id: "OfferItemProduct",
    description: "Product snapshot used to render an offer line without frontend fixture lookup.",
  });

export const offerItemSchema = z
  .object({
    offerProductId: z.string().optional(),
    productId: z.string(),
    productName: z.string().optional(),
    productSku: z.string().optional(),
    quantity: z.number().int().positive(),
    requestItem: z.string().optional(),
    rationale: z.string(),
    confidence: z.number().min(0).max(100).optional(),
    unitPriceNet: z.number().nonnegative().optional(),
    currency: currencySchema.optional(),
    product: offerItemProductSchema.optional(),
  })
  .meta({
    id: "OfferItem",
    description: "A product line item included in an offer.",
  });

export const createOfferRequestSchema = z
  .object({
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

export const offerSchema = z
  .object({
    id: z.string().meta({ examples: ["offer-demo-001"] }),
    requestId: z.string(),
    name: z.string().optional(),
    customerName: z.string().nullable().optional(),
    clientRequest: z.string().nullable().optional(),
    status: offerStatusSchema,
    generatedAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    items: z.array(offerItemSchema),
    notes: z.array(z.string()),
    unmatched: z.array(z.string()).optional(),
    discountPercent: z.number().min(0).max(100),
    createdBy: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
    updatedBy: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
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

export const offerRevisionSnapshotLineItemSchema = z
  .object({
    productId: z.string(),
    sku: z.string(),
    name: z.string(),
    requestItem: z.string(),
    quantity: z.number().int().positive(),
    unitPriceNet: z.number().nonnegative(),
    currency: z.string(),
    rationale: z.string(),
  })
  .strict()
  .meta({
    id: "OfferRevisionSnapshotLineItem",
    description: "Line item captured in an offer revision snapshot.",
  });

export const offerRevisionSnapshotSchema = z
  .object({
    name: z.string(),
    customerName: z.string().nullable(),
    clientRequest: z.string().nullable(),
    status: offerStatusSchema,
    notes: z.array(z.string()),
    unmatched: z.array(z.string()),
    discountPercent: z.number().min(0).max(100).default(0),
    lineItems: z.array(offerRevisionSnapshotLineItemSchema),
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

/** Product snapshot for update payloads — priceNet and currency are stripped to prevent price overwrites. */
const updateOfferItemProductSchema = offerItemProductSchema
  .omit({ priceNet: true, currency: true })
  .meta({
    id: "UpdateOfferItemProduct",
    description: "Product snapshot without pricing fields. Prices are read-only from the catalog.",
  });

export const updateOfferItemRequestSchema = z
  .object({
    productId: z.string(),
    quantity: z.number().int().positive().optional(),
    requestItem: z.string().optional(),
    rationale: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
    product: updateOfferItemProductSchema.optional(),
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
    customerName: z.string().nullable().optional(),
    clientRequest: z.string().nullable().optional(),
    status: offerStatusSchema.optional(),
    items: z.array(updateOfferItemRequestSchema).optional(),
    unmatched: z.array(z.string()).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
  })
  .strict()
  .meta({
    id: "UpdateOfferRequest",
    description: "Review edits that can be applied to a generated offer draft.",
  });

export const databaseStatusSchema = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("not-configured") }).strict(),
    z
      .object({
        status: z.literal("reachable"),
        source: z.enum(["env", "development-default"]),
        serverVersion: z.string(),
        vectorVersion: z.string(),
      })
      .strict(),
    z
      .object({
        status: z.literal("unreachable"),
        message: z.string(),
      })
      .strict(),
  ])
  .meta({
    id: "DatabaseStatus",
    description: "Database readiness information returned by the health endpoint.",
  });

export const healthResponseSchema = z
  .object({
    app: z.literal("solivio"),
    status: z.literal("ok"),
    database: databaseStatusSchema,
    timestamp: z.string().datetime(),
  })
  .strict()
  .meta({ id: "HealthResponse" });

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        issues: z.array(z.string()).optional(),
      })
      .strict(),
  })
  .strict()
  .meta({
    id: "ErrorResponse",
    description: "Standard API error payload.",
  });

export const unauthorizedResponseSchema = z
  .object({
    error: z.string(),
  })
  .strict()
  .meta({
    id: "UnauthorizedResponse",
    description: "Returned when no valid Better Auth session is present.",
  });

export const plainErrorResponseSchema = z
  .object({
    error: z.string(),
  })
  .strict()
  .meta({
    id: "PlainErrorResponse",
    description: "Legacy plain string error payload.",
  });

export const authPathParamsSchema = z
  .object({
    authPath: z.string(),
  })
  .strict()
  .meta({
    id: "AuthPathParams",
    description: "Catch-all path segment delegated to Better Auth.",
  });

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

export const offerRevisionPathParamsSchema = z
  .object({
    offerId: z.string(),
    revisionId: z.string(),
  })
  .strict()
  .meta({ id: "OfferRevisionPathParams" });

export const offerChatMessagesPathParamsSchema = z
  .object({
    offerId: z.string(),
    threadId: z.string(),
  })
  .strict()
  .meta({ id: "OfferChatMessagesPathParams" });

export const offerPdfQuerySchema = z
  .object({
    download: z.enum(["1"]).optional(),
  })
  .strict()
  .meta({
    id: "OfferPdfQuery",
    description: "Set download=1 to return the PDF as an attachment.",
  });

export const embeddingModelIdSchema = z
  .enum(["text-embedding-3-large", "text-embedding-3-small"])
  .meta({ id: "EmbeddingModelId" });

export const embeddingModelSchema = z
  .object({
    id: embeddingModelIdSchema,
    label: z.string(),
    dimensions: z.number().int().positive(),
  })
  .strict()
  .meta({
    id: "EmbeddingModel",
    description: "Embedding model that can be selected for product import.",
  });

export const embeddingModelsResponseSchema = z
  .object({
    models: z.array(embeddingModelSchema),
  })
  .strict()
  .meta({ id: "EmbeddingModelsResponse" });

export const productTextSearchFieldSchema = z
  .enum(["sku", "name", "description", "manufacturer"])
  .meta({ id: "ProductTextSearchField" });

export const productTextSearchRequestSchema = z
  .object({
    query: z.string().trim().min(1),
    limit: z.number().int().positive().max(20).optional(),
    offset: z.number().int().min(0).optional(),
    searchFields: z.array(productTextSearchFieldSchema).min(1).optional(),
  })
  .strict()
  .meta({
    id: "ProductTextSearchRequest",
    description: "Keyword product search request.",
  });

export const productTextSearchMatchSchema = z
  .object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
    description: z.string(),
    manufacturer: z.string(),
  })
  .strict()
  .meta({
    id: "ProductTextSearchMatch",
    description: "Database product matched by keyword search.",
  });

export const productTextSearchResponseSchema = z
  .object({
    products: z.array(productTextSearchMatchSchema),
    totalCount: z.number().int().nonnegative(),
  })
  .strict()
  .meta({ id: "ProductTextSearchResponse" });

export const productImportRowSchema = z
  .object({
    sku: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    manufacturer: z.string().min(1),
    priceNet: z.number().nonnegative(),
    priceGross: z.number().nonnegative(),
    vatRate: z.number().min(0),
    currency: z.string().min(1),
  })
  .strict()
  .meta({
    id: "ProductImportRow",
    description: "Catalog product row accepted by the import endpoint.",
  });

export const productImportRequestSchema = z
  .object({
    products: z.array(productImportRowSchema).min(1),
    model: embeddingModelIdSchema.optional(),
  })
  .strict()
  .meta({
    id: "ProductImportRequest",
    description: "Products to upsert and embed.",
  });

export const productImportResponseSchema = z
  .object({
    count: z.number().int().nonnegative(),
  })
  .strict()
  .meta({ id: "ProductImportResponse" });

export const createdOfferLineItemSchema = z
  .object({
    offerProductId: z.string(),
    productId: z.string(),
    productName: z.string(),
    productSku: z.string(),
    productDescription: z.string(),
    productManufacturer: z.string(),
    requestItem: z.string(),
    quantity: z.number().int().positive(),
    unitPriceNet: z.number().nonnegative(),
    currency: z.string(),
    rationale: z.string(),
  })
  .strict()
  .meta({
    id: "CreatedOfferLineItem",
    description: "Persisted offer line returned immediately after offer creation.",
  });

export const createdOfferSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    customerName: z.string().nullable(),
    clientRequest: z.string().nullable(),
    status: offerStatusSchema,
    generatedAt: z.string().datetime(),
    items: z.array(createdOfferLineItemSchema),
    unmatched: z.array(z.string()),
    notes: z.array(z.string()),
  })
  .strict()
  .meta({
    id: "CreatedOffer",
    description: "Persisted offer shape returned by creation endpoints.",
  });

export const createdOfferResponseSchema = z
  .object({
    offer: createdOfferSchema,
  })
  .strict()
  .meta({ id: "CreatedOfferResponse" });

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
    items: z.array(quickOfferItemSchema).min(1),
  })
  .strict()
  .meta({ id: "QuickOfferRequest" });

export const offerChatThreadSchema = z
  .object({
    id: z.string(),
    offerId: z.string(),
    title: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .meta({
    id: "OfferChatThread",
    description: "Persisted chat thread attached to an offer.",
  });

export const offerChatThreadsResponseSchema = z
  .object({
    threads: z.array(offerChatThreadSchema),
  })
  .strict()
  .meta({ id: "OfferChatThreadsResponse" });

export const createOfferChatThreadRequestSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
  })
  .strict()
  .meta({ id: "CreateOfferChatThreadRequest" });

export const offerChatThreadResponseSchema = z
  .object({
    thread: offerChatThreadSchema,
  })
  .strict()
  .meta({ id: "OfferChatThreadResponse" });

export const uiMessagePartSchema = z.record(z.string(), z.unknown()).meta({
  id: "UiMessagePart",
  description: "AI SDK UI message part.",
});

export const uiMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.string(),
    parts: z.array(uiMessagePartSchema),
  })
  .passthrough()
  .meta({
    id: "UiMessage",
    description: "AI SDK UI message.",
  });

export const offerChatMessagesResponseSchema = z
  .object({
    messages: z.array(uiMessageSchema),
  })
  .strict()
  .meta({ id: "OfferChatMessagesResponse" });

export const chatRequestSchema = z
  .object({
    messages: z.array(uiMessageSchema),
    offerId: z.string().optional(),
    threadId: z.string().optional(),
  })
  .strict()
  .meta({
    id: "ChatRequest",
    description:
      "AI SDK chat request. offerId and threadId must be provided together when persisting messages.",
  });

export const offerPdfRequestSchema = pdfOfferRequestSchema.meta({
  id: "OfferPdfRequest",
  description: "Offer payload rendered into a PDF document.",
});

const authenticatedResponses = <T extends Record<number, ApiResponseContract>>(responses: T) => ({
  ...responses,
  401: {
    description: "No valid Better Auth session was present.",
    schema: unauthorizedResponseSchema,
  },
});

const pdfResponse = (description: string): ApiResponseContract => ({
  description,
  content: {
    "application/pdf": {},
  },
});

const sseResponse = (description: string): ApiResponseContract => ({
  description,
  content: {
    "text/event-stream": {},
  },
});

export const apiContracts = [
  {
    method: "get",
    path: "/api/auth/{authPath}",
    operationId: "handleBetterAuthGet",
    summary: "Handle Better Auth GET route",
    description:
      "Catch-all route delegated to Better Auth for session reads, provider callbacks, and other auth GET flows.",
    tags: ["Auth"],
    requestParams: authPathParamsSchema,
    responses: {
      200: {
        description: "Better Auth handled the GET request.",
      },
      400: {
        description: "Better Auth rejected the request.",
      },
    },
  },
  {
    method: "post",
    path: "/api/auth/{authPath}",
    operationId: "handleBetterAuthPost",
    summary: "Handle Better Auth POST route",
    description:
      "Catch-all route delegated to Better Auth for sign-in, sign-up, sign-out, and other auth POST flows.",
    tags: ["Auth"],
    requestParams: authPathParamsSchema,
    responses: {
      200: {
        description: "Better Auth handled the POST request.",
      },
      400: {
        description: "Better Auth rejected the request.",
      },
    },
  },
  {
    method: "get",
    path: "/api/health",
    operationId: "getHealth",
    summary: "Check service health",
    tags: ["System"],
    responses: {
      200: {
        description: "The app is reachable and reports database readiness.",
        schema: healthResponseSchema,
      },
    },
  },
  {
    method: "get",
    path: "/api/embedding-models",
    operationId: "listEmbeddingModels",
    summary: "List embedding models",
    tags: ["Products"],
    responses: {
      200: {
        description: "Embedding models available for product import.",
        schema: embeddingModelsResponseSchema,
      },
    },
  },
  {
    method: "get",
    path: "/api/products",
    operationId: "listProducts",
    summary: "List product candidates",
    tags: ["Products"],
    requiresAuth: true,
    responses: authenticatedResponses({
      200: {
        description: "Mocked product candidates available for request matching.",
        schema: productsResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/products/search",
    operationId: "searchProducts",
    summary: "Search products from a prompt",
    tags: ["Products"],
    requiresAuth: true,
    requestBody: {
      description: "Prompt used for semantic product matching against embedded products.",
      required: true,
      schema: productSearchRequestSchema,
    },
    responses: authenticatedResponses({
      200: {
        description: "Semantic matches from the products table with an AI summary.",
        schema: productSearchResponseSchema,
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema,
      },
      500: {
        description: "The server could not complete the semantic product search.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/products/text-search",
    operationId: "searchProductsByText",
    summary: "Search products by keyword",
    tags: ["Products"],
    requiresAuth: true,
    requestBody: {
      description: "Keyword search query, pagination, and optional searchable fields.",
      required: true,
      schema: productTextSearchRequestSchema,
    },
    responses: authenticatedResponses({
      200: {
        description: "Matching products and total result count.",
        schema: productTextSearchResponseSchema,
      },
      400: {
        description: "The request body did not include a valid query.",
        schema: errorResponseSchema,
      },
      500: {
        description: "The server could not complete the text search.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/products/import",
    operationId: "importProducts",
    summary: "Import products with embeddings",
    tags: ["Products"],
    requestBody: {
      description: "Catalog rows to upsert and embed.",
      required: true,
      schema: productImportRequestSchema,
    },
    responses: {
      200: {
        description: "Number of products imported.",
        schema: productImportResponseSchema,
      },
      400: {
        description: "The import body was invalid.",
        schema: plainErrorResponseSchema,
      },
      500: {
        description: "The import failed while embedding or writing products.",
        schema: plainErrorResponseSchema,
      },
    },
  },
  {
    method: "get",
    path: "/api/requests",
    operationId: "getDemoRequest",
    summary: "Get the demo customer request",
    tags: ["Requests"],
    requiresAuth: true,
    responses: authenticatedResponses({
      200: {
        description: "The current mocked request and extracted requirements.",
        schema: customerRequestResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/requests",
    operationId: "createCustomerRequest",
    summary: "Create a draft customer request",
    tags: ["Requests"],
    requiresAuth: true,
    requestBody: {
      description: "Raw customer request text for mocked requirement extraction.",
      required: false,
      schema: createCustomerRequestRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "A mocked request object with extracted requirements.",
        schema: customerRequestResponseSchema,
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers",
    operationId: "getDemoOffer",
    summary: "Get the demo draft offer",
    tags: ["Offers"],
    requiresAuth: true,
    responses: authenticatedResponses({
      200: {
        description: "The current mocked draft offer.",
        schema: offerResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers",
    operationId: "generateOffer",
    summary: "Generate a draft offer",
    description: "AI-assisted offer generation backed by the products table.",
    tags: ["Offers"],
    requiresAuth: true,
    requestBody: {
      description: "Customer name and request text for the new offer.",
      required: false,
      schema: createOfferRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "A newly persisted draft offer.",
        schema: createdOfferResponseSchema,
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}",
    operationId: "getOffer",
    summary: "Get an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "The requested offer.",
        schema: offerResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "patch",
    path: "/api/offers/{offerId}",
    operationId: "updateOffer",
    summary: "Update an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Review edits to apply to the offer.",
      required: true,
      schema: updateOfferRequestSchema,
    },
    responses: authenticatedResponses({
      200: {
        description: "The updated offer.",
        schema: offerResponseSchema,
      },
      400: {
        description: "The request body did not match the offer update contract.",
        schema: errorResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "delete",
    path: "/api/offers/{offerId}",
    operationId: "deleteOffer",
    summary: "Delete an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      204: {
        description: "The offer was deleted.",
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/revisions",
    operationId: "listOfferRevisions",
    summary: "List offer revisions",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "Revision history for the offer.",
        schema: offerRevisionsResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/{offerId}/revisions",
    operationId: "saveOfferRevision",
    summary: "Save an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      201: {
        description: "The saved offer revision.",
        schema: offerRevisionResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/revisions/{revisionId}",
    operationId: "getOfferRevision",
    summary: "Get an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerRevisionPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "The requested offer revision.",
        schema: offerRevisionResponseSchema,
      },
      404: {
        description: "The revision was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/{offerId}/revisions/{revisionId}/restore",
    operationId: "restoreOfferRevision",
    summary: "Restore an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerRevisionPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "The restored offer and the revision created by the restore action.",
        schema: restoreOfferRevisionResponseSchema,
      },
      404: {
        description: "The revision was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/quick",
    operationId: "createQuickOffer",
    summary: "Create a quick offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestBody: {
      description: "Manual product selections to turn into a draft offer.",
      required: true,
      schema: quickOfferRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "A newly persisted manual offer.",
        schema: createdOfferResponseSchema,
      },
      400: {
        description: "No product selections were provided.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/{offerId}/products",
    operationId: "addOfferProduct",
    summary: "Add a product to an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Product and quantity to add as an offer line.",
      required: true,
      schema: addOfferProductRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "The offer after adding the line item.",
        schema: offerResponseSchema,
      },
      400: {
        description: "The request body was invalid.",
        schema: errorResponseSchema,
      },
      404: {
        description: "The offer or product was not found.",
        schema: errorResponseSchema,
      },
      409: {
        description: "The product is already in the offer.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "patch",
    path: "/api/offers/{offerId}/products/{offerProductId}",
    operationId: "updateOfferProduct",
    summary: "Update an offer line item",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerProductPathParamsSchema,
    requestBody: {
      description: "New quantity for the offer line item.",
      required: true,
      schema: updateOfferLineItemRequestSchema,
    },
    responses: authenticatedResponses({
      200: {
        description: "The offer after updating the line item.",
        schema: offerResponseSchema,
      },
      400: {
        description: "The request body was invalid.",
        schema: errorResponseSchema,
      },
      404: {
        description: "The offer or line item was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "delete",
    path: "/api/offers/{offerId}/products/{offerProductId}",
    operationId: "deleteOfferProduct",
    summary: "Remove an offer line item",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerProductPathParamsSchema,
    responses: authenticatedResponses({
      204: {
        description: "The line item was removed.",
      },
      404: {
        description: "The offer or line item was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/chat",
    operationId: "streamChat",
    summary: "Stream assistant chat",
    tags: ["Chat"],
    requiresAuth: true,
    requestBody: {
      description: "AI SDK messages plus optional persistent offer chat identifiers.",
      required: true,
      schema: chatRequestSchema,
    },
    responses: authenticatedResponses({
      200: sseResponse("Server-sent event stream of AI SDK UI message chunks."),
      400: {
        description: "Only one of offerId or threadId was provided.",
        schema: errorResponseSchema,
      },
      404: {
        description: "The persistent chat thread was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/chat/threads",
    operationId: "listOfferChatThreads",
    summary: "List offer chat threads",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "Chat threads attached to the offer.",
        schema: offerChatThreadsResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/{offerId}/chat/threads",
    operationId: "createOfferChatThread",
    summary: "Create an offer chat thread",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Optional chat thread title.",
      required: false,
      schema: createOfferChatThreadRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "The created chat thread.",
        schema: offerChatThreadResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/chat/threads/{threadId}/messages",
    operationId: "listOfferChatMessages",
    summary: "List offer chat messages",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerChatMessagesPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "Messages in the offer chat thread.",
        schema: offerChatMessagesResponseSchema,
      },
      404: {
        description: "The chat thread was not found for the offer.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/pdf",
    operationId: "getSampleOfferPdf",
    summary: "Render sample offer PDF",
    tags: ["Documents"],
    responses: {
      200: pdfResponse("A sample offer PDF."),
    },
  },
  {
    method: "post",
    path: "/api/offers/pdf",
    operationId: "renderOfferPdf",
    summary: "Render offer PDF from payload",
    tags: ["Documents"],
    requestBody: {
      description: "Offer document payload to render.",
      required: true,
      schema: offerPdfRequestSchema,
    },
    responses: {
      200: pdfResponse("The rendered offer PDF."),
      400: {
        description: "The PDF payload was invalid.",
        schema: errorResponseSchema,
      },
    },
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/pdf",
    operationId: "getOfferPdf",
    summary: "Render persisted offer PDF",
    tags: ["Documents"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestQuery: offerPdfQuerySchema,
    responses: authenticatedResponses({
      200: pdfResponse("The rendered PDF for the persisted offer."),
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
] as const satisfies readonly ApiContract[];
