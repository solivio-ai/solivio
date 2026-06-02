import { z } from "zod";

import { ALL_SEARCHABLE_FIELDS } from "@/features/product-search/searchableFields";
import { defineRouteOpenApi } from "@/server/api/openapi";
import { errorResponseSchema } from "@/server/api/schemas";

export { errorResponseSchema };

export const productTextSearchFieldSchema = z
  .enum(ALL_SEARCHABLE_FIELDS)
  .meta({ id: "ProductTextSearchField" });

export const productTextSearchRequestSchema = z
  .object({
    limit: z.number().int().positive().max(20).optional(),
    offset: z.number().int().min(0).optional(),
    query: z.string().trim().min(1),
    searchFields: z.array(productTextSearchFieldSchema).min(1).optional(),
  })
  .strict()
  .meta({
    id: "ProductTextSearchRequest",
    description: "Keyword product search request.",
  });

export const productTextSearchResponseSchema = z
  .object({
    products: z.array(
      z
        .object({
          description: z.string(),
          id: z.string(),
          name: z.string(),
          sku: z.string(),
        })
        .strict(),
    ),
    totalCount: z.number().int().nonnegative(),
  })
  .strict()
  .meta({ id: "ProductTextSearchResponse" });

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "searchProductsByText",
    summary: "Search products by keyword",
    tags: ["Products"],
    requiresAuth: true,
    requestBody: {
      description: "Keyword search query, pagination, and optional searchable fields.",
      required: true,
      schema: productTextSearchRequestSchema,
    },
    responses: {
      200: {
        description: "Matching products and total result count.",
        schema: productTextSearchResponseSchema,
      },
      400: "The request body did not include a valid query.",
      500: "The server could not complete the text search.",
    },
  },
});
