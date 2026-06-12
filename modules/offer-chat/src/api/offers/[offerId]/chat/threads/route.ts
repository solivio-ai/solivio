import { NextResponse } from "next/server";

import { getAuth, getService } from "@solivio/sdk/runtime";

import { errorResponseSchema } from "../../../../../contracts/index.ts";
import {
  createOfferChatThread,
  listOfferChatThreads,
} from "../../../../../server/offerChatService.ts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

async function requireOffer(offerId: string) {
  const offer = await getService("offers").getOffer(offerId);
  if (offer) return null;

  return NextResponse.json(
    errorResponseSchema.parse({
      error: {
        code: "offer_not_found",
        message: `Offer '${offerId}' was not found.`,
      },
    }),
    { status: 404 },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const missingOffer = await requireOffer(offerId);
  if (missingOffer) return missingOffer;

  const threads = await listOfferChatThreads(offerId);
  return NextResponse.json({ threads });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const missingOffer = await requireOffer(offerId);
  if (missingOffer) return missingOffer;

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : undefined;
  const thread = await createOfferChatThread(offerId, title);

  return NextResponse.json({ thread }, { status: 201 });
}
