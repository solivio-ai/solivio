import { NextResponse } from "next/server";

import { requireAuth } from "@/server/auth/session";
import { createOfferChatThread, listOfferChatThreads } from "@/server/offer-chat/offerChatService";
import { getOffer } from "@/server/offers/offerService";

import {
  createOfferChatThreadRequestSchema,
  errorResponseSchema,
  offerChatThreadResponseSchema,
  offerChatThreadsResponseSchema,
} from "./openapi";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

async function requireOffer(offerId: string) {
  const offer = await getOffer(offerId);
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
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const missingOffer = await requireOffer(offerId);
  if (missingOffer) return missingOffer;

  const threads = await listOfferChatThreads(offerId);
  return NextResponse.json(offerChatThreadsResponseSchema.parse({ threads }));
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const missingOffer = await requireOffer(offerId);
  if (missingOffer) return missingOffer;

  const parsed = createOfferChatThreadRequestSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Chat thread title must be a non-empty string when provided.",
          issues: parsed.error.issues.map((issue) => issue.message),
        },
      }),
      { status: 400 },
    );
  }

  const title = parsed.data.title?.trim();
  const thread = await createOfferChatThread(offerId, title);

  return NextResponse.json(offerChatThreadResponseSchema.parse({ thread }), { status: 201 });
}
