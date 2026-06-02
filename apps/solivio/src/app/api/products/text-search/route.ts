import { NextResponse } from "next/server";
import { z } from "zod";

import type { SearchableField } from "@/features/product-search/searchableFields";
import { errorResponseSchema } from "@/server/api/schemas/common";
import { requireAuth } from "@/server/auth/session";
import { searchProductsByText } from "@/server/products/productTextSearchService";

export const runtime = "nodejs";

const productTextSearchFieldSchema = z
  .enum(["sku", "name", "description"])
  .meta({ id: "ProductTextSearchField" });

const productTextSearchRequestSchema = z
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

const productTextSearchMatchSchema = z
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

const productTextSearchResponseSchema = z
  .object({
    products: z.array(productTextSearchMatchSchema),
    totalCount: z.number().int().nonnegative(),
  })
  .strict()
  .meta({ id: "ProductTextSearchResponse" });

/**
 * Search products by keyword
 * @operationId searchProductsByText
 * @tag Products
 * @auth sessionCookie
 * @bodyDescription Keyword search query, pagination, and optional searchable fields.
 * @body productTextSearchRequestSchema
 * @response 200:productTextSearchResponseSchema:Matching products and total result count.
 * @add 400:ErrorResponse:The product text search request was invalid.
 * @add 500:ErrorResponse:The product text search failed.
 * @openapi
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = productTextSearchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponseSchema.parse({
          error: { code: "invalid_request", message: "Body must include a non-empty query." },
        }),
        { status: 400 },
      );
    }

    const { query, limit, offset, searchFields } = parsed.data;
    const result = await searchProductsByText(query, {
      limit,
      offset,
      searchFields: searchFields as SearchableField[] | undefined,
    });
    return NextResponse.json(productTextSearchResponseSchema.parse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      errorResponseSchema.parse({ error: { code: "text_search_failed", message } }),
      { status: 500 },
    );
  }
}
