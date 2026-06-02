import { NextResponse } from "next/server";
import { z } from "zod";

import { searchProductsWithVoltAgent } from "@/server/agents/productSearchAgent";
import { errorResponseSchema } from "@/server/api/schemas/common";
import { requireAuth } from "@/server/auth/session";

export const runtime = "nodejs";

const productSearchRequestSchema = z
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

const productSearchMatchSchema = z
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

const productSearchResponseSchema = z
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

/**
 * Search products from a prompt
 * @operationId searchProducts
 * @tag Products
 * @auth sessionCookie
 * @bodyDescription Prompt used for semantic product matching against embedded products.
 * @body productSearchRequestSchema
 * @response 200:productSearchResponseSchema:Semantic matches from the products table with an AI summary.
 * @add 400:ErrorResponse:The product search request was invalid.
 * @add 500:ErrorResponse:The product search failed.
 * @openapi
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = productSearchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponseSchema.parse({
          error: {
            code: "invalid_request",
            message: "Request body must include a non-empty prompt.",
            issues: parsed.error.issues.map((issue) => issue.message),
          },
        }),
        { status: 400 },
      );
    }

    const result = await searchProductsWithVoltAgent(parsed.data.prompt, parsed.data.limit);
    return NextResponse.json(productSearchResponseSchema.parse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "product_search_failed",
          message,
        },
      }),
      { status: 500 },
    );
  }
}
