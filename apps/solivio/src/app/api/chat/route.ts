import { after } from "next/server";
import { NextResponse } from "next/server";
import type { Offer } from "@solivio/domain";

import { setWaitUntil } from "@voltagent/core";

import { errorResponseSchema, offerSchema } from "@/server/api/contracts";
import { chatAgent } from "@/server/agents/chatAgent";
import { requireAuth } from "@/server/auth/session";

export const runtime = "nodejs";

function formatOfferContext(offer: Offer) {
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
    "Products:"
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
          `   Product ID: ${item.productId}`,
          `   SKU: ${product?.sku ?? itemSnapshot.productSku ?? "not provided"}`,
          `   Manufacturer: ${product?.manufacturer ?? "not provided"}`,
          `   Description: ${product?.description ?? "not provided"}`,
          `   Quantity: ${item.quantity}`,
          `   Unit price net: ${price}`,
          `   Confidence: ${item.confidence ?? product?.matchScore ?? "not provided"}`,
          `   Rationale: ${item.rationale}`
        ].join("\n")
      );
    });
  }

  lines.push("", "Offer notes:");
  if (offer.notes.length === 0) {
    lines.push("- No notes.");
  } else {
    offer.notes.forEach((note) => lines.push(`- ${note}`));
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const { messages } = body;
  const parsedOffer = body.offer === undefined ? null : offerSchema.safeParse(body.offer);

  if (parsedOffer && !parsedOffer.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_offer_context",
          message: "Offer context must match the offer contract.",
          issues: parsedOffer.error.issues.map((issue) => issue.message)
        }
      }),
      { status: 400 }
    );
  }

  const offer = parsedOffer?.success ? parsedOffer.data : null;
  const offerContext = offer ? formatOfferContext(offer as Offer) : null;
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
                "Do not claim that you changed the offer; only suggest edits for now.",
                "",
                offerContext
              ].join("\n")
            }
          ]
        },
        ...messages
      ]
    : messages;

  setWaitUntil(after);

  const result = await chatAgent.streamText(messagesWithContext, {
    context: offerContext ? { currentOffer: offerContext } : undefined
  });

  return result.toUIMessageStreamResponse();
}
