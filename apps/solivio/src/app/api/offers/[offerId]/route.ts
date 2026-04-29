import { NextResponse } from "next/server";

import {
  errorResponseSchema,
  offerResponseSchema,
  updateOfferRequestSchema
} from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { getOffer, updateOfferReviewStatus } from "@/server/offers/offerService";
import { getOfferDraft, updateOfferDraft } from "@/server/offers/offerDraftStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;

  const offer = isUuid(offerId) ? (await getOffer(offerId)) ?? getOfferDraft(offerId) : getOfferDraft(offerId);

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

  const offer =
    isUuid(offerId) && input.data.status
      ? (await updateOfferReviewStatus(offerId, input.data.status)) ?? updateOfferDraft(offerId, input.data)
      : updateOfferDraft(offerId, input.data);

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
