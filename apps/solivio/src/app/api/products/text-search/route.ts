import { NextResponse } from "next/server";

import type { SearchableField } from "@/features/product-search/searchableFields";
import { requireAuth } from "@/server/auth/session";
import { searchProductsByText } from "@/server/products/productTextSearchService";

import {
  errorResponseSchema,
  productTextSearchRequestSchema,
  productTextSearchResponseSchema,
} from "./openapi";

export const runtime = "nodejs";

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
