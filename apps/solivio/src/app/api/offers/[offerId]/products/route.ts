import { NextResponse } from "next/server";

import { errorResponseSchema } from "@/server/api/schemas/common";
import { addOfferProductRequestSchema, offerResponseSchema } from "@/server/api/schemas/offer";
import { requireAuth } from "@/server/auth/session";
import { addProductToOffer } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string }>;
};

/**
 * Add a product to an offer
 * @operationId addOfferProduct
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @bodyDescription Product and quantity to add as an offer line.
 * @body addOfferProductRequestSchema
 * @response 201:offerResponseSchema:The offer after adding the line item.
 * @add 400:ErrorResponse:The request body was invalid.
 * @add 403:ErrorResponse:The offer is locked.
 * @add 404:ErrorResponse:The offer was not found.
 * @add 409:ErrorResponse:The product is already in the offer.
 * @openapi
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const parsed = addOfferProductRequestSchema.safeParse(await request.json().catch(() => ({})));

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

  const { productId, quantity, requestItem } = parsed.data;
  const offer = await addProductToOffer(
    offerId,
    productId,
    quantity,
    requestItem,
    auth.session.user.id,
  );

  if (offer === null) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_not_found",
          message: `Offer '${offerId}' was not found.`,
        },
      }),
      { status: 404 },
    );
  }

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

  if (offer === "duplicate") {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "duplicate_product",
          message:
            "This product is already in the offer. Use the update endpoint to change its quantity.",
        },
      }),
      { status: 409 },
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer }), {
    status: 201,
  });
}
