import { NextResponse } from "next/server";

import { requireAuth } from "@/server/auth/session";
import { saveRevision, listRevisions } from "@/server/offers/offerRevisionService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ offerId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const revision = await saveRevision(offerId, auth.session.user.id);

  if (!revision) {
    return NextResponse.json(
      { error: { code: "offer_not_found", message: `Offer '${offerId}' was not found.` } },
      { status: 404 }
    );
  }

  return NextResponse.json({ revision }, { status: 201 });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const revisions = await listRevisions(offerId);

  return NextResponse.json({ revisions });
}
