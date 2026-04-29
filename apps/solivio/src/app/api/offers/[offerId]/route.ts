import { NextResponse } from "next/server";

import {
  errorResponseSchema,
  offerResponseSchema,
  updateOfferRequestSchema
} from "@/server/api/contracts";
import { requireAuthWithUser } from "@/server/auth/session";
import { getOffer, toOfferDomain, updateOfferStatus } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthWithUser();
  if (authResult instanceof NextResponse) return authResult;

  const { offerId } = await context.params;
  const offer = await getOffer(offerId);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "offer_not_found", message: `Offer '${offerId}' was not found.` }
      }),
      { status: 404 }
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer }));
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAuthWithUser();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { offerId } = await context.params;
  const input = updateOfferRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!input.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Request body must match the offer update contract.",
          issues: input.error.issues.map((i) => i.message)
        }
      }),
      { status: 400 }
    );
  }

  if (!input.data.status) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "invalid_request", message: "status is required." }
      }),
      { status: 400 }
    );
  }

  const offer = await updateOfferStatus(offerId, input.data.status, userId);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "offer_not_found", message: `Offer '${offerId}' was not found.` }
      }),
      { status: 404 }
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer: toOfferDomain(offer) }));
}
