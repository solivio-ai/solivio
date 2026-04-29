import { NextResponse } from "next/server";

import {
  createOfferRequestSchema,
  errorResponseSchema,
  offerResponseSchema,
  offersListResponseSchema
} from "@/server/api/contracts";
import { requireAuthWithUser } from "@/server/auth/session";
import { generateOfferWithAgent } from "@/server/agents/offerGenerationAgent";
import { createOffer, listOffers, toOfferDomain } from "@/server/offers/offerService";

export const runtime = "nodejs";

export async function GET() {
  const authResult = await requireAuthWithUser();
  if (authResult instanceof NextResponse) return authResult;

  const offers = await listOffers();
  return NextResponse.json(offersListResponseSchema.parse({ offers }));
}

export async function POST(request: Request) {
  const authResult = await requireAuthWithUser();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const body = await request.json().catch(() => ({}));
  const parsed = createOfferRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "VALIDATION_ERROR", message: "clientRequest is required" }
      }),
      { status: 400 }
    );
  }

  const { customerName, clientRequest } = parsed.data;
  const generated = await generateOfferWithAgent(clientRequest, customerName);
  const offer = await createOffer(customerName, clientRequest, generated, userId);

  return NextResponse.json({ offer: toOfferDomain(offer) }, { status: 201 });
}
