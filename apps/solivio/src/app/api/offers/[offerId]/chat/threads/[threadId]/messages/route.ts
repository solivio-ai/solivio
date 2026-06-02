import { NextResponse } from "next/server";

import { errorResponseSchema, offerChatMessagesResponseSchema } from "@/server/api/schemas";
import { requireAuth } from "@/server/auth/session";
import { getOfferChatMessages, getOfferChatThread } from "@/server/offer-chat/offerChatService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
    threadId: string;
  }>;
};

/**
 * List offer chat messages
 * @operationId listOfferChatMessages
 * @tag Chat
 * @auth sessionCookie
 * @pathParams offerChatMessagesPathParamsSchema
 * @response 200:offerChatMessagesResponseSchema:Messages in the offer chat thread.
 * @add 404:ErrorResponse:The chat thread was not found.
 * @openapi
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId, threadId } = await context.params;
  const thread = await getOfferChatThread(offerId, threadId);

  if (!thread) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "chat_thread_not_found",
          message: `Chat thread '${threadId}' was not found for offer '${offerId}'.`,
        },
      }),
      { status: 404 },
    );
  }

  const messages = await getOfferChatMessages(threadId);
  return NextResponse.json(offerChatMessagesResponseSchema.parse({ messages }));
}
