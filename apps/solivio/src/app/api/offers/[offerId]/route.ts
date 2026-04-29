import { demoOffer } from "@solivio/domain";
import { NextResponse } from "next/server";

import {
  errorResponseSchema,
  offerResponseSchema,
  updateOfferRequestSchema
} from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { getOffer } from "@/server/offers/offerService";
import { updateOfferDraft } from "@/server/offers/offerDraftStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;

  const offer =
    offerId === demoOffer.id
      ? demoOffer
      : await getOffer(offerId);

  if (!offer) {
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

  return NextResponse.json(offerResponseSchema.parse({ offer }));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const input = updateOfferRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!input.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Request body must match the offer update contract.",
          issues: input.error.issues.map((issue) => issue.message)
        }
      }),
      { status: 400 }
    );
  }

  const offer = updateOfferDraft(offerId, input.data);

  if (!offer) {
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

  return NextResponse.json(offerResponseSchema.parse({ offer }));
}
