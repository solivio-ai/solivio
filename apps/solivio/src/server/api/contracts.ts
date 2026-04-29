import { z, type ZodType } from "zod";

export type ApiMethod = "get" | "post";

export type ApiResponseContract = {
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
  requestBody?: ApiRequestBodyContract;
  responses: Record<number, ApiResponseContract>;
  summary: string;
  tags: string[];
};

export const apiTags = [
  {
    name: "System",
    description: "Operational status and readiness checks."
  },
  {
    name: "Products",
    description: "Product candidate data used by matching."
  },
  {
    name: "Requests",
    description: "Customer request intake and requirement extraction."
  },
  {
    name: "Offers",
    description: "Draft offer generation boundaries."
  }
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
    summary: z.string()
  })
  .strict()
  .meta({
    id: "Product",
    description: "A product candidate that can be matched into an offer."
  });

export const productsResponseSchema = z
  .object({
    products: z.array(productSchema)
  })
  .strict()
  .meta({ id: "ProductsResponse" });

export const productSearchRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).meta({
      examples: ["Need a battery-ready photovoltaic setup for a small office."]
    }),
    limit: z.number().int().positive().max(10).optional()
  })
  .strict()
  .meta({
    id: "ProductSearchRequest",
    description: "Prompt used for semantic product matching."
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
    similarity: z.number().min(-1).max(1)
  })
  .strict()
  .meta({
    id: "ProductSearchMatch",
    description: "A database product matched semantically against the prompt."
  });

export const productSearchResponseSchema = z
  .object({
    prompt: z.string(),
    answer: z.string(),
    products: z.array(productSearchMatchSchema)
  })
  .strict()
  .meta({
    id: "ProductSearchResponse",
    description: "Semantic product matches plus an agent summary."
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
    requirements: z.array(z.string())
  })
  .strict()
  .meta({
    id: "CustomerRequest",
    description: "Raw customer request text plus extracted requirements."
  });

export const createCustomerRequestRequestSchema = z
  .object({
    customerName: z.string().optional(),
    customerText: z.string().optional()
  })
  .strict()
  .meta({
    id: "CreateCustomerRequestRequest",
    description: "Draft request input accepted by the mocked intake boundary."
  });

export const customerRequestResponseSchema = z
  .object({
    request: customerRequestSchema
  })
  .strict()
  .meta({ id: "CustomerRequestResponse" });

export const offerStatusSchema = z.enum(["draft", "reviewed", "accepted"]).meta({ id: "OfferStatus" });

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
    source: z.enum(["demo", "database", "semantic-search"])
  })
  .strict()
  .meta({
    id: "OfferItemProduct",
    description: "Product snapshot used to render an offer line without frontend fixture lookup."
  });

export const offerItemSchema = z
  .object({
    productId: z.string(),
    productName: z.string().optional(),
    productSku: z.string().optional(),
    quantity: z.number().int().positive(),
    rationale: z.string(),
    confidence: z.number().min(0).max(100).optional(),
    unitPriceNet: z.number().nonnegative().optional(),
    currency: currencySchema.optional(),
    product: offerItemProductSchema.optional()
  })
  .meta({
    id: "OfferItem",
    description: "A product line item included in an offer."
  });

export const createOfferRequestSchema = z
  .object({
    customerName: z.string().optional(),
    clientRequest: z.string().min(1)
  })
  .strict()
  .meta({
    id: "CreateOfferRequest",
    description: "Input accepted when generating a new draft offer."
  });

export const offerSchema = z
  .object({
    id: z.string().meta({ examples: ["offer-demo-001"] }),
    requestId: z.string(),
    customerName: z.string().nullable().optional(),
    clientRequest: z.string().nullable().optional(),
    status: offerStatusSchema,
    generatedAt: z.string().datetime(),
    items: z.array(offerItemSchema),
    notes: z.array(z.string())
  })
  .meta({
    id: "Offer",
    description: "A draft, reviewed, or accepted offer for a customer request."
  });

export const offerResponseSchema = z
  .object({
    offer: offerSchema
  })
  .strict()
  .meta({ id: "OfferResponse" });

