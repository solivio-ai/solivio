import { z } from "zod";

// ── Product entity ─────────────────────────────────────────────────────────────

export const productPriceSchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    currency: z.string(),
    net: z.number().nonnegative(),
    gross: z.number().nonnegative(),
    vatRate: z.number().nonnegative(),
    source: z.string(),
  })
  .meta({
    id: "ProductPrice",
    description: "A price quote for a product in a specific currency.",
  });

export const productSchema = z
  .object({
    id: z.string().meta({ examples: ["solar-panel-430"] }),
    sku: z.string(),
    name: z.string().meta({ examples: ["Solar Panel 430 W"] }),
    description: z.string(),
    source: z.string(),
    prices: z.array(productPriceSchema),
  })
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

// ── Semantic search ────────────────────────────────────────────────────────────

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

// ── Keyword (text) search ──────────────────────────────────────────────────────

export const productTextSearchFieldSchema = z
  .enum(["sku", "name", "description"])
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

// ── Embedding models ───────────────────────────────────────────────────────────

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

// ── Import ─────────────────────────────────────────────────────────────────────

export const productImportRowSchema = z
  .object({
    sku: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
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
