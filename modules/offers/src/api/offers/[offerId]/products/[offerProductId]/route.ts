import { NextResponse } from "next/server";

import { getAuth } from "@solivio/sdk/runtime";

import {
  errorResponseSchema,
  offerResponseSchema,
  updateOfferLineItemRequestSchema,
} from "../../../../../contracts/index.ts";
import { removeOfferLineItem, updateOfferLineItem } from "../../../../../server/offerService.ts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string; offerProductId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
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

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
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