export const updateOfferItemRequestSchema = z
  .object({
    productId: z.string(),
    quantity: z.number().int().positive().optional(),
    rationale: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
    unitPriceNet: z.number().nonnegative().optional(),
    currency: currencySchema.optional(),
    product: offerItemProductSchema.optional()
  })
  .strict()
  .meta({
    id: "UpdateOfferItemRequest",
    description: "Editable fields for a reviewed offer item."
  });

export const updateOfferRequestSchema = z
  .object({
    status: offerStatusSchema.optional(),
    items: z.array(updateOfferItemRequestSchema).optional()
  })
  .strict()
  .meta({
    id: "UpdateOfferRequest",
    description: "Review edits that can be applied to a generated offer draft."
  });

export const databaseStatusSchema = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("not-configured") }).strict(),
    z
      .object({
        status: z.literal("reachable"),
        source: z.enum(["env", "development-default"]),
        serverVersion: z.string(),
        vectorVersion: z.string()
      })
      .strict(),
    z
      .object({
        status: z.literal("unreachable"),
        message: z.string()
      })
      .strict()
  ])
  .meta({
    id: "DatabaseStatus",
    description: "Database readiness information returned by the health endpoint."
  });

export const healthResponseSchema = z
  .object({
    app: z.literal("solivio"),
    status: z.literal("ok"),
    database: databaseStatusSchema,
    timestamp: z.string().datetime()
  })
  .strict()
  .meta({ id: "HealthResponse" });

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        issues: z.array(z.string()).optional()
      })
      .strict()
  })
  .strict()
  .meta({
    id: "ErrorResponse",
    description: "Standard API error payload."
  });

export const apiContracts = [
  {
    method: "get",
    path: "/api/health",
    operationId: "getHealth",
    summary: "Check service health",
    tags: ["System"],
    responses: {
      200: {
        description: "The app is reachable and reports database readiness.",
        schema: healthResponseSchema
      }
    }
  },
  {
    method: "get",
    path: "/api/products",
    operationId: "listProducts",
    summary: "List product candidates",
    tags: ["Products"],
    responses: {
      200: {
        description: "Mocked product candidates available for request matching.",
        schema: productsResponseSchema
      }
    }
  },
  {
    method: "post",
    path: "/api/products/search",
    operationId: "searchProducts",
    summary: "Search products from a prompt",
    tags: ["Products"],
    requestBody: {
      description: "Prompt used for semantic product matching against embedded products.",
      required: true,
      schema: productSearchRequestSchema
    },
    responses: {
      200: {
        description: "Semantic matches from the products table with an AI summary.",
        schema: productSearchResponseSchema
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema
      },
      500: {
        description: "The server could not complete the semantic product search.",
        schema: errorResponseSchema
      }
    }
  },
  {
    method: "get",
    path: "/api/requests",
    operationId: "getDemoRequest",
    summary: "Get the demo customer request",
    tags: ["Requests"],
    responses: {
      200: {
        description: "The current mocked request and extracted requirements.",
        schema: customerRequestResponseSchema
      }
    }
  },
  {
    method: "post",
    path: "/api/requests",
    operationId: "createCustomerRequest",
    summary: "Create a draft customer request",
    tags: ["Requests"],
    requestBody: {
      description: "Raw customer request text for mocked requirement extraction.",
      required: false,
      schema: createCustomerRequestRequestSchema
    },
    responses: {
      201: {
        description: "A mocked request object with extracted requirements.",
        schema: customerRequestResponseSchema
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema
      }
    }
  },
  {
    method: "get",
    path: "/api/offers",
    operationId: "getDemoOffer",
    summary: "Get the demo draft offer",
    tags: ["Offers"],
    responses: {
      200: {
        description: "The current mocked draft offer.",
        schema: offerResponseSchema
      }
    }
  },
  {
    method: "post",
    path: "/api/offers",
    operationId: "generateOffer",
    summary: "Generate a draft offer",
    description: "Future boundary for AI-assisted offer generation.",
    tags: ["Offers"],
    requestBody: {
      description: "Customer name and request text for the new offer.",
      required: false,
      schema: createOfferRequestSchema
    },
    responses: {
      201: {
        description: "A newly timestamped mocked offer.",
        schema: offerResponseSchema
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema
      }
    }
  }
] as const satisfies readonly ApiContract[];
