import { NextResponse } from "next/server";

import { errorResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { getOfferChatMessages, getOfferChatThread } from "@/server/offer-chat/offerChatService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
    threadId: string;
  }>;
};

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
  return NextResponse.json({ messages });
}
