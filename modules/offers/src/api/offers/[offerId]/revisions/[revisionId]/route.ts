import { NextResponse } from "next/server";

import { getAuth } from "@solivio/sdk/runtime";

import { getRevision } from "../../../../../server/offerRevisionService.ts";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ offerId: string; revisionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const { offerId, revisionId } = await context.params;
  const revision = await getRevision(offerId, revisionId);

  if (!revision) {
    return NextResponse.json(
      { error: { code: "revision_not_found", message: `Revision '${revisionId}' was not found.` } },
      { status: 404 },
    );
  }

  return NextResponse.json({ revision });
}
