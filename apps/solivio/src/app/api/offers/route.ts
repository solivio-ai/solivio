import { NextResponse } from "next/server";

import { demoOffer } from "@solivio/domain";
import { generateOfferWithAgent } from "@/server/agents/offerGenerationAgent";
import { generateOfferName } from "@/server/agents/offerNameAgent";
import { createOfferRequestSchema, offerResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { saveOfferDraft } from "@/server/offers/offerDraftStore";
import { createOffer, toOfferDomain } from "@/server/offers/offerService";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  return NextResponse.json(offerResponseSchema.parse({ offer: demoOffer }));
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = createOfferRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "clientRequest is required" } },
      { status: 400 },
    );
  }

  const { customerName, clientRequest } = parsed.data;
  try {
    const [generated, offerName] = await Promise.all([
      generateOfferWithAgent(clientRequest, customerName),
      generateOfferName(clientRequest, customerName),
    ]);
    const offer = await createOffer(
      customerName,
      clientRequest,
      generated,
      auth.session.user.id,
      offerName,
    );

    saveOfferDraft(toOfferDomain(offer));

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    console.error("[api/offers POST] generation failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: { code: "OFFER_GENERATION_FAILED", message, stack } },
      { status: 500 },
    );
  }
}
