import { NextResponse } from "next/server";

import {
  errorResponseSchema,
  productSearchRequestSchema,
  productSearchResponseSchema
} from "@/server/api/contracts";
import { searchProductsWithVoltAgent } from "@/server/agents/productSearchAgent";
import { requireAuth } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = productSearchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponseSchema.parse({
          error: {
            code: "invalid_request",
            message: "Request body must include a non-empty prompt.",
            issues: parsed.error.issues.map((issue) => issue.message)
          }
        }),
        { status: 400 }
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
          message
        }
      }),
      { status: 500 }
    );
  }
}
