import { NextResponse } from "next/server";

import { errorResponseSchema } from "@/server/api/schemas/common";
import { offerResponseSchema, updateOfferLineItemRequestSchema } from "@/server/api/schemas/offer";
import { requireAuth } from "@/server/auth/session";
import { removeOfferLineItem, updateOfferLineItem } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string; offerProductId: string }>;
};

/**
 * Update an offer line item
 * @operationId updateOfferProduct
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerProductPathParamsSchema
 * @bodyDescription New quantity for the offer line item.
 * @body updateOfferLineItemRequestSchema
 * @response 200:offerResponseSchema:The offer after updating the line item.
 * @add 400:ErrorResponse:The request body was invalid.
 * @add 403:ErrorResponse:The offer is locked.
 * @add 404:ErrorResponse:The offer or line item was not found.
 * @openapi
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId, offerProductId } = await context.params;
  const parsed = updateOfferLineItemRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Request body is invalid.",
          issues: parsed.error.issues.map((i) => i.message),
        },
      }),
      { status: 400 },
    );
  }

  const offer = await updateOfferLineItem(
    offerProductId,
    offerId,
    parsed.data.quantity,
    auth.session.user.id,
  );

  if (offer === "locked") {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_locked",
          message: "This offer has been accepted and cannot be modified.",
        },
      }),
      { status: 403 },
    );
  }

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "not_found",
          message: "Offer or line item was not found.",
        },
      }),
      { status: 404 },
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer }));
}

/**
 * Remove an offer line item
 * @operationId deleteOfferProduct
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerProductPathParamsSchema
 * @response 204
 * @responseDescription The line item was removed.
 * @add 403:ErrorResponse:The offer is locked.
 * @add 404:ErrorResponse:The offer or line item was not found.
 * @openapi
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId, offerProductId } = await context.params;
  const removed = await removeOfferLineItem(offerProductId, offerId, auth.session.user.id);

  if (removed === "locked") {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_locked",
          message: "This offer has been accepted and cannot be modified.",
        },
      }),
      { status: 403 },
    );
  }

  if (!removed) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "not_found",
          message: "Offer or line item was not found.",
        },
      }),
      { status: 404 },
    );
  }

  return new Response(null, { status: 204 });
}
