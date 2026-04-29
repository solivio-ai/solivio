import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponseSchema } from "@/server/api/contracts";
import { ALL_SEARCHABLE_FIELDS, type SearchableField } from "@/features/product-search/searchableFields";
import { searchProductsByText } from "@/server/products/productTextSearchService";
import { requireAuth } from "@/server/auth/session";

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
        manufacturer: z.string(),
      })
    ),
    totalCount: z.number().int().nonnegative(),
  })
  .strict();

export async function POST(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponseSchema.parse({
          error: { code: "invalid_request", message: "Body must include a non-empty query." },
        }),
        { status: 400 }
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
      { status: 500 }
    );
  }
}
