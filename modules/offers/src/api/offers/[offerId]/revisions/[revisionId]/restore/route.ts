import { NextResponse } from "next/server";

import { getAuth } from "@solivio/sdk/runtime";

import { restoreRevision } from "../../../../../../server/offerRevisionService.ts";
import { getOffer } from "../../../../../../server/offerService.ts";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ offerId: string; revisionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const { offerId, revisionId } = await context.params;
  const revision = await restoreRevision(offerId, revisionId, auth.session.user.id);

  if (!revision) {
    return NextResponse.json(
      { error: { code: "revision_not_found", message: `Revision '${revisionId}' was not found.` } },
      { status: 404 },
    );
  }

  const offer = await getOffer(offerId);

  return NextResponse.json({ offer, revision });
}
