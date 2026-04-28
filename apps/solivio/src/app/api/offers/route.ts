import { demoOffer } from "@solivio/domain";
import { NextResponse } from "next/server";

import { createOfferRequestSchema, offerResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { generateOfferWithAgent } from "@/server/agents/offerGenerationAgent";
import { createOffer, toOfferDomain } from "@/server/offers/offerService";
import { saveOfferDraft } from "@/server/offers/offerDraftStore";

export const runtime = "nodejs";

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  return NextResponse.json(offerResponseSchema.parse({ offer: demoOffer }));
}

export async function POST(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const parsed = createOfferRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "clientRequest is required" } },
      { status: 400 }
    );
  }

  const { customerName, clientRequest } = parsed.data;
  const generated = await generateOfferWithAgent(clientRequest, customerName);
  const offer = await createOffer(customerName, clientRequest, generated);

  saveOfferDraft(toOfferDomain(offer));

  return NextResponse.json({ offer }, { status: 201 });
}
