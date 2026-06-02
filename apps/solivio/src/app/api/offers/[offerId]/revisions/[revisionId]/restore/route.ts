import { NextResponse } from "next/server";

import { errorResponseSchema, restoreOfferRevisionResponseSchema } from "@/server/api/schemas";
import { requireAuth } from "@/server/auth/session";
import { restoreRevision } from "@/server/offers/offerRevisionService";
import { getOffer } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ offerId: string; revisionId: string }> };

/**
 * Restore an offer revision
 * @operationId restoreOfferRevision
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerRevisionPathParamsSchema
 * @response 200:restoreOfferRevisionResponseSchema:The restored offer and the revision created by the restore action.
 * @add 404:ErrorResponse:The revision was not found.
 * @openapi
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId, revisionId } = await context.params;
  const revision = await restoreRevision(offerId, revisionId, auth.session.user.id);

  if (!revision) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "revision_not_found", message: `Revision '${revisionId}' was not found.` },
      }),
      { status: 404 },
    );
  }

  const offer = await getOffer(offerId);

  return NextResponse.json(restoreOfferRevisionResponseSchema.parse({ offer, revision }));
}
