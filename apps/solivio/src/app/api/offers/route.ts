import { demoOffer } from "@solivio/domain";
import { NextResponse } from "next/server";

import { createOfferRequestSchema, offerResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { generateOfferDraft } from "@/server/offers/generateOfferDraft";
import { saveOfferDraft } from "@/server/offers/offerDraftStore";

export const runtime = "nodejs";

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  return NextResponse.json(offerResponseSchema.parse({
    offer: demoOffer
  }));
}

export async function POST(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = createOfferRequestSchema.safeParse(await request.json().catch(() => ({})));
  const input = body.success ? body.data : {};
  const offer = saveOfferDraft(await generateOfferDraft(input));

  return NextResponse.json(
    offerResponseSchema.parse({
      offer
    }),
    { status: 201 }
  );
}
