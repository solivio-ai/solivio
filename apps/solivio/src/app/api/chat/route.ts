import { setWaitUntil } from "@voltagent/core";
import type { UIMessage } from "ai";
import { after, NextResponse } from "next/server";

import type { Offer } from "@solivio/domain";
import { chatAgent } from "@/server/agents/chatAgent";
import { errorResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { appendOfferChatMessage, getOfferChatThread } from "@/server/offer-chat/offerChatService";
import { getOfferDraft } from "@/server/offers/offerDraftStore";
import { getOffer } from "@/server/offers/offerService";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getLatestUserMessage(messages: UIMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      return messages[index];
    }
  }

  return null;
}

function formatOfferContext(offer: Offer) {
  const discountPercent = offer.discountPercent;
  const currency = offer.items[0]?.currency ?? offer.items[0]?.product?.currency ?? "PLN";
  const subtotal = offer.items.reduce((sum, item) => {
    const unitPrice = item.unitPriceNet ?? item.product?.priceNet ?? 0;
    return sum + item.quantity * unitPrice;
  }, 0);
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal - discount;
  const limitedLineCount = offer.items.filter(
    (item) => item.product?.availability === "limited",
  ).length;
  const unpricedLineCount = offer.items.filter(
    (item) => (item.unitPriceNet ?? item.product?.priceNet ?? 0) <= 0,
  ).length;
  const lines = [
    "Current offer context:",
    `Offer ID: ${offer.id}`,
    `Status: ${offer.status}`,
    `Customer: ${offer.customerName ?? "Unknown"}`,
    `Generated at: ${offer.generatedAt}`,
    "",
    "Original client message:",
    offer.clientRequest?.trim() || "No original client message is attached.",
    "",
    "Commercial summary:",
    `Subtotal: ${subtotal} ${currency}`,
    `Discount: ${discountPercent}% (${discount} ${currency})`,
    `Total net: ${total} ${currency}`,
    `Pricing check: ${unpricedLineCount === 0 ? "all lines have prices" : `${unpricedLineCount} line(s) need a unit price`}`,
    `Availability check: ${limitedLineCount === 0 ? "availability confirmed" : `${limitedLineCount} line(s) need availability confirmation`}`,
    `Sales review check: ${offer.status !== "draft" ? "marked complete" : "not marked complete"}`,
    "",
    "Products:",
  ];

  if (offer.items.length === 0) {
    lines.push("- No products are included in this offer.");
  } else {
    offer.items.forEach((item, index) => {
      const itemSnapshot = item as Offer["items"][number] & {
        productName?: string;
        productSku?: string;
      };
      const product = item.product;
      const price =
        item.unitPriceNet !== undefined
          ? `${item.unitPriceNet} ${item.currency ?? product?.currency ?? ""}`.trim()
          : product?.priceNet !== undefined
            ? `${product.priceNet} ${product.currency ?? ""}`.trim()
            : "not provided";

      lines.push(
        [
          `${index + 1}. ${product?.name ?? itemSnapshot.productName ?? item.productId}`,
          `   Line item ID: ${item.offerProductId ?? "not available"}`,
          `   Product ID: ${item.productId}`,
          `   SKU: ${product?.sku ?? itemSnapshot.productSku ?? "not provided"}`,
          `   Manufacturer: ${product?.manufacturer ?? "not provided"}`,
          `   Description: ${product?.description ?? "not provided"}`,
          `   Quantity: ${item.quantity}`,
          `   Unit price net: ${price}`,
          `   Confidence: ${item.confidence ?? product?.matchScore ?? "not provided"}`,
          `   Rationale: ${item.rationale}`,
        ].join("\n"),
      );
    });
  }

  lines.push("", "Offer notes:");
  if (offer.notes.length === 0) {
    lines.push("- No notes.");
  } else {
    for (const note of offer.notes) {
      lines.push(`- ${note}`);
    }
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const body = await request.json();
  const messages = body.messages as UIMessage[];
  const offerId = typeof body.offerId === "string" ? body.offerId : null;
  const threadId = typeof body.threadId === "string" ? body.threadId : null;
  const shouldPersist = Boolean(offerId && threadId);

  if ((offerId && !threadId) || (!offerId && threadId)) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_chat_thread",
          message: "Both offerId and threadId are required for persistent offer chat.",
        },
      }),
      { status: 400 },
    );
  }

  if (shouldPersist) {
    const thread = await getOfferChatThread(offerId!, threadId!);
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

    const latestUserMessage = getLatestUserMessage(messages);
    if (latestUserMessage) {
      await appendOfferChatMessage(threadId!, latestUserMessage);
    }
  }

  const serverOffer: Offer | null = offerId
    ? isUuid(offerId)
      ? ((await getOffer(offerId)) ?? getOfferDraft(offerId))
      : getOfferDraft(offerId)
    : null;
  const offerContext = serverOffer ? formatOfferContext(serverOffer) : null;
  const messagesWithContext = offerContext
    ? [
        {
          id: "current-offer-context",
          role: "system" as const,
          parts: [
            {
              type: "text" as const,
              text: [
                "Use this offer context to answer the user's questions.",
                "When the user requests a change to the offer, use the available tools to apply it directly.",
                "",
                offerContext,
              ].join("\n"),
            },
          ],
        },
        ...messages,
      ]
    : messages;

  setWaitUntil(after);

  const result = await chatAgent.streamText(messagesWithContext, {
    context: offerContext ? { currentOffer: offerContext } : undefined,
    onFinish: async ({ text }) => {
      if (!shouldPersist || !text.trim()) return;

      await appendOfferChatMessage(threadId!, {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text }],
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
