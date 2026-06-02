import { NextResponse } from "next/server";

import { errorResponseSchema } from "@/server/api/schemas/common";
import {
  offerRevisionResponseSchema,
  offerRevisionsResponseSchema,
} from "@/server/api/schemas/offer-revision";
import { requireAuth } from "@/server/auth/session";
import { listRevisions, saveRevision } from "@/server/offers/offerRevisionService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ offerId: string }> };

/**
 * Save an offer revision
 * @operationId saveOfferRevision
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @response 201:offerRevisionResponseSchema:The saved offer revision.
 * @add 404:ErrorResponse:The offer was not found.
 * @openapi
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const revision = await saveRevision(offerId, auth.session.user.id);

  if (!revision) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "offer_not_found", message: `Offer '${offerId}' was not found.` },
      }),
      { status: 404 },
    );
  }

  return NextResponse.json(offerRevisionResponseSchema.parse({ revision }), { status: 201 });
}

/**
 * List offer revisions
 * @operationId listOfferRevisions
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @response 200:offerRevisionsResponseSchema:Revision history for the offer.
 * @openapi
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const revisions = await listRevisions(offerId);

  return NextResponse.json(offerRevisionsResponseSchema.parse({ revisions }));
}
