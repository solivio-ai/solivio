import { NextResponse } from "next/server";

import { errorResponseSchema, offerResponseSchema } from "@/server/api/contracts";
import { requireAuthWithUser } from "@/server/auth/session";
import { restoreRevision, toOfferDomain } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string; revisionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const authResult = await requireAuthWithUser();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { offerId, revisionId } = await context.params;
  const offer = await restoreRevision(offerId, revisionId, userId);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "not_found", message: "Offer or revision was not found." }
      }),
      { status: 404 }
    );
  }

  return NextResponse.json(
    offerResponseSchema.parse({ offer: toOfferDomain(offer) }),
    { status: 201 }
  );
}
