import { NextResponse } from "next/server";

import {
  errorResponseSchema,
  offerResponseSchema,
  updateOfferLineItemRequestSchema
} from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import {
  removeOfferLineItem,
  toOfferDomain,
  updateOfferLineItem
} from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string; offerProductId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId, offerProductId } = await context.params;
  const parsed = updateOfferLineItemRequestSchema.safeParse(
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

  const offer = await updateOfferLineItem(offerProductId, offerId, parsed.data.quantity);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "not_found",
          message: "Offer or line item was not found."
        }
      }),
      { status: 404 }
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer: toOfferDomain(offer) }));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId, offerProductId } = await context.params;
  const removed = await removeOfferLineItem(offerProductId, offerId);

  if (!removed) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "not_found",
          message: "Offer or line item was not found."
        }
      }),
      { status: 404 }
    );
  }

  return new Response(null, { status: 204 });
}
