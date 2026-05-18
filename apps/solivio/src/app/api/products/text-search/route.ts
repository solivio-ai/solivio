import { NextResponse } from "next/server";
import { z } from "zod";

import type { SearchableField } from "@/features/product-search/searchableFields";
import { ALL_SEARCHABLE_FIELDS } from "@/features/product-search/searchableFields";
import { errorResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { searchProductsByText } from "@/server/products/productTextSearchService";

export const runtime = "nodejs";

const searchableFieldEnum = z.enum(ALL_SEARCHABLE_FIELDS);

const requestSchema = z
  .object({
    query: z.string().trim().min(1),
    limit: z.number().int().positive().max(20).optional(),
    offset: z.number().int().min(0).optional(),
    searchFields: z.array(searchableFieldEnum).min(1).optional(),
  })
  .strict();

const responseSchema = z
  .object({
    products: z.array(
      z.object({
        id: z.string(),
        sku: z.string(),
        name: z.string(),
        description: z.string(),
      }),
    ),
    totalCount: z.number().int().nonnegative(),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

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
    return NextResponse.json(responseSchema.parse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      errorResponseSchema.parse({ error: { code: "text_search_failed", message } }),
      { status: 500 },
    );
  }
}
