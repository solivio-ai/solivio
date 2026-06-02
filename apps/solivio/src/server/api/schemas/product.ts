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

// ── Import ─────────────────────────────────────────────────────────────────────

export const productImportRequestSchema = z
  .object({
    content: z.string().min(1),
  })
  .strict()
  .meta({
    id: "ProductImportRequest",
    description: "CSV file contents for product import.",
  });

export const productImportRowErrorSchema = z
  .object({
    index: z.number().int().nonnegative().optional(),
    sku: z.string().optional(),
    message: z.string(),
  })
  .strict()
  .meta({ id: "ProductImportRowError" });

export const productImportResponseSchema = z
  .object({
    count: z.number().int().nonnegative(),
    errors: z.array(productImportRowErrorSchema),
  })
  .strict()
  .meta({ id: "ProductImportResponse" });

export const productImportErrorResponseSchema = z
  .object({
    error: z.string(),
    errors: z.array(productImportRowErrorSchema).optional(),
  })
  .strict()
  .meta({ id: "ProductImportErrorResponse" });
