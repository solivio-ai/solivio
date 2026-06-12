import { NextResponse } from "next/server";

import { getAuth } from "@solivio/sdk/runtime";

import { validateOfferWithAgent } from "../../../../ai/agents/offerValidationAgent.ts";
import { getOffer } from "../../../../server/offerService.ts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const offer = await getOffer(offerId);

  if (!offer) {
    return NextResponse.json(
      { error: { code: "offer_not_found", message: `Offer '${offerId}' was not found.` } },
      { status: 404 },
    );
  }

  if (!offer.clientRequest) {
    return NextResponse.json(
      {
        error: {
          code: "no_request",
          message: "This offer has no customer request to validate against.",
        },
      },
      { status: 422 },
    );
  }

  const items = offer.items.map((item) => ({
    name: item.name || item.productId || "Item",
    sku: item.product?.sku,
    quantity: item.quantity,
  }));

  const result = await validateOfferWithAgent(offer.clientRequest, items, offer.unmatched ?? []);

  return NextResponse.json({ validation: result });
}
