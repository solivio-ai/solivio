import { NextResponse } from "next/server";

import { getAuth } from "@solivio/sdk/runtime";

import {
  addOfferProductRequestSchema,
  errorResponseSchema,
  offerResponseSchema,
} from "../../../../contracts/index.ts";
import { addProductToOffer } from "../../../../server/offerService.ts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
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
