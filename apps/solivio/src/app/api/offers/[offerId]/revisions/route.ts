import { NextResponse } from "next/server";

import { revisionsListResponseSchema } from "@/server/api/contracts";
import { requireAuthWithUser } from "@/server/auth/session";
import { listOfferRevisions } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthWithUser();
  if (authResult instanceof NextResponse) return authResult;

  const { offerId } = await context.params;
  const revisions = await listOfferRevisions(offerId);

  return NextResponse.json(revisionsListResponseSchema.parse({ revisions }));
}
