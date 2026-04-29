import { NextResponse } from "next/server";

import {
  errorResponseSchema,
  offerResponseSchema,
  updateOfferLineItemRequestSchema
} from "@/server/api/contracts";
import { requireAuthWithUser } from "@/server/auth/session";
import {
  removeOfferLineItem,
  toOfferDomain,
  updateOfferLineItem
} from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string; productId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAuthWithUser();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { offerId, productId } = await context.params;
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

  const offer = await updateOfferLineItem(productId, offerId, parsed.data.quantity, userId);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "not_found", message: "Offer or product was not found." }
      }),
      { status: 404 }
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer: toOfferDomain(offer) }));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAuthWithUser();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { offerId, productId } = await context.params;
  const removed = await removeOfferLineItem(productId, offerId, userId);

  if (!removed) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "not_found", message: "Offer or product was not found." }
      }),
      { status: 404 }
    );
  }

  return new Response(null, { status: 204 });
}
