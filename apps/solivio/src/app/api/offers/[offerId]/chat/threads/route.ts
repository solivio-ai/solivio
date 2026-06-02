import { NextResponse } from "next/server";

import { errorResponseSchema } from "@/server/api/schemas/common";
import {
  createOfferChatThreadRequestSchema,
  offerChatThreadResponseSchema,
  offerChatThreadsResponseSchema,
} from "@/server/api/schemas/offer-chat";
import { requireAuth } from "@/server/auth/session";
import { createOfferChatThread, listOfferChatThreads } from "@/server/offer-chat/offerChatService";
import { getOffer } from "@/server/offers/offerService";

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

/**
 * List offer chat threads
 * @operationId listOfferChatThreads
 * @tag Chat
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @response 200:offerChatThreadsResponseSchema:Chat threads attached to the offer.
 * @add 404:ErrorResponse:The offer was not found.
 * @openapi
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const missingOffer = await requireOffer(offerId);
  if (missingOffer) return missingOffer;

  const threads = await listOfferChatThreads(offerId);
  return NextResponse.json(offerChatThreadsResponseSchema.parse({ threads }));
}

/**
 * Create an offer chat thread
 * @operationId createOfferChatThread
 * @tag Chat
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @bodyDescription Optional chat thread title.
 * @body createOfferChatThreadRequestSchema
 * @response 201:offerChatThreadResponseSchema:The created chat thread.
 * @add 400:ErrorResponse:The request body was invalid.
 * @add 404:ErrorResponse:The offer was not found.
 * @openapi
 */
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
