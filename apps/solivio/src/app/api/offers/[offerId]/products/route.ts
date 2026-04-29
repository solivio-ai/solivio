import { NextResponse } from "next/server";

import {
  addOfferProductRequestSchema,
  errorResponseSchema,
  offerResponseSchema
} from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { addProductToOffer, toOfferDomain } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const parsed = addOfferProductRequestSchema.safeParse(
    await request.json().catch(() => ({}))
  );

  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Request body is invalid.",
          issues: parsed.error.issues.map((i) => i.message)
        }
      }),
      { status: 400 }
    );
  }

  const { productId, quantity, requestItem } = parsed.data;
  const offer = await addProductToOffer(offerId, productId, quantity, requestItem);

  if (offer === null) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_not_found",
          message: `Offer '${offerId}' was not found.`
        }
      }),
      { status: 404 }
    );
  }

  if (offer === "duplicate") {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "duplicate_product",
          message: "This product is already in the offer. Use the update endpoint to change its quantity."
        }
      }),
      { status: 409 }
    );
  }

  return NextResponse.json(
    offerResponseSchema.parse({ offer: toOfferDomain(offer) }),
    { status: 201 }
  );
}
